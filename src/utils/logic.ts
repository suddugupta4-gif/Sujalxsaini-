import type {
  AlertEventType,
  AlertTemplateId,
  AppSettings,
  CounterTemplateId,
  FontFamilyName,
  SfxPresetId,
  TextAlertEventFilter,
  TextAlertStyle,
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
  { code: 'pro-hype-male', label: 'Pro Hype Male (Deep Streamer)', region: 'Neural Studio', sample: 'KaranClutchX just sent 500 kicks! Let us go!' },
  { code: 'pro-caster-female', label: 'Pro Female Caster (Crisp Clear)', region: 'Neural Studio', sample: 'RohanGamingIN gifted 5 subs to the squad!' },
  { code: 'pro-vip-narrator', label: 'VIP Movie Narrator (Epic Boss)', region: 'Neural Studio', sample: 'A new champion enters the sujalxsaini arena!' },
  { code: 'pro-emotional-female', label: 'Expressive Female (Warm Neural)', region: 'Neural Studio', sample: 'Thank you so much for supporting sujalxsaini!' },
  { code: 'pro-funny-male', label: 'Overdrive Hype Bro (Energetic)', region: 'Neural Studio', sample: 'Massive kicks drop on the Kick stream right now!' },
  { code: 'pro-uk-gent', label: 'British Pro Broadcaster (Royal UK)', region: 'UK Studio', sample: 'Cheers for the 500 kicks on sujalxsaini!' },
  { code: 'pro-aussie-chill', label: 'Aussie Clean Caster (Smooth)', region: 'AU Studio', sample: 'Absolute legend dropping kicks in chat!' },
  { code: 'en-IN', label: 'Indian English (VIP Accent)', region: 'India', sample: 'Namaste and welcome to sujalxsaini VIP stream!' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी Voice)', region: 'India', sample: 'सुजल भाई के स्ट्रीम में आपका स्वागत है!' },
  { code: 'en-US', label: 'US English (Studio Neural)', region: 'United States', sample: 'Welcome to the sujalxsaini squad on Kick!' },
  { code: 'en-GB', label: 'British English (Classic UK)', region: 'United Kingdom', sample: 'Cheers for following sujalxsaini, mate!' },
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
    mode === 'alert-full' ? 22 : mode === 'alert-compact' ? 17 : 21;
  const minSize = mode === 'counter-recent' ? 12 : 10;

  if (len <= 12) return baseMax;
  if (len <= 16) return Math.max(minSize, Math.round(baseMax * 0.88));
  if (len <= 20) return Math.max(minSize, Math.round(baseMax * 0.78));
  if (len <= 25) return Math.max(minSize, Math.round(baseMax * 0.68));
  return Math.max(minSize, Math.round(baseMax * (15 / len)));
}

