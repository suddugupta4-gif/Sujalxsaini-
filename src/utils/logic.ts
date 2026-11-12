import type {
  AlertTemplateId,
  AppSettings,
  CounterTemplateId,
  FontFamilyName,
  SfxPresetId,
  TtsLangCode,
} from '../types';

export const GOOGLE_FONTS: {
  name: FontFamilyName;
  styleTag: string;
  description: string;
}[] = [
  { name: 'Orbitron', styleTag: 'Cyberpunk / Kick Neon Header', description: 'Sci-Fi Geometric Display' },
  { name: 'Cinzel', styleTag: 'Royal VIP / Luxury Gold', description: 'Sovereign Classical Serif' },
  { name: 'Chakra Petch', styleTag: 'Valorant / Tactical HUD', description: 'Angular Esports Telemetry' },
  { name: 'Rajdhani', styleTag: 'Modern Broadcast Tech', description: 'Condensed Gaming UI' },
  { name: 'Outfit', styleTag: 'VisionOS / Spatial Glass', description: 'Clean Spatial Geometric' },
  { name: 'Bebas Neue', styleTag: 'Anime Overdrive / Arcade', description: 'High-Impact All-Caps Slash' },
  { name: 'Syne', styleTag: 'Holographic Synthwave VIP', description: 'Avant-Garde Chrome Display' },
  { name: 'JetBrains Mono', styleTag: 'Matrix / Digital Odometer', description: 'Terminal Monospace Readout' },
];

export const TTS_LANGUAGES: {
  code: TtsLangCode;
  label: string;
  region: string;
  sample: string;
}[] = [
  { code: 'en-IN', label: 'Indian English (VIP Accent)', region: 'India', sample: 'Namaste and welcome to sujalxsaini VIP stream!' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी Voice)', region: 'India', sample: 'सुजल भाई के स्ट्रीम में आपका स्वागत है!' },
  { code: 'en-US', label: 'US English (Broadcast)', region: 'United States', sample: 'Welcome to the sujalxsaini squad on Kick!' },
  { code: 'en-GB', label: 'British English (Royal)', region: 'United Kingdom', sample: 'Cheers for following sujalxsaini, mate!' },
  { code: 'ja-JP', label: 'Japanese (Anime Voice)', region: 'Japan', sample: 'Sujalxsaini check in! Arigato gozaimasu!' },
  { code: 'es-ES', label: 'Spanish (Hype Caster)', region: 'Spain', sample: '¡Bienvenido al canal oficial de sujalxsaini!' },
];

export const OBS_CUSTOM_CSS = `body { background-color: rgba(0, 0, 0, 0) !important; margin: 0px auto; overflow: hidden; } * { will-change: transform, opacity; backface-visibility: hidden; }`;

export function extractFollowerUsername(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return 'KickUser';
  }
  const record = body as Record<string, unknown>;

  if (record.follower && typeof record.follower === 'object') {
    const follower = record.follower as Record<string, unknown>;
    if (typeof follower.username === 'string' && follower.username.trim()) {
      return follower.username.trim();
    }
    if (typeof follower.slug === 'string' && follower.slug.trim()) {
      return follower.slug.trim();
    }
  }

  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (data.follower && typeof data.follower === 'object') {
      const nestedFollower = data.follower as Record<string, unknown>;
      if (typeof nestedFollower.username === 'string' && nestedFollower.username.trim()) {
        return nestedFollower.username.trim();
      }
    }
    if (typeof data.username === 'string' && data.username.trim()) {
      return data.username.trim();
    }
  }

  if (record.sender && typeof record.sender === 'object') {
    const sender = record.sender as Record<string, unknown>;
    if (typeof sender.username === 'string' && sender.username.trim()) {
      return sender.username.trim();
    }
  }

  if (typeof record.username === 'string' && record.username.trim()) {
    return record.username.trim();
  }

  return 'KickUser';
}

export function extractFollowerAvatar(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;

  const pickPic = (obj: Record<string, unknown>): string | undefined => {
    const candidates = [
      obj.profile_pic,
      obj.profilePic,
      obj.avatar,
      obj.avatar_url,
      obj.avatarUrl,
      obj.profile_picture,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().startsWith('http')) {
        return c.trim();
      }
    }
    if (obj.user && typeof obj.user === 'object') {
      return pickPic(obj.user as Record<string, unknown>);
    }
    return undefined;
  };

  if (record.follower && typeof record.follower === 'object') {
    const found = pickPic(record.follower as Record<string, unknown>);
    if (found) return found;
  }
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (data.follower && typeof data.follower === 'object') {
      const found = pickPic(data.follower as Record<string, unknown>);
      if (found) return found;
    }
    const found = pickPic(data);
    if (found) return found;
  }
  if (record.sender && typeof record.sender === 'object') {
    const found = pickPic(record.sender as Record<string, unknown>);
    if (found) return found;
  }
  return pickPic(record);
}

