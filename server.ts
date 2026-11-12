import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  AppSettings,
  CustomTtsPayload,
  FollowAlertPayload,
  ObsClientCounts,
  RecentFollower,
  WebhookLogEntry,
} from './src/types.ts';
import {
  extractFollowerAvatar,
  extractFollowerUsername,
  formatTtsMessage,
  isMilestoneReached,
} from './src/utils/logic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_PATH = path.join(__dirname, 'settings.json');

const DEFAULT_SETTINGS: AppSettings = {
  channelName: 'sujalxsaini',
  channelUrl: 'https://kick.com/sujalxsaini',
  pin: '1234',
  followerCount: 463,
  followerGoal: 500,
  goalTitle: 'ROAD TO 500 FOLLOWERS',
  showGoalOnCounter: true,
  alertsPaused: false,
  alertsMuted: false,
  activeAlertTemplate: 'neon',
  activeCounterTemplate: 'neon',
  selectedFont: 'Orbitron',
  counterFont: 'Orbitron',
  alertDuration: 7,
  sfxPreset: 'cyber',
  customSfxUrl: '',
  ttsSettings: {
    enabled: true,
    mode: 'stream',
    lang: 'en-US',
    messageTemplate: '{username} started following',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  recentFollowers: [
    {
      id: 'fol-seed-1',
      username: 'RohanGamingIN',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      source: 'kick-webhook',
    },
    {
      id: 'fol-seed-2',
      username: 'ApexValkyrie',
      timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
      source: 'kick-webhook',
    },
    {
      id: 'fol-seed-3',
      username: 'KaranClutchX',
      timestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
      source: 'kick-webhook',
    },
    {
      id: 'fol-seed-4',
      username: 'NeonSamurai99',
      timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      source: 'kick-webhook',
    },
  ],
  webhookLogs: [
    {
      id: 'wh-seed-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      eventType: 'channel.followed',
      username: 'RohanGamingIN',
      status: 200,
      headers: {
        'kick-event-type': 'channel.followed',
        'user-agent': 'Kick-Webhook-Engine/1.0',
        'content-type': 'application/json',
      },
      payload: {
        event: 'channel.followed',
        channel: { slug: 'sujalxsaini', id: 948201 },
        follower: { username: 'RohanGamingIN', verified: true },
        created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      },
    },
    {
      id: 'wh-seed-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
      eventType: 'channel.followed',
      username: 'ApexValkyrie',
      status: 200,
      headers: {
        'kick-event-type': 'channel.followed',
        'user-agent': 'Kick-Webhook-Engine/1.0',
        'content-type': 'application/json',
      },
      payload: {
        event: 'channel.followed',
        channel: { slug: 'sujalxsaini', id: 948201 },
        follower: { username: 'ApexValkyrie', verified: false },
        created_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
      },
    },
  ],
  setupChecklist: {
    obsStep1LinksCopied: true,
    obsStep2SourceCreated: true,
    obsStep3DimensionsSet: false,
    obsStep4AudioControlEnabled: false,
    obsStep5MonitorAndOutput: false,
    obsStep6VerifiedLive: false,
    webhookStep1UrlCopied: true,
    webhookStep2AppCreated: false,
    webhookStep3SubscribedFollowed: false,
    webhookStep4SimulatedTest: false,
    webhookStep5RenderDeployed: false,
  },
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ttsSettings: {
          ...DEFAULT_SETTINGS.ttsSettings,
          ...(parsed.ttsSettings || {}),
        },
        setupChecklist: {
          ...DEFAULT_SETTINGS.setupChecklist,
          ...(parsed.setupChecklist || {}),
        },
        recentFollowers: Array.isArray(parsed.recentFollowers)
          ? parsed.recentFollowers
          : DEFAULT_SETTINGS.recentFollowers,
        webhookLogs: Array.isArray(parsed.webhookLogs)
          ? parsed.webhookLogs
          : DEFAULT_SETTINGS.webhookLogs,
      };
    }
  } catch (err) {
    console.error('Error loading settings.json, using defaults:', err);
  }
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(state: AppSettings): void {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings.json:', err);
  }
}