const EMOJI_WORD_MAP: Record<string, string> = {
  '❤️': 'heart',
  '❤': 'heart',
  '♥️': 'heart',
  '♥': 'heart',
  '💖': 'sparkling heart',
  '💗': 'growing heart',
  '💓': 'beating heart',
  '💞': 'hearts',
  '💕': 'two hearts',
  '💘': 'heart arrow',
  '💝': 'gift heart',
  '🧡': 'orange heart',
  '💛': 'yellow heart',
  '💚': 'green heart',
  '💙': 'blue heart',
  '💜': 'purple heart',
  '🖤': 'black heart',
  '🤍': 'white heart',
  '🤎': 'brown heart',
  '💔': 'broken heart',
  '🫶': 'heart hands',
  '🔥': 'fire',
  '💯': 'one hundred',
  '⚡': 'lightning',
  '💥': 'boom',
  '✨': 'sparkles',
  '🌟': 'glowing star',
  '⭐': 'star',
  '👑': 'crown',
  '🏆': 'trophy',
  '🥇': 'first place',
  '🥈': 'second place',
  '🥉': 'third place',
  '🎮': 'gaming',
  '🕹️': 'joystick',
  '🕹': 'joystick',
  '🎯': 'bullseye',
  '🚀': 'rocket',
  '💎': 'diamond',
  '💰': 'money bag',
  '💵': 'dollar',
  '💸': 'money wings',
  '🪙': 'coin',
  '🎁': 'gift',
  '🎉': 'party',
  '🎊': 'confetti',
  '🎈': 'balloon',
  '🥳': 'party face',
  '😂': 'laughing',
  '🤣': 'rofl',
  '😭': 'crying',
  '😢': 'sad',
  '😊': 'smiling',
  '😁': 'grinning',
  '😄': 'happy',
  '😃': 'happy',
  '😀': 'happy',
  '😉': 'wink',
  '😎': 'cool',
  '🤩': 'star struck',
  '😍': 'heart eyes',
  '🥰': 'loving',
  '😘': 'kiss',
  '🤯': 'mind blown',
  '😱': 'shocked',
  '😳': 'flushed',
  '🥺': 'pleading',
  '😡': 'angry',
  '🤬': 'rage',
  '💀': 'skull',
  '☠️': 'skull',
  '☠': 'skull',
  '👻': 'ghost',
  '🤡': 'clown',
  '💩': 'poop',
  '🫡': 'salute',
  '🤫': 'shush',
  '🤔': 'thinking',
  '😏': 'smirk',
  '🙄': 'eye roll',
  '😴': 'sleeping',
  '🤮': 'puke',
  '🤢': 'sick',
  '🥶': 'cold',
  '🥵': 'hot',
  '😈': 'devil',
  '👿': 'angry devil',
  '😇': 'angel',
  '👍': 'thumbs up',
  '👎': 'thumbs down',
  '👏': 'clap',
  '🙌': 'cheers',
  '🙏': 'namaste',
  '🤝': 'handshake',
  '✌️': 'peace',
  '✌': 'peace',
  '🤞': 'fingers crossed',
  '🤟': 'rock on',
  '🤘': 'rock on',
  '👌': 'okay',
  '🤌': 'pinched fingers',
  '💪': 'flex',
  '👀': 'eyes',
  '👆': 'up',
  '👇': 'down',
  '👉': 'right',
  '👈': 'left',
  '✋': 'high five',
  '👋': 'wave',
  '🐐': 'goat',
  '🦁': 'lion',
  '🐯': 'tiger',
  '🐺': 'wolf',
  '🦊': 'fox',
  '🐻': 'bear',
  '🐼': 'panda',
  '🐸': 'frog',
  '🐍': 'snake',
  '🐉': 'dragon',
  '🦅': 'eagle',
  '🦈': 'shark',
  '🍕': 'pizza',
  '🍔': 'burger',
  '☕': 'coffee',
  '🍺': 'beer',
  '🍻': 'cheers',
  '🥂': 'cheers',
  '🍾': 'champagne',
  '🎵': 'music',
  '🎶': 'music',
  '🎤': 'mic',
  '🎧': 'headphones',
  '🔊': 'speaker',
  '🔔': 'bell',
  '⚠️': 'warning',
  '⚠': 'warning',
  '✅': 'check',
  '❌': 'cross',
  '❓': 'question',
  '❗': 'exclamation',
  '💤': 'sleep',
  '🚩': 'red flag',
  '🇮🇳': 'India',
  '🇺🇸': 'USA',
  '🇬🇧': 'UK',
  '🇵🇰': 'Pakistan',
  '🇧🇩': 'Bangladesh',
  '🇳🇵': 'Nepal',
  '0️⃣': 'zero',
  '1️⃣': 'one',
  '2️⃣': 'two',
  '3️⃣': 'three',
  '4️⃣': 'four',
  '5️⃣': 'five',
  '6️⃣': 'six',
  '7️⃣': 'seven',
  '8️⃣': 'eight',
  '9️⃣': 'nine',
  '🔟': 'ten',
};