const AVATAR_PALETTES = [
  { bg1: '#071A12', bg2: '#0B2B1E', visor: '#53FC18', glow: '#22C55E' },
  { bg1: '#1E1405', bg2: '#2D1E08', visor: '#FFD700', glow: '#F59E0B' },
  { bg1: '#1F0714', bg2: '#310B1F', visor: '#FF0055', glow: '#F43F5E' },
  { bg1: '#061826', bg2: '#0B2940', visor: '#00F0FF', glow: '#38BDF8' },
  { bg1: '#1A0926', bg2: '#2B0F40', visor: '#E879F9', glow: '#C084FC' },
];

export function generateGamerAvatarDataUri(username: string, accentOverride?: string): string {
  const clean = (username || 'KickVIP').trim() || 'KickVIP';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const visorColor = accentOverride || palette.visor;
  const initials = clean.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'KV';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.bg1}" />
        <stop offset="100%" stop-color="${palette.bg2}" />
      </linearGradient>
      <linearGradient id="visor" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${visorColor}" />
        <stop offset="100%" stop-color="#FFFFFF" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="24" fill="url(#bg)" />
    <circle cx="60" cy="60" r="52" fill="none" stroke="${visorColor}" stroke-width="2" stroke-opacity="0.35" />
    <!-- Cyber Gamer Hood & Shoulders Silhouette -->
    <path d="M22 108 C24 84 40 76 60 76 C80 76 96 84 98 108 Z" fill="#0D1520" stroke="${visorColor}" stroke-width="2" />
    <!-- Cyber Helmet Head -->
    <path d="M36 48 C36 28 46 20 60 20 C74 20 84 28 84 48 C84 64 74 72 60 72 C46 72 36 64 36 48 Z" fill="#111C2B" stroke="${visorColor}" stroke-width="2.2" />
    <!-- Glowing Esports Visor -->
    <path d="M43 45 L77 45 L73 54 L47 54 Z" fill="url(#visor)" />
    <!-- Gamer Initials Badge on Chest -->
    <text x="60" y="99" text-anchor="middle" fill="#FFFFFF" font-family="Orbitron, sans-serif" font-weight="900" font-size="16" letter-spacing="1">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getFollowerAvatarUrl(
  username: string,
  customAvatarUrl?: string,
  accentHex?: string
): string {
  if (customAvatarUrl && customAvatarUrl.trim().startsWith('http')) {
    return customAvatarUrl.trim();
  }
  if (customAvatarUrl && customAvatarUrl.trim().startsWith('data:image/')) {
    return customAvatarUrl.trim();
  }
  return generateGamerAvatarDataUri(username, accentHex);
}

/**
 * Computes an adaptive starting font size (in px) based on username length
 * so long usernames automatically shrink to fit inside alert and counter boxes.
 */
export function computeAdaptiveUsernameFontSize(
  username: string,
  mode: 'alert-full' | 'alert-compact' | 'counter-recent' = 'alert-full'
): number {
  const len = Math.max(1, (username || '').trim().length);
  const baseMax =
    mode === 'alert-full' ? 22 : mode === 'alert-compact' ? 17 : 14;
  const minSize = mode === 'counter-recent' ? 9 : 10;

  if (len <= 12) return baseMax;
  if (len <= 16) return Math.max(minSize, Math.round(baseMax * 0.85));
  if (len <= 20) return Math.max(minSize, Math.round(baseMax * 0.72));
  if (len <= 25) return Math.max(minSize, Math.round(baseMax * 0.6));
  return Math.max(minSize, Math.round(baseMax * (14 / len)));
}

export function formatTtsMessage(template: string, username: string, channelName = 'sujalxsaini'): string {
  const cleanUser = (username || 'KickUser').trim();
  const baseTemplate =
    template && template.trim().length > 0
      ? template
      : '{username} started following';
  return baseTemplate
    .replace(/\{username\}/gi, cleanUser)
    .replace(/\{user\}/gi, cleanUser)
    .replace(/\{channel\}/gi, channelName);
}

export function buildObsAlertUrl(
  origin: string,
  params: {
    template: AlertTemplateId;
    font: FontFamilyName;
    tts: boolean;
    voice: TtsLangCode;
    sfx: SfxPresetId;
    duration: number;
    rate?: number;
    volume?: number;
  }
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const searchParams = new URLSearchParams();
  searchParams.set('obs', 'alerts');
  searchParams.set('template', params.template);
  searchParams.set('font', params.font);
  searchParams.set('tts', params.tts ? '1' : '0');
  searchParams.set('voice', params.voice);
  searchParams.set('sfx', params.sfx);
  searchParams.set('duration', String(params.duration));
  if (typeof params.rate === 'number' && Number.isFinite(params.rate)) {
    searchParams.set('rate', String(Number(params.rate.toFixed(2))));
  }
  if (typeof params.volume === 'number' && Number.isFinite(params.volume)) {
    searchParams.set('volume', String(Number(params.volume.toFixed(2))));
  }
  return `${cleanOrigin}/?${searchParams.toString()}`;
}

