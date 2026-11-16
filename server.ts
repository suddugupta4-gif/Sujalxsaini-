import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  AlertEventType,
  AppSettings,
  CustomTtsPayload,
  FollowAlertPayload,
  GoalLinkHistoryItem,
  ObsClientCounts,
  RecentFollower,
  TextAlertEventFilter,
  TextAlertLinkHistoryItem,
  TextAlertStyle,
  WebhookLogEntry,
} from './src/types.ts';
import {
  DEFAULT_OBS_LAYOUT,
  PUBLIC_RENDER_ORIGIN,
  buildObsCounterUrl,
  buildObsTextAlertUrl,
  convertEmojisToSpokenText,
  extractFollowerAvatar,
  extractFollowerUsername,
  formatEventTtsText,
  isMilestoneReached,
  normalizeObsLayout,
  parseKickEventDetails,
  recordFollowedUsername,
  seedFollowedUsernamesFromRecent,
  shouldSuppressDuplicateFollowAlert,
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
  showRecentFollowerOnCounter: false,
  obsLayout: DEFAULT_OBS_LAYOUT,
  alertsPaused: false,
  alertsMuted: false,
  activeAlertTemplate: 'neon',
  activeCounterTemplate: 'neon',
  selectedFont: 'Orbitron',
  counterFont: 'Orbitron',
  textAlertFont: 'Bebas Neue',
  textAlertStyle: 'kinetic-neon',
  textAlertDuration: 6,
  textAlertSfxPreset: 'royal',
  alertDuration: 7,
  sfxPreset: 'none',
  customSfxUrl: '',
  ttsSettings: {
    enabled: true,
    mode: 'stream',
    lang: 'pro-hype-male',
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
  followedUsernamesHistory: [
    'rohangamingin',
    'apexvalkyrie',
    'karanclutchx',
    'neonsamurai99',
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
  goalLinkHistory: [],
  textAlertLinkHistory: [],
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
        showRecentFollowerOnCounter: parsed.showRecentFollowerOnCounter ?? false,
        obsLayout: normalizeObsLayout(parsed.obsLayout),
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
        followedUsernamesHistory: seedFollowedUsernamesFromRecent(
          Array.isArray(parsed.followedUsernamesHistory)
            ? parsed.followedUsernamesHistory
            : DEFAULT_SETTINGS.followedUsernamesHistory,
          Array.isArray(parsed.recentFollowers)
            ? parsed.recentFollowers
            : DEFAULT_SETTINGS.recentFollowers
        ),
        webhookLogs: Array.isArray(parsed.webhookLogs)
          ? parsed.webhookLogs
          : DEFAULT_SETTINGS.webhookLogs,
        goalLinkHistory: Array.isArray(parsed.goalLinkHistory)
          ? parsed.goalLinkHistory
          : [],
        textAlertLinkHistory: Array.isArray(parsed.textAlertLinkHistory)
          ? parsed.textAlertLinkHistory
          : [],
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

// In-memory TTS audio cache so /api/tts responds in <1ms with zero delay when an alert triggers
const ttsAudioCache = new Map<string, { buffer: Buffer; contentType: string; cachedAt: number }>();

const NEURAL_STREAMER_VOICES: Record<string, string> = {
  'pro-hype-male': 'en_us_006',
  'pro-caster-female': 'en_us_001',
  'pro-vip-narrator': 'en_male_narration',
  'pro-uk-gent': 'en_uk_001',
  'pro-emotional-female': 'en_female_emotional',
  'pro-funny-male': 'en_male_funny',
  'pro-aussie-chill': 'en_au_001',
  'en-US': 'en_us_006',
  'en-GB': 'en_uk_001',
};

function toGoogleFallbackLang(lang: string): string {
  if (lang === 'pro-uk-gent') return 'en-GB';
  if (lang === 'pro-aussie-chill') return 'en-AU';
  if (lang.startsWith('pro-')) return 'en-US';
  return lang;
}

function saveTtsCache(cacheKey: string, buffer: Buffer, contentType = 'audio/mpeg'): void {
  if (ttsAudioCache.size > 200) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) ttsAudioCache.delete(oldestKey);
  }
  ttsAudioCache.set(cacheKey, {
    buffer,
    contentType,
    cachedAt: Date.now(),
  });
}

async function fetchOrBuildTtsAudio(
  rawText: string,
  rawLang: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const spoken = convertEmojisToSpokenText(String(rawText || ''));
  const text = (spoken || String(rawText || 'Welcome to sujalxsaini stream!')).slice(0, 240);
  const lang = String(rawLang || 'pro-hype-male');
  const cacheKey = `${lang}::${text}`;
  const existing = ttsAudioCache.get(cacheKey);
  if (existing && Date.now() - existing.cachedAt < 1000 * 60 * 60) {
    return { buffer: existing.buffer, contentType: existing.contentType };
  }

  // 1. Primary Studio Neural Streamer Voice Provider (TikTok Neural TTS)
  const neuralVoiceId = NEURAL_STREAMER_VOICES[lang];
  if (neuralVoiceId) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: neuralVoiceId }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: string | null };
        if (json.success && typeof json.data === 'string' && json.data.length > 200) {
          const buf = Buffer.from(json.data, 'base64');
          if (buf.byteLength > 256) {
            saveTtsCache(cacheKey, buf, 'audio/mpeg');
            return { buffer: buf, contentType: 'audio/mpeg' };
          }
        }
      }
    } catch {
      // Fall back cleanly to Google Translate TTS below
    }
  }

  // 2. High-clarity Google GTX / TW-OB Fallback (also primary for hi-IN, en-IN, ja-JP, es-ES)
  const fallbackLang = toGoogleFallbackLang(lang);
  const googleUrls = [
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${encodeURIComponent(fallbackLang)}&client=gtx`,
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${encodeURIComponent(fallbackLang)}&client=tw-ob`,
  ];

  for (const ttsUrl of googleUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
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
          const buf = Buffer.from(arrayBuf);
          saveTtsCache(cacheKey, buf, 'audio/mpeg');
          return { buffer: buf, contentType: 'audio/mpeg' };
        }
      }
    } catch {
      // Try next fallback URL
    }
  }

  return {
    buffer: createFallbackWavBuffer(Math.min(3.5, Math.max(1.4, text.length * 0.045))),
    contentType: 'audio/wav',
  };
}