const EMOJI_KEYS_SORTED = Object.keys(EMOJI_WORD_MAP).sort((a, b) => b.length - a.length);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EMOJI_REGEX = new RegExp(EMOJI_KEYS_SORTED.map(escapeRegex).join('|'), 'g');

/**
 * Converts emojis inside a message into natural spoken words so neural and
 * multilingual TTS engines speak emojis clearly and never error on emoji-only notes.
 */
export function convertEmojisToSpokenText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // Strip skin-tone modifiers so base hand/face emojis always match cleanly
  let normalized = rawText.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');

  // Replace known emojis with spaced spoken words
  let spoken = normalized.replace(EMOJI_REGEX, (match) => ` ${EMOJI_WORD_MAP[match] || ''} `);

  // Strip any remaining unmapped pictographic emojis / variation selectors / ZWJ so TTS never errors
  spoken = spoken
    .replace(/[\uFE0E\uFE0F\u200D]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Collapse spammy consecutive identical emoji words to at most 3 repetitions
  const tokens = spoken.split(' ');
  const deduped: string[] = [];
  let runWord = '';
  let runCount = 0;
  const emojiWordValues = new Set(Object.values(EMOJI_WORD_MAP));
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (emojiWordValues.has(lower) && lower === runWord) {
      runCount++;
      if (runCount <= 3) {
        deduped.push(token);
      }
    } else {
      runWord = token.toLowerCase();
      runCount = 1;
      deduped.push(token);
    }
  }

  return deduped.join(' ').replace(/\s+([,.!?])/g, '$1').trim();
}

export function formatTtsMessage(template: string, username: string, channelName = 'sujalxsaini'): string {
  const cleanUser = convertEmojisToSpokenText(username || 'KickUser') || (username || 'KickUser').trim();
  const baseTemplate =
    template && template.trim().length > 0
      ? template
      : '{username} started following';
  const raw = baseTemplate
    .replace(/\{username\}/gi, cleanUser)
    .replace(/\{user\}/gi, cleanUser)
    .replace(/\{channel\}/gi, channelName);
  return convertEmojisToSpokenText(raw) || raw.trim();
}

export const PUBLIC_RENDER_ORIGIN = 'https://sujalx-kick-studio.onrender.com';

export function buildLiveObsPermanentUrl(
  origin: string,
  mode: 'alerts' | 'counter' | 'text-alerts'
): string {
  const cleanOrigin = (origin || PUBLIC_RENDER_ORIGIN).replace(/\/+$/, '');
  return `${cleanOrigin}/?obs=${mode}`;
}

export function buildObsAlertUrl(
  origin: string,
  params: {
    template: AlertTemplateId;
    font: FontFamilyName;
    tts: boolean;
    voice: TtsLangCode;
    sfx?: SfxPresetId;
    duration: number;
    rate?: number;
    volume?: number;
  }
): string {
  const cleanOrigin = (origin || PUBLIC_RENDER_ORIGIN).replace(/\/+$/, '');
  const searchParams = new URLSearchParams();
  searchParams.set('obs', 'alerts');
  searchParams.set('template', params.template);
  searchParams.set('font', params.font);
  searchParams.set('tts', params.tts ? '1' : '0');
  searchParams.set('voice', params.voice);
  if (params.sfx && params.sfx !== 'none') {
    searchParams.set('sfx', params.sfx);
  }
  searchParams.set('duration', String(params.duration));
  if (typeof params.rate === 'number' && Number.isFinite(params.rate)) {
    searchParams.set('rate', String(Number(params.rate.toFixed(2))));
  }
  if (typeof params.volume === 'number' && Number.isFinite(params.volume)) {
    searchParams.set('volume', String(Number(params.volume.toFixed(2))));
  }
  return `${cleanOrigin}/?${searchParams.toString()}`;
}