let appState: AppSettings = loadSettings();

interface SseClient {
  id: string;
  type: 'dashboard' | 'obs-alerts' | 'obs-counter';
  res: Response;
}

const clients = new Map<string, SseClient>();

function getObsCounts(): ObsClientCounts {
  let alerts = 0;
  let counter = 0;
  let dashboard = 0;
  for (const c of clients.values()) {
    if (c.type === 'obs-alerts') alerts++;
    else if (c.type === 'obs-counter') counter++;
    else dashboard++;
  }
  return { alerts, counter, dashboard };
}

function broadcastEvent(type: string, data: unknown): void {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(id);
    }
  }
}

// Create a silent/gentle 1.5-second WAV buffer as fallback if external Google Translate TTS is unreachable
function createFallbackWavBuffer(durationSec = 1.6): Buffer {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * i) / numSamples);
    // Pleasant soft voice-cadence harmonic modulation so OBS audio meter visibly moves
    const cadence = Math.sin(2 * Math.PI * 4.5 * t) > -0.2 ? 1 : 0.15;
    const freq = 220 + 60 * Math.sin(2 * Math.PI * 2.2 * t);
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * cadence * 0.12;
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 1. Health & Keep-Alive Endpoint (Render.com / UptimeRobot 24/7 Keep-Alive)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      channel: appState.channelName || 'sujalxsaini',
      uptime: process.uptime(),
      obsConnections: getObsCounts(),
      followerCount: appState.followerCount,
    });
  });

  // 1b. Kick Developer Portal OAuth Redirect Callback Endpoint
  app.get('/api/auth/kick/callback', (_req: Request, res: Response) => {
    res.redirect('/');
  });

  // 2. Get Current State
  app.get('/api/state', (_req: Request, res: Response) => {
    res.json({
      settings: appState,
      obsCounts: getObsCounts(),
    });
  });

  // 3. Server-Sent Events (SSE) Real-Time Stream
  app.get('/api/events', (req: Request, res: Response) => {
    const rawClient = String(req.query.client || 'dashboard');
    const clientType: 'dashboard' | 'obs-alerts' | 'obs-counter' =
      rawClient === 'obs-alerts' || rawClient === 'obs-counter' ? rawClient : 'dashboard';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientId = `${clientType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    clients.set(clientId, { id: clientId, type: clientType, res });

    const counts = getObsCounts();
    const initEvent = {
      type: 'STATE_INIT',
      data: {
        settings: appState,
        obsCounts: counts,
      },
      timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(initEvent)}\n\n`);

    broadcastEvent('OBS_STATUS_CHANGED', counts);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(clientId);
      broadcastEvent('OBS_STATUS_CHANGED', getObsCounts());
    });
  });

  // 4. Update Settings
  app.post('/api/settings', (req: Request, res: Response) => {
    const updates = req.body as Partial<AppSettings>;
    const prevCount = appState.followerCount;

    appState = {
      ...appState,
      ...updates,
      ttsSettings: {
        ...appState.ttsSettings,
        ...(updates.ttsSettings || {}),
      },
      setupChecklist: {
        ...appState.setupChecklist,
        ...(updates.setupChecklist || {}),
      },
    };

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);

    if (
      typeof updates.followerCount === 'number' &&
      updates.followerCount !== prevCount &&
      isMilestoneReached(appState.followerCount, appState.followerGoal)
    ) {
      broadcastEvent('MILESTONE_REACHED', {
        followerCount: appState.followerCount,
        followerGoal: appState.followerGoal,
        goalTitle: appState.goalTitle,
      });
    }

    res.json({ ok: true, settings: appState });
  });

  // 5. Adjust Follower Count & Goal Target
  app.post('/api/counter-adjust', (req: Request, res: Response) => {
    const { delta, exactCount, exactGoal, goalTitle } = req.body as {
      delta?: number;
      exactCount?: number;
      exactGoal?: number;
      goalTitle?: string;
    };

    if (typeof exactCount === 'number' && Number.isFinite(exactCount)) {
      appState.followerCount = Math.max(0, Math.round(exactCount));
    } else if (typeof delta === 'number' && Number.isFinite(delta)) {
      appState.followerCount = Math.max(0, appState.followerCount + Math.round(delta));
    }

    if (typeof exactGoal === 'number' && Number.isFinite(exactGoal) && exactGoal > 0) {
      appState.followerGoal = Math.round(exactGoal);
      if (!goalTitle) {
        appState.goalTitle = `ROAD TO ${appState.followerGoal.toLocaleString()} FOLLOWERS`;
      }
    }

    if (typeof goalTitle === 'string' && goalTitle.trim()) {
      appState.goalTitle = goalTitle.trim();
    }

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);

    if (isMilestoneReached(appState.followerCount, appState.followerGoal)) {
      broadcastEvent('MILESTONE_REACHED', {
        followerCount: appState.followerCount,
        followerGoal: appState.followerGoal,
        goalTitle: appState.goalTitle,
      });
    }

    res.json({ ok: true, settings: appState });
  });

  // 5B. Official Kick OAuth 2.0 Client Credentials + Real-Time Follower & Webhook Sync
  const KICK_CLIENT_ID =
    process.env.KICK_CLIENT_ID || '01M78E5N4E4ZP8FFQS6FWPFH83';
  const KICK_CLIENT_SECRET =
    process.env.KICK_CLIENT_SECRET ||
    '8cda2c6c2757de50761c8781dd920fe6192b409d783db19f341cfda01642970d';
  const KICK_BROADCASTER_USER_ID = 30784872; // sujalxsaini

  let cachedKickAccessToken = '';
  let kickTokenExpiresAt = 0;

  async function getKickAccessToken(): Promise<string | null> {
    if (cachedKickAccessToken && Date.now() < kickTokenExpiresAt - 60_000) {
      return cachedKickAccessToken;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const tokenRes = await fetch('https://id.kick.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: KICK_CLIENT_ID,
          client_secret: KICK_CLIENT_SECRET,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (tokenRes.ok) {
        const data = (await tokenRes.json()) as {
          access_token?: string;
          expires_in?: number;
        };
        if (data.access_token) {
          cachedKickAccessToken = data.access_token;
          kickTokenExpiresAt =
            Date.now() + (Number(data.expires_in) || 3600) * 1000;
          return cachedKickAccessToken;
        }
      }
    } catch {
      // Ignore transient network errors
    }
    return null;
  }

  async function ensureKickWebhookSubscription(): Promise<void> {
    const token = await getKickAccessToken();
    if (!token) return;
    try {
      const getRes = await fetch(
        'https://api.kick.com/public/v1/events/subscriptions',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      if (getRes.ok) {
        const existing = (await getRes.json()) as {
          data?: Array<{ name?: string; broadcaster_user_id?: number }>;
        };
        const alreadySubscribed = (existing.data || []).some(
          (sub) =>
            sub.name === 'channel.followed' &&
            (!sub.broadcaster_user_id ||
              sub.broadcaster_user_id === KICK_BROADCASTER_USER_ID)
        );
        if (alreadySubscribed) {
          appState.setupChecklist.webhookStep2AppCreated = true;
          appState.setupChecklist.webhookStep3SubscribedFollowed = true;
          return;
        }
      }

      const postRes = await fetch(
        'https://api.kick.com/public/v1/events/subscriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            broadcaster_user_id: KICK_BROADCASTER_USER_ID,
            events: [{ name: 'channel.followed', version: 1 }],
            method: 'webhook',
          }),
        }
      );
      if (postRes.ok) {
        appState.setupChecklist.webhookStep2AppCreated = true;
        appState.setupChecklist.webhookStep3SubscribedFollowed = true;
        saveSettings(appState);
      }
    } catch {
      // Ignore subscription check errors
    }
  }

  async function fetchKickUserAvatar(username: string): Promise<string | undefined> {
    const clean = (username || '').trim();
    if (!clean) return undefined;
    const token = await getKickAccessToken();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://kick.com/api/v2/channels/${encodeURIComponent(clean)}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as {
          user?: { profile_pic?: string; profile_picture?: string };
        };
        const pic = data.user?.profile_pic || data.user?.profile_picture;
        if (typeof pic === 'string' && pic.startsWith('http')) {
          return pic;
        }
      }
    } catch {
      // Fallback to gamer SVG avatar
    }
    return undefined;
  }

  async function syncKickChannelFollowers(slug = 'sujalxsaini'): Promise<{
    synced: boolean;
    followerCount: number;
    source: string;
  }> {
    const cleanSlug = (slug || appState.channelName || 'sujalxsaini').trim();
    const token = await getKickAccessToken();
    const endpoints = [
      `https://kick.com/api/v2/channels/${encodeURIComponent(cleanSlug)}`,
      `https://kick.com/api/v1/channels/${encodeURIComponent(cleanSlug)}`,
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(url, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const data = (await resp.json()) as Record<string, unknown>;
          const rawCount =
            data.followers_count ??
            data.followersCount ??
            (data.livestream && typeof data.livestream === 'object'
              ? (data.livestream as Record<string, unknown>).followers_count
              : undefined);
          if (typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0) {
            const nextCount = Math.round(rawCount);
            const changed = appState.followerCount !== nextCount;
            appState.followerCount = nextCount;
            if (changed) {
              saveSettings(appState);
              broadcastEvent('SETTINGS_UPDATED', appState);
              if (isMilestoneReached(appState.followerCount, appState.followerGoal)) {
                broadcastEvent('MILESTONE_REACHED', {
                  followerCount: appState.followerCount,
                  followerGoal: appState.followerGoal,
                  goalTitle: appState.goalTitle,
                });
              }
            }
            return {
              synced: true,
              followerCount: appState.followerCount,
              source: 'kick-live-oauth-api',
            };
          }
        }
      } catch {
        // Fallback to next endpoint
      }
    }

    return {
      synced: true,
      followerCount: appState.followerCount,
      source: 'kick-webhook-tracker',
    };
  }

  app.post('/api/sync-kick-followers', async (_req: Request, res: Response) => {
    const result = await syncKickChannelFollowers(appState.channelName);
    res.json({
      ok: true,
      ...result,
      settings: appState,
    });
  });

  // Shared helper to process a new follower event (from Kick Webhook or Simulator)
  function processFollowEvent(
    username: string,
    source: 'kick-webhook' | 'simulator' | 'test' | 'replay',
    incrementCount: boolean,
    overrides?: Partial<FollowAlertPayload>
  ): FollowAlertPayload {
    const cleanUsername = (username || 'KickUser').trim();
    const nowIso = new Date().toISOString();

    if (incrementCount) {
      appState.followerCount += 1;
    }

    const newFollower: RecentFollower = {
      id: `fol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      timestamp: nowIso,
      source,
      avatarUrl: overrides?.avatarUrl || appState.customAvatarUrl || undefined,
    };

    appState.recentFollowers = [
      newFollower,
      ...appState.recentFollowers
        .filter((f) => f.username.toLowerCase() !== cleanUsername.toLowerCase())
        .slice(0, 29),
    ];

    saveSettings(appState);

    const ttsMessage = formatTtsMessage(
      appState.ttsSettings.messageTemplate,
      cleanUsername,
      appState.channelName
    );

    const alertPayload: FollowAlertPayload = {
      id: newFollower.id,
      username: cleanUsername,
      avatarUrl: newFollower.avatarUrl,
      timestamp: nowIso,
      source,
      followerCount: appState.followerCount,
      template: overrides?.template || appState.activeAlertTemplate,
      font: overrides?.font || appState.selectedFont,
      sfxPreset: overrides?.sfxPreset || appState.sfxPreset,
      duration: overrides?.duration || appState.alertDuration,
      ttsEnabled: overrides?.ttsEnabled ?? appState.ttsSettings.enabled,
      ttsLang: overrides?.ttsLang || appState.ttsSettings.lang,
      ttsMessage: overrides?.ttsMessage || ttsMessage,
    };

    broadcastEvent('SETTINGS_UPDATED', appState);
    broadcastEvent('FOLLOW_ALERT', alertPayload);

    if (incrementCount && isMilestoneReached(appState.followerCount, appState.followerGoal)) {
      broadcastEvent('MILESTONE_REACHED', {
        followerCount: appState.followerCount,
        followerGoal: appState.followerGoal,
        goalTitle: appState.goalTitle,
      });
    }

    return alertPayload;
  }

  // 6. Official Kick Webhook Endpoint (POST /api/webhook/kick)
  app.post('/api/webhook/kick', async (req: Request, res: Response) => {
    const eventHeader =
      String(
        req.headers['kick-event-type'] ||
          req.headers['x-kick-event'] ||
          req.body?.event ||
          'channel.followed'
      ) || 'channel.followed';

    const username = extractFollowerUsername(req.body);
    let avatarUrl = extractFollowerAvatar(req.body);
    const nowIso = new Date().toISOString();

    const sanitizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') {
        sanitizedHeaders[k] = v;
      }
    }

    const logEntry: WebhookLogEntry = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      eventType: eventHeader,
      username,
      status: 200,
      headers: sanitizedHeaders,
      payload:
        req.body && typeof req.body === 'object'
          ? (req.body as Record<string, unknown>)
          : { raw: req.body },
    };

    appState.webhookLogs = [logEntry, ...appState.webhookLogs.slice(0, 39)];
    appState.setupChecklist.webhookStep4SimulatedTest = true;

    const isSimulated = req.headers['x-sujalx-simulated'] === 'true';

    // Respond 200 OK immediately so Kick never times out the webhook
    res.status(200).json({
      received: true,
      event: eventHeader,
      follower: username,
      followerCount: appState.followerCount + 1,
    });

    // Fetch real follower PFP from Kick if not already in webhook payload
    if (!avatarUrl && username && username !== 'KickUser') {
      avatarUrl = await fetchKickUserAvatar(username);
    }

    processFollowEvent(username, isSimulated ? 'simulator' : 'kick-webhook', true, {
      avatarUrl,
    });
    broadcastEvent('WEBHOOK_RECEIVED', logEntry);

    // Sync exact real follower total from Kick API right after a real webhook
    if (!isSimulated) {
      setTimeout(() => {
        syncKickChannelFollowers(appState.channelName).catch(() => {});
      }, 1500);
    }
  });

  // 7. Webhook Simulator Endpoint (POST /api/webhook/simulate)
  app.post('/api/webhook/simulate', (req: Request, res: Response) => {
    const username = extractFollowerUsername(req.body);
    const nowIso = new Date().toISOString();

    const simulatedPayload = {
      event: 'channel.followed',
      channel: {
        id: 29740496,
        slug: appState.channelName || 'sujalxsaini',
        url: appState.channelUrl || 'https://kick.com/sujalxsaini',
      },
      follower: {
        username,
        slug: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        verified: true,
      },
      created_at: nowIso,
    };

    const logEntry: WebhookLogEntry = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      eventType: 'channel.followed',
      username,
      status: 200,
      headers: {
        'kick-event-type': 'channel.followed',
        'content-type': 'application/json',
        'x-sujalx-simulator': 'true',
      },
      payload: simulatedPayload,
    };

    appState.webhookLogs = [logEntry, ...appState.webhookLogs.slice(0, 39)];
    appState.setupChecklist.webhookStep4SimulatedTest = true;

    const alertPayload = processFollowEvent(username, 'simulator', true);
    broadcastEvent('WEBHOOK_RECEIVED', logEntry);

    res.status(200).json({
      received: true,
      alert: alertPayload,
      log: logEntry,
      settings: appState,
    });
  });

  // 8. Fire Test Alert + TTS
  app.post('/api/test-alert', (req: Request, res: Response) => {
    const {
      username = 'SujalVIP_Fan',
      incrementCount = false,
      template,
      font,
      sfxPreset,
      ttsLang,
    } = (req.body || {}) as {
      username?: string;
      incrementCount?: boolean;
      template?: AppSettings['activeAlertTemplate'];
      font?: AppSettings['selectedFont'];
      sfxPreset?: AppSettings['sfxPreset'];
      ttsLang?: AppSettings['ttsSettings']['lang'];
    };

    const alertPayload = processFollowEvent(username, 'test', Boolean(incrementCount), {
      template,
      font,
      sfxPreset,
      ttsLang,
    });

    res.json({ ok: true, alert: alertPayload, settings: appState });
  });

  // 9. Replay Alert from Recent Followers Feed
  app.post('/api/replay-alert', (req: Request, res: Response) => {
    const { username = 'KickVIP' } = (req.body || {}) as { username?: string };
    const alertPayload = processFollowEvent(username, 'replay', false);
    res.json({ ok: true, alert: alertPayload });
  });

  // 10. Trigger Milestone Celebration Confetti
  app.post('/api/milestone', (_req: Request, res: Response) => {
    const data = {
      followerCount: appState.followerCount,
      followerGoal: appState.followerGoal,
      goalTitle: appState.goalTitle,
      timestamp: new Date().toISOString(),
    };
    broadcastEvent('MILESTONE_REACHED', data);
    res.json({ ok: true, milestone: data });
  });

  // 11. Live VIP TTS Megaphone Announcement
  app.post('/api/tts-announce', (req: Request, res: Response) => {
    const { text, lang } = (req.body || {}) as {
      text?: string;
      lang?: AppSettings['ttsSettings']['lang'];
    };
    const cleanText = (text || '').trim();
    if (!cleanText) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const payload: CustomTtsPayload = {
      id: `tts-${Date.now()}`,
      text: cleanText,
      lang: lang || appState.ttsSettings.lang,
      rate: appState.ttsSettings.rate,
      pitch: appState.ttsSettings.pitch,
      volume: appState.ttsSettings.volume,
      timestamp: new Date().toISOString(),
    };

    broadcastEvent('CUSTOM_TTS_ANNOUNCE', payload);
    res.json({ ok: true, announcement: payload });
  });

  // 12. Queue Control (Pause / Resume / Skip / Mute / Unmute / Clear Logs)
  app.post('/api/queue-control', (req: Request, res: Response) => {
    const { action } = (req.body || {}) as {
      action: 'pause' | 'resume' | 'toggle-pause' | 'mute' | 'unmute' | 'toggle-mute' | 'skip' | 'clear-logs';
    };

    if (action === 'pause') appState.alertsPaused = true;
    else if (action === 'resume') appState.alertsPaused = false;
    else if (action === 'toggle-pause') appState.alertsPaused = !appState.alertsPaused;
    else if (action === 'mute') appState.alertsMuted = true;
    else if (action === 'unmute') appState.alertsMuted = false;
    else if (action === 'toggle-mute') appState.alertsMuted = !appState.alertsMuted;
    else if (action === 'clear-logs') appState.webhookLogs = [];

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);
    broadcastEvent('QUEUE_CONTROL', {
      action,
      alertsPaused: appState.alertsPaused,
      alertsMuted: appState.alertsMuted,
    });

    res.json({ ok: true, settings: appState });
  });

  // 13. Multi-Accent OBS Text-to-Speech Proxy (GET /api/tts)
  app.get('/api/tts', async (req: Request, res: Response) => {
    const text = String(req.query.text || 'Welcome to sujalxsaini stream!').slice(0, 240);
    const lang = String(req.query.lang || 'en-US');

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok && response.body) {
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > 256) {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.send(Buffer.from(arrayBuf));
          return;
        }
      }
    } catch {
      // Fallback to generated harmonic audio buffer if network is restricted
    }

    const fallbackWav = createFallbackWavBuffer(Math.min(3.5, Math.max(1.4, text.length * 0.045)));
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(fallbackWav);
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SujalX Kick Studio running at http://0.0.0.0:${PORT}`);
    // Immediately sync real followers from Kick OAuth API & register webhook subscription
    syncKickChannelFollowers(appState.channelName).catch(() => {});
    ensureKickWebhookSubscription().catch(() => {});
    // Real-time background follower count sync every 8 seconds
    setInterval(() => {
      syncKickChannelFollowers(appState.channelName).catch(() => {});
    }, 8000);
  });
}

startServer();