export function buildObsCounterUrl(
  origin: string,
  params: {
    template: CounterTemplateId;
    font: FontFamilyName;
    showGoal: boolean;
    goal?: number;
  }
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const searchParams = new URLSearchParams();
  searchParams.set('obs', 'counter');
  searchParams.set('template', params.template);
  searchParams.set('font', params.font);
  searchParams.set('showGoal', params.showGoal ? '1' : '0');
  if (typeof params.goal === 'number' && Number.isFinite(params.goal) && params.goal > 0) {
    searchParams.set('goal', String(Math.round(params.goal)));
  }
  return `${cleanOrigin}/?${searchParams.toString()}`;
}

export function calculateGoalPercentage(count: number, goal: number): number {
  if (!Number.isFinite(goal) || goal <= 0) return 100;
  if (!Number.isFinite(count) || count <= 0) return 0;
  const pct = (count / goal) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

export function isMilestoneReached(newCount: number, goal: number): boolean {
  return Number.isFinite(newCount) && Number.isFinite(goal) && goal > 0 && newCount === goal;
}

export function validatePin(inputPin: string, savedPin: string): boolean {
  return inputPin.trim() === (savedPin || '1234').trim();
}

export function parseObsQueryOverrides(search: string, defaults?: Partial<AppSettings>) {
  const params = new URLSearchParams(search);
  const obsMode = params.get('obs');
  const validAlertTemplates: AlertTemplateId[] = ['neon', 'gold', 'esports', 'glass', 'anime', 'holo'];
  const validCounterTemplates: CounterTemplateId[] = ['neon', 'gold', 'esports', 'glass', 'matrix', 'holo'];
  const validFonts: FontFamilyName[] = [
    'Orbitron',
    'Cinzel',
    'Chakra Petch',
    'Rajdhani',
    'Outfit',
    'Bebas Neue',
    'Syne',
    'JetBrains Mono',
  ];
  const validSfx: SfxPresetId[] = ['cyber', 'royal', 'valorant', 'anime', 'glass', 'arcade'];
  const validVoices: TtsLangCode[] = ['en-IN', 'hi-IN', 'en-US', 'en-GB', 'ja-JP', 'es-ES'];

  const rawTemplate = params.get('template');
  const rawFont = params.get('font');
  const rawSfx = params.get('sfx');
  const rawVoice = params.get('voice');
  const rawTts = params.get('tts');
  const rawDuration = params.get('duration');
  const rawRate = params.get('rate');
  const rawVolume = params.get('volume');
  const rawShowGoal = params.get('showGoal');
  const rawGoal = params.get('goal');

  const alertTemplate: AlertTemplateId =
    rawTemplate && validAlertTemplates.includes(rawTemplate as AlertTemplateId)
      ? (rawTemplate as AlertTemplateId)
      : defaults?.activeAlertTemplate || 'neon';

  const counterTemplate: CounterTemplateId =
    rawTemplate && validCounterTemplates.includes(rawTemplate as CounterTemplateId)
      ? (rawTemplate as CounterTemplateId)
      : defaults?.activeCounterTemplate || 'neon';

  const font: FontFamilyName =
    rawFont && validFonts.includes(rawFont as FontFamilyName)
      ? (rawFont as FontFamilyName)
      : defaults?.selectedFont || 'Orbitron';

  const sfx: SfxPresetId =
    rawSfx && validSfx.includes(rawSfx as SfxPresetId)
      ? (rawSfx as SfxPresetId)
      : defaults?.sfxPreset || 'cyber';

  const voice: TtsLangCode =
    rawVoice && validVoices.includes(rawVoice as TtsLangCode)
      ? (rawVoice as TtsLangCode)
      : defaults?.ttsSettings?.lang || 'en-US';

  const ttsEnabled =
    rawTts !== null ? rawTts !== '0' && rawTts !== 'false' : (defaults?.ttsSettings?.enabled ?? true);

  const duration =
    rawDuration && Number.isFinite(Number(rawDuration))
      ? Math.min(30, Math.max(2, Number(rawDuration)))
      : defaults?.alertDuration || 7;

  const rate =
    rawRate && Number.isFinite(Number(rawRate))
      ? Math.min(2.0, Math.max(0.5, Number(rawRate)))
      : defaults?.ttsSettings?.rate || 1.0;

  const volume =
    rawVolume && Number.isFinite(Number(rawVolume))
      ? Math.min(1.0, Math.max(0.0, Number(rawVolume)))
      : (defaults?.ttsSettings?.volume ?? 1.0);

  const showGoal =
    rawShowGoal !== null
      ? rawShowGoal !== '0' && rawShowGoal !== 'false'
      : (defaults?.showGoalOnCounter ?? true);

  const goal =
    rawGoal && Number.isFinite(Number(rawGoal)) && Number(rawGoal) > 0
      ? Math.round(Number(rawGoal))
      : defaults?.followerGoal || 1500;

  return {
    obsMode: obsMode === 'alerts' || obsMode === 'counter' ? obsMode : null,
    alertTemplate,
    counterTemplate,
    font,
    sfx,
    voice,
    ttsEnabled,
    duration,
    rate,
    volume,
    showGoal,
    goal,
    previewMode: params.get('preview') === '1',
    autostart: params.get('autostart') === '1',
  };
}