export const TEXT_ALERT_STYLES: {
  id: TextAlertStyle;
  name: string;
  description: string;
  accentHex: string;
}[] = [
  {
    id: 'kinetic-neon',
    name: 'Kinetic Kick Neon',
    description: 'Explosive #53FC18 slam + crisp neon outline drop shadow (zero box)',
    accentHex: '#53FC18',
  },
  {
    id: 'cyber-drop',
    name: 'Cyber Ice Drop',
    description: 'High-velocity cyan laser descent with glowing amount pop (zero box)',
    accentHex: '#00F0FF',
  },
  {
    id: 'gold-impact',
    name: 'Royal Sovereign Gold',
    description: 'Shimmering 24K liquid gold text sweep with luxury glow (zero box)',
    accentHex: '#FFD700',
  },
  {
    id: 'glitch-pulse',
    name: 'Esports Glitch Pulse',
    description: 'Chromatic RGB slice jitter + overdrive kinetic impact (zero box)',
    accentHex: '#FF007A',
  },
];

export interface ParsedKickEventDetails {
  eventType: AlertEventType;
  username: string;
  amount?: number;
  subMessage?: string;
  avatarUrl?: string;
}

function pickFirstUsername(candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === 'object') {
      const obj = candidate as Record<string, unknown>;
      if (typeof obj.username === 'string' && obj.username.trim().length > 0) {
        return obj.username.trim();
      }
      if (typeof obj.slug === 'string' && obj.slug.trim().length > 0) {
        return obj.slug.trim();
      }
    }
  }
  return '';
}

function pickPositiveNumber(candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    const num = typeof c === 'number' ? c : typeof c === 'string' ? Number(c) : NaN;
    if (Number.isFinite(num) && num > 0) {
      return Math.round(num);
    }
  }
  return undefined;
}

function pickNoteString(candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    let text = '';
    if (typeof candidate === 'string') {
      text = candidate.trim();
    } else if (candidate && typeof candidate === 'object') {
      const obj = candidate as Record<string, unknown>;
      if (typeof obj.text === 'string') text = obj.text.trim();
      else if (typeof obj.content === 'string') text = obj.content.trim();
      else if (typeof obj.message === 'string') text = obj.message.trim();
      else if (typeof obj.note === 'string') text = obj.note.trim();
    }
    if (
      text.length > 0 &&
      text.toLowerCase() !== 'null' &&
      text.toLowerCase() !== 'undefined'
    ) {
      return text.slice(0, 140);
    }
  }
  return undefined;
}