async function prewarmTtsAudio(text: string, lang: string): Promise<void> {
  try {
    await Promise.race([
      fetchOrBuildTtsAudio(text, lang),
      new Promise<void>((resolve) => setTimeout(resolve, 1200)),
    ]);
  } catch {
    // Ignore prewarm timeout
  }
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
      obsLayout: updates.obsLayout
        ? normalizeObsLayout({
            alerts: {
              ...normalizeObsLayout(appState.obsLayout).alerts,
              ...(updates.obsLayout.alerts || {}),
            },
            textAlerts: {
              ...normalizeObsLayout(appState.obsLayout).textAlerts,
              ...(updates.obsLayout.textAlerts || {}),
            },
            counter: {
              ...normalizeObsLayout(appState.obsLayout).counter,
              ...(updates.obsLayout.counter || {}),
            },
          })
        : normalizeObsLayout(appState.obsLayout),
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
    const { delta, exactCount, exactGoal, goalTitle, goalLinkId } = req.body as {
      delta?: number;
      exactCount?: number;
      exactGoal?: number;
      goalTitle?: string;
      goalLinkId?: string;
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

    if (goalLinkId && Array.isArray(appState.goalLinkHistory)) {
      const nowIso = new Date().toISOString();
      appState.goalLinkHistory = appState.goalLinkHistory.map((item) =>
        item.id === goalLinkId
          ? {
              ...item,
              goal: appState.followerGoal,
              goalTitle: appState.goalTitle,
              updatedAt: nowIso,
            }
          : item
      );
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

  // 5A. Save & Live-Edit Follower Goal Link History (Edit Goal Live Without Changing OBS Link)
  app.post('/api/goal-links', (req: Request, res: Response) => {
    const {
      label,
      goal,
      goalTitle,
      template,
      font,
      showGoal = true,
    } = (req.body || {}) as {
      label?: string;
      goal?: number;
      goalTitle?: string;
      template?: AppSettings['activeCounterTemplate'];
      font?: AppSettings['counterFont'];
      showGoal?: boolean;
    };

    const nextGoal =
      typeof goal === 'number' && Number.isFinite(goal) && goal > 0
        ? Math.round(goal)
        : appState.followerGoal || 500;
    const nextTitle =
      typeof goalTitle === 'string' && goalTitle.trim()
        ? goalTitle.trim()
        : `ROAD TO ${nextGoal.toLocaleString()} FOLLOWERS`;
    const nextTemplate = template || appState.activeCounterTemplate || 'neon';
    const nextFont = font || appState.counterFont || appState.selectedFont || 'Orbitron';
    const id = `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const permanentUrl = buildObsCounterUrl(PUBLIC_RENDER_ORIGIN, {
      template: nextTemplate,
      font: nextFont,
      showGoal: Boolean(showGoal),
      goalId: id,
    });

    const newItem: GoalLinkHistoryItem = {
      id,
      label:
        (label || '').trim() ||
        `${nextTemplate.toUpperCase()} · ${nextGoal.toLocaleString()} Goal`,
      url: permanentUrl,
      goal: nextGoal,
      goalTitle: nextTitle,
      template: nextTemplate,
      font: nextFont,
      showGoal: Boolean(showGoal),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    appState.followerGoal = nextGoal;
    appState.goalTitle = nextTitle;
    appState.activeCounterTemplate = nextTemplate;
    appState.counterFont = nextFont;
    appState.showGoalOnCounter = Boolean(showGoal);
    appState.goalLinkHistory = [
      newItem,
      ...(Array.isArray(appState.goalLinkHistory) ? appState.goalLinkHistory : []).slice(0, 29),
    ];

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);

    res.json({ ok: true, item: newItem, settings: appState });
  });

  app.patch('/api/goal-links/:id', (req: Request, res: Response) => {
    const targetId = String(req.params.id || '').trim();
    const { goal, goalTitle, label, template, font, showGoal, syncMain = true } = (req.body ||
      {}) as {
      goal?: number;
      goalTitle?: string;
      label?: string;
      template?: AppSettings['activeCounterTemplate'];
      font?: AppSettings['counterFont'];
      showGoal?: boolean;
      syncMain?: boolean;
    };

    const existingList = Array.isArray(appState.goalLinkHistory)
      ? appState.goalLinkHistory
      : [];
    const target = existingList.find((item) => item.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'Saved goal link not found' });
      return;
    }

    const updatedGoal =
      typeof goal === 'number' && Number.isFinite(goal) && goal > 0
        ? Math.round(goal)
        : target.goal;
    const autoGoalTitle =
      target.goalTitle.startsWith('ROAD TO ') || !goalTitle
        ? `ROAD TO ${updatedGoal.toLocaleString()} FOLLOWERS`
        : target.goalTitle;
    const updatedTitle =
      typeof goalTitle === 'string' && goalTitle.trim() ? goalTitle.trim() : autoGoalTitle;
    const nowIso = new Date().toISOString();

    const updatedItem: GoalLinkHistoryItem = {
      ...target,
      label: typeof label === 'string' && label.trim() ? label.trim() : target.label,
      goal: updatedGoal,
      goalTitle: updatedTitle,
      template: template || target.template,
      font: font || target.font,
      showGoal: typeof showGoal === 'boolean' ? showGoal : target.showGoal,
      updatedAt: nowIso,
    };

    appState.goalLinkHistory = existingList.map((item) =>
      item.id === targetId ? updatedItem : item
    );

    if (syncMain) {
      appState.followerGoal = updatedItem.goal;
      appState.goalTitle = updatedItem.goalTitle;
      appState.activeCounterTemplate = updatedItem.template;
      appState.counterFont = updatedItem.font;
    }

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);

    if (isMilestoneReached(appState.followerCount, updatedItem.goal)) {
      broadcastEvent('MILESTONE_REACHED', {
        followerCount: appState.followerCount,
        followerGoal: updatedItem.goal,
        goalTitle: updatedItem.goalTitle,
      });
    }

    res.json({ ok: true, item: updatedItem, settings: appState });
  });

  app.delete('/api/goal-links/:id', (req: Request, res: Response) => {
    const targetId = String(req.params.id || '').trim();
    const existingList = Array.isArray(appState.goalLinkHistory)
      ? appState.goalLinkHistory
      : [];
    appState.goalLinkHistory = existingList.filter((item) => item.id !== targetId);
    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);
    res.json({ ok: true, settings: appState });
  });

  // 5A-2. Save & Live-Edit Specific Kicks/Subs Text Alert Link History (Edit Live Without Changing Link)
  app.post('/api/text-alert-links', (req: Request, res: Response) => {
    const {
      label,
      eventFilter = 'all',
      style,
      font,
      sfxPreset,
      duration,
      ttsEnabled,
      voice,
      rate,
      volume,
    } = (req.body || {}) as {
      label?: string;
      eventFilter?: TextAlertEventFilter;
      style?: TextAlertStyle;
      font?: AppSettings['textAlertFont'];
      sfxPreset?: AppSettings['sfxPreset'];
      duration?: number;
      ttsEnabled?: boolean;
      voice?: AppSettings['ttsSettings']['lang'];
      rate?: number;
      volume?: number;
    };

    const nextFilter: TextAlertEventFilter =
      eventFilter === 'kicks' || eventFilter === 'sub-gift' || eventFilter === 'sub-buy'
        ? eventFilter
        : 'all';
    const nextStyle: TextAlertStyle = style || appState.textAlertStyle || 'kinetic-neon';
    const nextFont = font || appState.textAlertFont || 'Bebas Neue';
    const nextSfx = sfxPreset || appState.textAlertSfxPreset || 'royal';
    const nextDuration =
      typeof duration === 'number' && Number.isFinite(duration)
        ? Math.min(20, Math.max(2, Math.round(duration)))
        : appState.textAlertDuration || 6;
    const nextTts =
      typeof ttsEnabled === 'boolean' ? ttsEnabled : appState.ttsSettings.enabled;
    const nextVoice = voice || appState.ttsSettings.lang || 'pro-hype-male';
    const nextRate =
      typeof rate === 'number' && Number.isFinite(rate)
        ? Math.min(2.0, Math.max(0.5, Number(rate.toFixed(2))))
        : appState.ttsSettings.rate || 1.0;
    const nextVolume =
      typeof volume === 'number' && Number.isFinite(volume)
        ? Math.min(1.0, Math.max(0.0, Number(volume.toFixed(2))))
        : appState.ttsSettings.volume ?? 1.0;

    const id = `kicks-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const permanentUrl = buildObsTextAlertUrl(PUBLIC_RENDER_ORIGIN, {
      style: nextStyle,
      font: nextFont,
      sfx: nextSfx,
      tts: nextTts,
      voice: nextVoice,
      duration: nextDuration,
      rate: nextRate,
      volume: nextVolume,
      eventFilter: nextFilter,
      alertId: id,
    });

    const filterLabelMap: Record<TextAlertEventFilter, string> = {
      all: 'ALL KICKS & SUBS',
      kicks: 'KICKS ONLY',
      'sub-gift': 'SUBS GIFT ONLY',
      'sub-buy': 'SUB BUY ONLY',
    };

    const newItem: TextAlertLinkHistoryItem = {
      id,
      label:
        (label || '').trim() ||
        `${filterLabelMap[nextFilter]} · ${nextStyle.toUpperCase()}`,
      url: permanentUrl,
      eventFilter: nextFilter,
      style: nextStyle,
      font: nextFont,
      sfxPreset: nextSfx,
      duration: nextDuration,
      ttsEnabled: nextTts,
      voice: nextVoice,
      rate: nextRate,
      volume: nextVolume,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    appState.textAlertStyle = nextStyle;
    appState.textAlertFont = nextFont;
    appState.textAlertSfxPreset = nextSfx;
    appState.textAlertDuration = nextDuration;
    appState.textAlertLinkHistory = [
      newItem,
      ...(Array.isArray(appState.textAlertLinkHistory)
        ? appState.textAlertLinkHistory
        : []
      ).slice(0, 29),
    ];

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);

    res.json({ ok: true, item: newItem, settings: appState });
  });

  app.patch('/api/text-alert-links/:id', (req: Request, res: Response) => {
    const targetId = String(req.params.id || '').trim();
    const {
      label,
      eventFilter,
      style,
      font,
      sfxPreset,
      duration,
      ttsEnabled,
      voice,
      rate,
      volume,
      syncMain = true,
    } = (req.body || {}) as {
      label?: string;
      eventFilter?: TextAlertEventFilter;
      style?: TextAlertStyle;
      font?: AppSettings['textAlertFont'];
      sfxPreset?: AppSettings['sfxPreset'];
      duration?: number;
      ttsEnabled?: boolean;
      voice?: AppSettings['ttsSettings']['lang'];
      rate?: number;
      volume?: number;
      syncMain?: boolean;
    };

    const existingList = Array.isArray(appState.textAlertLinkHistory)
      ? appState.textAlertLinkHistory
      : [];
    const target = existingList.find((item) => item.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'Saved Kicks/Subs link not found' });
      return;
    }

    const updatedItem: TextAlertLinkHistoryItem = {
      ...target,
      label: typeof label === 'string' && label.trim() ? label.trim() : target.label,
      eventFilter: eventFilter || target.eventFilter,
      style: style || target.style,
      font: font || target.font,
      sfxPreset: sfxPreset || target.sfxPreset || appState.textAlertSfxPreset || 'royal',
      duration:
        typeof duration === 'number' && Number.isFinite(duration)
          ? Math.min(20, Math.max(2, Math.round(duration)))
          : target.duration,
      ttsEnabled: typeof ttsEnabled === 'boolean' ? ttsEnabled : target.ttsEnabled,
      voice: voice || target.voice,
      rate:
        typeof rate === 'number' && Number.isFinite(rate)
          ? Math.min(2.0, Math.max(0.5, Number(rate.toFixed(2))))
          : target.rate,
      volume:
        typeof volume === 'number' && Number.isFinite(volume)
          ? Math.min(1.0, Math.max(0.0, Number(volume.toFixed(2))))
          : target.volume,
      updatedAt: new Date().toISOString(),
    };

    appState.textAlertLinkHistory = existingList.map((item) =>
      item.id === targetId ? updatedItem : item
    );

    if (syncMain) {
      appState.textAlertStyle = updatedItem.style;
      appState.textAlertFont = updatedItem.font;
      appState.textAlertSfxPreset = updatedItem.sfxPreset || 'royal';
      appState.textAlertDuration = updatedItem.duration;
    }

    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);

    res.json({ ok: true, item: updatedItem, settings: appState });
  });

  app.delete('/api/text-alert-links/:id', (req: Request, res: Response) => {
    const targetId = String(req.params.id || '').trim();
    const existingList = Array.isArray(appState.textAlertLinkHistory)
      ? appState.textAlertLinkHistory
      : [];
    appState.textAlertLinkHistory = existingList.filter((item) => item.id !== targetId);
    saveSettings(appState);
    broadcastEvent('SETTINGS_UPDATED', appState);
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
    const desiredEvents = [
      'channel.followed',
      'kicks.gifted',
      'channel.subscription.gifts',
      'channel.subscription.new',
      'channel.subscription.renewal',
    ];
    try {
      let existingNames = new Set<string>();
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
        for (const sub of existing.data || []) {
          if (
            sub.name &&
            (!sub.broadcaster_user_id ||
              sub.broadcaster_user_id === KICK_BROADCASTER_USER_ID)
          ) {
            existingNames.add(sub.name);
          }
        }
      }

      const missing = desiredEvents.filter((evt) => !existingNames.has(evt));
      if (missing.length === 0) {
        appState.setupChecklist.webhookStep2AppCreated = true;
        appState.setupChecklist.webhookStep3SubscribedFollowed = true;
        return;
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
            events: missing.map((name) => ({ name, version: 1 })),
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

  // Shared helper to process a Kick alert event (Follow, Kicks Send, Sub Gift, Sub Buy)
  async function processFollowEvent(
    username: string,
    source: 'kick-webhook' | 'simulator' | 'test' | 'replay',
    incrementCount: boolean,
    overrides?: Partial<FollowAlertPayload>
  ): Promise<FollowAlertPayload> {
    const cleanUsername = (username || 'KickUser').trim();
    const eventType: AlertEventType = overrides?.eventType || 'follow';
    const amount = overrides?.amount;
    const nowIso = new Date().toISOString();

    if (incrementCount && eventType === 'follow') {
      appState.followerCount += 1;
    }

    const cleanNote = overrides?.subMessage?.trim() || undefined;

    const newFollower: RecentFollower = {
      id: `fol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      timestamp: nowIso,
      source,
      eventType,
      amount,
      subMessage: cleanNote,
      avatarUrl:
        eventType === 'follow'
          ? overrides?.avatarUrl || appState.customAvatarUrl || undefined
          : undefined,
    };

    appState.recentFollowers = [
      newFollower,
      ...appState.recentFollowers.slice(0, 29),
    ];

    saveSettings(appState);

    const ttsMessage =
      overrides?.ttsMessage ||
      formatEventTtsText(
        eventType,
        cleanUsername,
        amount,
        appState.ttsSettings.messageTemplate,
        appState.channelName,
        cleanNote
      );

    const ttsEnabled = overrides?.ttsEnabled ?? appState.ttsSettings.enabled;
    const ttsLang = overrides?.ttsLang || appState.ttsSettings.lang;

    // Pre-warm TTS audio into RAM cache BEFORE broadcasting SSE so OBS speaks with 0ms delay
    if (ttsEnabled && !appState.alertsMuted) {
      await prewarmTtsAudio(ttsMessage, ttsLang);
    }

    const isTextOnly = eventType !== 'follow';

    const alertPayload: FollowAlertPayload = {
      id: newFollower.id,
      eventType,
      amount,
      subMessage: overrides?.subMessage,
      textStyle: overrides?.textStyle || appState.textAlertStyle || 'kinetic-neon',
      username: cleanUsername,
      avatarUrl: newFollower.avatarUrl,
      timestamp: nowIso,
      source,
      followerCount: appState.followerCount,
      template: overrides?.template || appState.activeAlertTemplate,
      font:
        overrides?.font ||
        (isTextOnly ? appState.textAlertFont || 'Bebas Neue' : appState.selectedFont),
      sfxPreset: isTextOnly
        ? overrides?.sfxPreset || appState.textAlertSfxPreset || 'royal'
        : 'none',
      duration:
        overrides?.duration ||
        (isTextOnly ? appState.textAlertDuration || 6 : appState.alertDuration),
      ttsEnabled,
      ttsLang,
      ttsMessage,
    };

    broadcastEvent('SETTINGS_UPDATED', appState);
    broadcastEvent('FOLLOW_ALERT', alertPayload);

    if (
      incrementCount &&
      eventType === 'follow' &&
      isMilestoneReached(appState.followerCount, appState.followerGoal)
    ) {
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
          req.body?.event_type ||
          req.body?.type ||
          'channel.followed'
      ) || 'channel.followed';

    const details = parseKickEventDetails(eventHeader, req.body);
    const username = details.username || extractFollowerUsername(req.body);
    let avatarUrl = details.avatarUrl;
    const nowIso = new Date().toISOString();

    const sanitizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') {
        sanitizedHeaders[k] = v;
      }
    }

    const isSimulated = req.headers['x-sujalx-simulated'] === 'true';
    const webhookSource: 'simulator' | 'kick-webhook' = isSimulated
      ? 'simulator'
      : 'kick-webhook';

    const isDuplicateFollow = shouldSuppressDuplicateFollowAlert({
      eventType: details.eventType,
      source: webhookSource,
      username,
      followedHistory: appState.followedUsernamesHistory,
    });

    if (!isDuplicateFollow && details.eventType === 'follow') {
      appState.followedUsernamesHistory = recordFollowedUsername(
        username,
        appState.followedUsernamesHistory
      );
    }

    const logEntry: WebhookLogEntry = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      eventType: eventHeader,
      username,
      status: 200,
      duplicateFollowSuppressed: isDuplicateFollow || undefined,
      headers: sanitizedHeaders,
      payload:
        req.body && typeof req.body === 'object'
          ? (req.body as Record<string, unknown>)
          : { raw: req.body },
    };

    appState.webhookLogs = [logEntry, ...appState.webhookLogs.slice(0, 39)];
    appState.setupChecklist.webhookStep4SimulatedTest = true;

    if (isDuplicateFollow) {
      saveSettings(appState);
    }

    // Respond 200 OK immediately so Kick never times out the webhook
    res.status(200).json({
      received: true,
      duplicateFollowSuppressed: isDuplicateFollow,
      event: eventHeader,
      eventType: details.eventType,
      username,
      amount: details.amount,
      followerCount:
        details.eventType === 'follow' && !isDuplicateFollow
          ? appState.followerCount + 1
          : appState.followerCount,
    });

    if (isDuplicateFollow) {
      broadcastEvent('WEBHOOK_RECEIVED', logEntry);
      broadcastEvent('SETTINGS_UPDATED', appState);
      return;
    }

    if (details.eventType === 'follow' && !avatarUrl && username && username !== 'KickUser') {
      avatarUrl = await fetchKickUserAvatar(username);
    }

    await processFollowEvent(
      username,
      webhookSource,
      details.eventType === 'follow',
      {
        eventType: details.eventType,
        amount: details.amount,
        subMessage: details.subMessage,
        avatarUrl,
      }
    );
    broadcastEvent('WEBHOOK_RECEIVED', logEntry);

    // Sync exact real follower total from Kick API right after a real follow webhook
    if (!isSimulated && details.eventType === 'follow') {
      setTimeout(() => {
        syncKickChannelFollowers(appState.channelName).catch(() => {});
      }, 1500);
    }
  });

  // 7. Webhook Simulator Endpoint (POST /api/webhook/simulate)
  app.post('/api/webhook/simulate', async (req: Request, res: Response) => {
    const bodyObj = (req.body || {}) as Record<string, unknown>;
    const eventHeader = String(bodyObj.eventType || bodyObj.event || 'channel.followed');
    const details = parseKickEventDetails(eventHeader, req.body);
    const username = details.username || extractFollowerUsername(req.body);
    const nowIso = new Date().toISOString();

    const isDuplicateFollow = shouldSuppressDuplicateFollowAlert({
      eventType: details.eventType,
      source: 'simulator',
      username,
      followedHistory: appState.followedUsernamesHistory,
    });

    if (!isDuplicateFollow && details.eventType === 'follow') {
      appState.followedUsernamesHistory = recordFollowedUsername(
        username,
        appState.followedUsernamesHistory
      );
    }

    const simulatedPayload = {
      event: eventHeader,
      channel: {
        id: 29740496,
        slug: appState.channelName || 'sujalxsaini',
        url: appState.channelUrl || 'https://kick.com/sujalxsaini',
      },
      username,
      amount: details.amount,
      ...(details.subMessage ? { message: details.subMessage } : {}),
      created_at: nowIso,
    };

    const logEntry: WebhookLogEntry = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      eventType: eventHeader,
      username,
      status: 200,
      duplicateFollowSuppressed: isDuplicateFollow || undefined,
      headers: {
        'kick-event-type': eventHeader,
        'content-type': 'application/json',
        'x-sujalx-simulator': 'true',
      },
      payload: simulatedPayload,
    };

    appState.webhookLogs = [logEntry, ...appState.webhookLogs.slice(0, 39)];
    appState.setupChecklist.webhookStep4SimulatedTest = true;

    if (isDuplicateFollow) {
      saveSettings(appState);
      broadcastEvent('WEBHOOK_RECEIVED', logEntry);
      broadcastEvent('SETTINGS_UPDATED', appState);
      res.status(200).json({
        received: true,
        duplicateFollowSuppressed: true,
        alert: null,
        log: logEntry,
        settings: appState,
      });
      return;
    }

    const alertPayload = await processFollowEvent(
      username,
      'simulator',
      details.eventType === 'follow',
      {
        eventType: details.eventType,
        amount: details.amount,
        subMessage: details.subMessage,
      }
    );
    broadcastEvent('WEBHOOK_RECEIVED', logEntry);

    res.status(200).json({
      received: true,
      duplicateFollowSuppressed: false,
      alert: alertPayload,
      log: logEntry,
      settings: appState,
    });
  });

  // 8. Fire Test Alert + Exact-Time TTS (Follow, Kicks Send, Sub Gift, Sub Buy)
  app.post('/api/test-alert', async (req: Request, res: Response) => {
    const {
      username = 'SujalVIP_Fan',
      incrementCount = false,
      eventType = 'follow',
      amount,
      subMessage,
      textStyle,
      template,
      font,
      sfxPreset,
      ttsLang,
    } = (req.body || {}) as {
      username?: string;
      incrementCount?: boolean;
      eventType?: AlertEventType;
      amount?: number;
      subMessage?: string;
      textStyle?: TextAlertStyle;
      template?: AppSettings['activeAlertTemplate'];
      font?: AppSettings['selectedFont'];
      sfxPreset?: AppSettings['sfxPreset'];
      ttsLang?: AppSettings['ttsSettings']['lang'];
    };

    const alertPayload = await processFollowEvent(
      username,
      'test',
      Boolean(incrementCount) && eventType === 'follow',
      {
        eventType,
        amount,
        subMessage,
        textStyle,
        template,
        font,
        sfxPreset,
        ttsLang,
      }
    );

    res.json({ ok: true, alert: alertPayload, settings: appState });
  });

  // 9. Replay Alert from Recent Followers Feed
  app.post('/api/replay-alert', async (req: Request, res: Response) => {
    const {
      username = 'KickVIP',
      eventType = 'follow',
      amount,
      subMessage,
    } = (req.body || {}) as {
      username?: string;
      eventType?: AlertEventType;
      amount?: number;
      subMessage?: string;
    };
    const alertPayload = await processFollowEvent(username, 'replay', false, {
      eventType,
      amount,
      subMessage,
    });
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

  // 13. Multi-Accent & Studio Neural Zero-Delay OBS Text-to-Speech Proxy (GET /api/tts)
  app.get('/api/tts', async (req: Request, res: Response) => {
    const text = String(req.query.text || 'Welcome to sujalxsaini stream!').slice(0, 240);
    const lang = String(req.query.lang || req.query.voice || 'pro-hype-male');

    const audio = await fetchOrBuildTtsAudio(text, lang);
    res.setHeader('Content-Type', audio.contentType);
    res.setHeader(
      'Cache-Control',
      audio.contentType === 'audio/mpeg' ? 'public, max-age=3600' : 'no-cache'
    );
    res.send(audio.buffer);
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