export function parseKickEventDetails(eventHeader: string, body: unknown): ParsedKickEventDetails {
  const headerLower = (eventHeader || '').toLowerCase();
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const nestedData =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record;
  const giftObj =
    (record.gift && typeof record.gift === 'object'
      ? (record.gift as Record<string, unknown>)
      : nestedData.gift && typeof nestedData.gift === 'object'
        ? (nestedData.gift as Record<string, unknown>)
        : undefined);

  let eventType: AlertEventType = 'follow';
  if (
    headerLower.includes('subscription.gifts') ||
    headerLower.includes('giftedsubscriptions') ||
    headerLower.includes('sub-gift') ||
    headerLower.includes('sub_gift') ||
    Array.isArray(record.giftees) ||
    Array.isArray(nestedData.giftees)
  ) {
    eventType = 'sub-gift';
  } else if (
    headerLower.includes('kicks') ||
    headerLower.includes('gift') ||
    giftObj ||
    record.kicks !== undefined ||
    nestedData.kicks !== undefined
  ) {
    eventType = 'kicks';
  } else if (
    headerLower.includes('subscription.new') ||
    headerLower.includes('subscription.renewal') ||
    headerLower.includes('subscription') ||
    headerLower.includes('sub-buy') ||
    headerLower.includes('sub_buy')
  ) {
    eventType = 'sub-buy';
  }

  const senderObj =
    (record.sender && typeof record.sender === 'object'
      ? (record.sender as Record<string, unknown>)
      : nestedData.sender && typeof nestedData.sender === 'object'
        ? (nestedData.sender as Record<string, unknown>)
        : undefined);
  const gifterObj =
    (record.gifter && typeof record.gifter === 'object'
      ? (record.gifter as Record<string, unknown>)
      : nestedData.gifter && typeof nestedData.gifter === 'object'
        ? (nestedData.gifter as Record<string, unknown>)
        : undefined);

  const pickedName = pickFirstUsername([
    eventType === 'kicks' ? record.sender : undefined,
    eventType === 'kicks' ? nestedData.sender : undefined,
    eventType === 'sub-gift' ? record.gifter : undefined,
    eventType === 'sub-gift' ? nestedData.gifter : undefined,
    eventType === 'sub-buy' ? record.subscriber : undefined,
    eventType === 'sub-buy' ? nestedData.subscriber : undefined,
    record.follower,
    nestedData.follower,
    record.sender,
    record.gifter,
    record.subscriber,
    record.user,
    nestedData.user,
    record.username,
    nestedData.username,
  ]);
  const isAnon = Boolean(senderObj?.is_anonymous || gifterObj?.is_anonymous);
  const username = pickedName || (isAnon ? 'Anonymous' : extractFollowerUsername(body));

  let amount: number | undefined;
  if (eventType === 'kicks') {
    amount =
      pickPositiveNumber([
        giftObj?.amount,
        giftObj?.gift_amount,
        giftObj?.value,
        giftObj?.quantity,
        record.amount,
        nestedData.amount,
        record.kicks,
        nestedData.kicks,
        record.gift_amount,
        nestedData.gift_amount,
        record.quantity,
        nestedData.quantity,
      ]) || 100;
  } else if (eventType === 'sub-gift') {
    const giftees = Array.isArray(record.giftees)
      ? record.giftees
      : Array.isArray(nestedData.giftees)
        ? nestedData.giftees
        : undefined;
    amount =
      (giftees && giftees.length > 0 ? giftees.length : undefined) ||
      pickPositiveNumber([
        record.quantity,
        nestedData.quantity,
        record.gifts_count,
        nestedData.gifts_count,
        record.gift_count,
        nestedData.gift_count,
        record.sub_count,
        nestedData.sub_count,
        record.amount,
        nestedData.amount,
        giftObj?.amount,
        giftObj?.quantity,
      ]) ||
      1;
  } else if (eventType === 'sub-buy') {
    amount =
      pickPositiveNumber([
        record.duration,
        nestedData.duration,
        record.months,
        nestedData.months,
        record.amount,
        nestedData.amount,
      ]) || 1;
  }

  const subMessage = pickNoteString([
    giftObj?.message,
    giftObj?.note,
    giftObj?.text,
    giftObj?.comment,
    record.subMessage,
    record.sub_message,
    record.message,
    record.note,
    record.giftNote,
    record.gift_note,
    record.giftMessage,
    record.gift_message,
    record.comment,
    record.text,
    nestedData.subMessage,
    nestedData.sub_message,
    nestedData.message,
    nestedData.note,
    nestedData.giftNote,
    nestedData.gift_note,
    nestedData.giftMessage,
    nestedData.gift_message,
    nestedData.comment,
    nestedData.text,
  ]);

  return {
    eventType,
    username,
    amount,
    subMessage,
    avatarUrl: extractFollowerAvatar(body),
  };
}

export function formatEventTtsText(
  eventType: AlertEventType,
  username: string,
  amount?: number,
  customFollowTemplate = '{username} started following',
  channelName = 'sujalxsaini',
  subMessage?: string
): string {
  const rawUser = (username || 'KickVIP').trim() || 'KickVIP';
  const cleanUser = convertEmojisToSpokenText(rawUser) || rawUser;
  const spokenNote = subMessage ? convertEmojisToSpokenText(subMessage) : '';

  let headline = '';
  if (eventType === 'kicks') {
    const kicksAmt = Math.max(1, Math.round(amount || 100));
    headline = `${cleanUser} sent ${kicksAmt} ${kicksAmt === 1 ? 'kick' : 'kicks'}`;
  } else if (eventType === 'sub-gift') {
    const giftCount = Math.max(1, Math.round(amount || 1));
    headline = `${cleanUser} gifted ${giftCount} ${giftCount === 1 ? 'sub' : 'subs'}`;
  } else if (eventType === 'sub-buy') {
    const months = Math.max(1, Math.round(amount || 1));
    headline =
      months > 1
        ? `${cleanUser} subscribed for ${months} months`
        : `${cleanUser} subscribed`;
  } else {
    headline = formatTtsMessage(customFollowTemplate, cleanUser, channelName);
  }

  return spokenNote ? `${headline}. ${spokenNote}` : headline;
}

export function buildObsTextAlertUrl(
  origin: string,
  params: {
    style: TextAlertStyle;
    font: FontFamilyName;
    sfx?: SfxPresetId;
    tts: boolean;
    voice: TtsLangCode;
    duration: number;
    rate?: number;
    volume?: number;
    eventFilter?: TextAlertEventFilter;
    alertId?: string;
  }
): string {
  const cleanOrigin = (origin || PUBLIC_RENDER_ORIGIN).replace(/\/+$/, '');
  const searchParams = new URLSearchParams();
  searchParams.set('obs', 'text-alerts');
  if (params.alertId && params.alertId.trim()) {
    searchParams.set('alertId', params.alertId.trim());
    return `${cleanOrigin}/?${searchParams.toString()}`;
  }
  if (params.eventFilter && params.eventFilter !== 'all') {
    searchParams.set('event', params.eventFilter);
  }
  searchParams.set('style', params.style);
  searchParams.set('font', params.font);
  if (params.sfx) {
    searchParams.set('sfx', params.sfx);
  }
  searchParams.set('tts', params.tts ? '1' : '0');
  searchParams.set('voice', params.voice);
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
    goalId?: string;
  }
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const searchParams = new URLSearchParams();
  searchParams.set('obs', 'counter');
  searchParams.set('template', params.template);
  searchParams.set('font', params.font);
  searchParams.set('showGoal', params.showGoal ? '1' : '0');
  if (params.goalId && params.goalId.trim()) {
    searchParams.set('goalId', params.goalId.trim());
  } else if (typeof params.goal === 'number' && Number.isFinite(params.goal) && params.goal > 0) {
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
  const validSfx: SfxPresetId[] = ['none', 'cyber', 'royal', 'valorant', 'anime', 'glass', 'arcade'];
  const validVoices: TtsLangCode[] = [
    'pro-hype-male',
    'pro-caster-female',
    'pro-vip-narrator',
    'pro-uk-gent',
    'pro-emotional-female',
    'pro-funny-male',
    'pro-aussie-chill',
    'en-IN',
    'hi-IN',
    'en-US',
    'en-GB',
    'ja-JP',
    'es-ES',
  ];
  const validTextStyles: TextAlertStyle[] = ['kinetic-neon', 'cyber-drop', 'gold-impact', 'glitch-pulse'];
  const validEventFilters: TextAlertEventFilter[] = ['all', 'kicks', 'sub-gift', 'sub-buy'];

  const rawTemplate = params.get('template');
  const rawStyle = params.get('style');
  const rawEventFilter = params.get('event');
  const rawFont = params.get('font');
  const rawSfx = params.get('sfx');
  const rawVoice = params.get('voice');
  const rawTts = params.get('tts');
  const rawDuration = params.get('duration');
  const rawRate = params.get('rate');
  const rawVolume = params.get('volume');
  const rawShowGoal = params.get('showGoal');
  const rawGoal = params.get('goal');
  const goalId = params.get('goalId')?.trim() || null;
  const alertId = params.get('alertId')?.trim() || null;

  const eventFilter: TextAlertEventFilter =
    rawEventFilter && validEventFilters.includes(rawEventFilter as TextAlertEventFilter)
      ? (rawEventFilter as TextAlertEventFilter)
      : 'all';

  const alertTemplate: AlertTemplateId =
    rawTemplate && validAlertTemplates.includes(rawTemplate as AlertTemplateId)
      ? (rawTemplate as AlertTemplateId)
      : defaults?.activeAlertTemplate || 'neon';

  const textAlertStyle: TextAlertStyle =
    rawStyle && validTextStyles.includes(rawStyle as TextAlertStyle)
      ? (rawStyle as TextAlertStyle)
      : defaults?.textAlertStyle || 'kinetic-neon';

  const counterTemplate: CounterTemplateId =
    rawTemplate && validCounterTemplates.includes(rawTemplate as CounterTemplateId)
      ? (rawTemplate as CounterTemplateId)
      : defaults?.activeCounterTemplate || 'neon';

  const font: FontFamilyName =
    rawFont && validFonts.includes(rawFont as FontFamilyName)
      ? (rawFont as FontFamilyName)
      : obsMode === 'text-alerts'
        ? defaults?.textAlertFont || 'Bebas Neue'
        : defaults?.selectedFont || 'Orbitron';

  const sfx: SfxPresetId =
    rawSfx && validSfx.includes(rawSfx as SfxPresetId)
      ? (rawSfx as SfxPresetId)
      : obsMode === 'text-alerts'
        ? defaults?.textAlertSfxPreset || 'royal'
        : defaults?.sfxPreset || 'none';

  const voice: TtsLangCode =
    rawVoice && validVoices.includes(rawVoice as TtsLangCode)
      ? (rawVoice as TtsLangCode)
      : defaults?.ttsSettings?.lang || 'pro-hype-male';

  const ttsEnabled =
    rawTts !== null ? rawTts !== '0' && rawTts !== 'false' : (defaults?.ttsSettings?.enabled ?? true);

  const duration =
    rawDuration && Number.isFinite(Number(rawDuration))
      ? Math.min(30, Math.max(2, Number(rawDuration)))
      : obsMode === 'text-alerts'
        ? defaults?.textAlertDuration || 6
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
    obsMode:
      obsMode === 'alerts' || obsMode === 'counter' || obsMode === 'text-alerts'
        ? obsMode
        : null,
    alertTemplate,
    textAlertStyle,
    eventFilter,
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
    goalId,
    alertId,
    hasGoalParam: rawGoal !== null,
    hasTtsParam: rawTts !== null,
    hasStyleParam: Boolean(rawStyle && validTextStyles.includes(rawStyle as TextAlertStyle)),
    hasFontParam: Boolean(rawFont && validFonts.includes(rawFont as FontFamilyName)),
    hasSfxParam: Boolean(rawSfx && validSfx.includes(rawSfx as SfxPresetId)),
    hasTemplateParam: Boolean(rawTemplate),
    previewMode: params.get('preview') === '1',
    autostart: params.get('autostart') === '1',
  };
}

export interface LiveResolvedObsAlertConfig {
  sfxPreset: SfxPresetId;
  template: AlertTemplateId;
  font: FontFamilyName;
  textStyle: TextAlertStyle;
  duration: number;
  ttsEnabled: boolean;
  ttsVoice: TtsLangCode;
  ttsRate: number;
  ttsVolume: number;
}

/**
 * Resolves live OBS overlay config so any OBS link generated previously
 * automatically obeys live dashboard/server settings without needing a new URL,
 * and ensures follow alerts never play alert sound effects.
 */
export function resolveLiveObsAlertConfig(options: {
  search: string;
  eventType: AlertEventType;
  liveSettings?: AppSettings | null;
  alertPayload?: {
    template?: AlertTemplateId;
    font?: FontFamilyName;
    textStyle?: TextAlertStyle;
    sfxPreset?: SfxPresetId;
    duration?: number;
    ttsEnabled?: boolean;
    ttsLang?: TtsLangCode;
  } | null;
  textOnlyMode?: boolean;
}): LiveResolvedObsAlertConfig {
  const { search, eventType, liveSettings, alertPayload, textOnlyMode = false } = options;
  const overrides = parseObsQueryOverrides(search, liveSettings || undefined);
  const isTextAlert = eventType !== 'follow';
  const isTextOnlyChannel = textOnlyMode || overrides.obsMode === 'text-alerts';

  const matchedTextLink =
    isTextOnlyChannel && overrides.alertId
      ? (liveSettings?.textAlertLinkHistory || []).find(
          (item) => item.id === overrides.alertId
        )
      : undefined;

  if (overrides.previewMode) {
    return {
      sfxPreset: isTextAlert ? overrides.sfx : 'none',
      template: overrides.alertTemplate,
      font: overrides.font,
      textStyle: overrides.textAlertStyle,
      duration: overrides.duration,
      ttsEnabled: overrides.ttsEnabled,
      ttsVoice: overrides.voice,
      ttsRate: overrides.rate,
      ttsVolume: overrides.volume,
    };
  }

  if (matchedTextLink) {
    return {
      sfxPreset: matchedTextLink.sfxPreset || liveSettings?.textAlertSfxPreset || 'royal',
      template: liveSettings?.activeAlertTemplate || overrides.alertTemplate,
      font: matchedTextLink.font,
      textStyle: matchedTextLink.style,
      duration: matchedTextLink.duration,
      ttsEnabled: matchedTextLink.ttsEnabled,
      ttsVoice: matchedTextLink.voice,
      ttsRate: matchedTextLink.rate,
      ttsVolume: matchedTextLink.volume,
    };
  }

  if (liveSettings) {
    return {
      sfxPreset: isTextAlert
        ? liveSettings.textAlertSfxPreset || alertPayload?.sfxPreset || overrides.sfx || 'royal'
        : 'none',
      template:
        liveSettings.activeAlertTemplate || alertPayload?.template || overrides.alertTemplate,
      font: isTextAlert
        ? liveSettings.textAlertFont || alertPayload?.font || overrides.font
        : liveSettings.selectedFont || alertPayload?.font || overrides.font,
      textStyle:
        liveSettings.textAlertStyle || alertPayload?.textStyle || overrides.textAlertStyle,
      duration: isTextAlert
        ? liveSettings.textAlertDuration || alertPayload?.duration || overrides.duration || 6
        : liveSettings.alertDuration || alertPayload?.duration || overrides.duration || 7,
      ttsEnabled:
        liveSettings.ttsSettings?.enabled ?? alertPayload?.ttsEnabled ?? overrides.ttsEnabled,
      ttsVoice:
        liveSettings.ttsSettings?.lang || alertPayload?.ttsLang || overrides.voice,
      ttsRate: liveSettings.ttsSettings?.rate ?? overrides.rate ?? 1.0,
      ttsVolume: liveSettings.ttsSettings?.volume ?? overrides.volume ?? 1.0,
    };
  }

  return {
    sfxPreset: isTextAlert ? alertPayload?.sfxPreset || overrides.sfx : 'none',
    template: alertPayload?.template || overrides.alertTemplate,
    font: alertPayload?.font || overrides.font,
    textStyle: alertPayload?.textStyle || overrides.textAlertStyle,
    duration: alertPayload?.duration || overrides.duration,
    ttsEnabled: alertPayload?.ttsEnabled ?? overrides.ttsEnabled,
    ttsVoice: alertPayload?.ttsLang || overrides.voice,
    ttsRate: overrides.rate ?? 1.0,
    ttsVolume: overrides.volume ?? 1.0,
  };
}
