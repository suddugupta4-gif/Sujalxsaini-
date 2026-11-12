export type AlertTemplateId = 'neon' | 'gold' | 'esports' | 'glass' | 'anime' | 'holo';
export type CounterTemplateId = 'neon' | 'gold' | 'esports' | 'glass' | 'matrix' | 'holo';

export type FontFamilyName =
  | 'Orbitron'
  | 'Cinzel'
  | 'Chakra Petch'
  | 'Rajdhani'
  | 'Outfit'
  | 'Bebas Neue'
  | 'Syne'
  | 'JetBrains Mono';

export type SfxPresetId = 'cyber' | 'royal' | 'valorant' | 'anime' | 'glass' | 'arcade';

export type TtsLangCode = 'en-IN' | 'hi-IN' | 'en-US' | 'en-GB' | 'ja-JP' | 'es-ES';

export interface TtsSettings {
  enabled: boolean;
  mode: 'stream' | 'browser';
  lang: TtsLangCode;
  messageTemplate: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface RecentFollower {
  id: string;
  username: string;
  timestamp: string;
  source: 'kick-webhook' | 'simulator' | 'test' | 'replay';
  avatarColor?: string;
  avatarUrl?: string;
}

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  username: string;
  status: number;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
}

export interface SetupChecklist {
  obsStep1LinksCopied: boolean;
  obsStep2SourceCreated: boolean;
  obsStep3DimensionsSet: boolean;
  obsStep4AudioControlEnabled: boolean;
  obsStep5MonitorAndOutput: boolean;
  obsStep6VerifiedLive: boolean;
  webhookStep1UrlCopied: boolean;
  webhookStep2AppCreated: boolean;
  webhookStep3SubscribedFollowed: boolean;
  webhookStep4SimulatedTest: boolean;
  webhookStep5RenderDeployed: boolean;
}

export interface ObsClientCounts {
  alerts: number;
  counter: number;
  dashboard: number;
}

export interface AppSettings {
  channelName: string;
  channelUrl: string;
  pin: string;
  followerCount: number;
  followerGoal: number;
  goalTitle: string;
  showGoalOnCounter: boolean;
  alertsPaused: boolean;
  alertsMuted: boolean;
  activeAlertTemplate: AlertTemplateId;
  activeCounterTemplate: CounterTemplateId;
  selectedFont: FontFamilyName;
  counterFont: FontFamilyName;
  alertDuration: number;
  sfxPreset: SfxPresetId;
  customSfxUrl: string;
  customAvatarUrl?: string;
  ttsSettings: TtsSettings;
  recentFollowers: RecentFollower[];
  webhookLogs: WebhookLogEntry[];
  setupChecklist: SetupChecklist;
}

export interface FollowAlertPayload {
  id: string;
  username: string;
  avatarUrl?: string;
  timestamp: string;
  source: 'kick-webhook' | 'simulator' | 'test' | 'replay';
  followerCount: number;
  template?: AlertTemplateId;
  font?: FontFamilyName;
  sfxPreset?: SfxPresetId;
  duration?: number;
  ttsEnabled?: boolean;
  ttsLang?: TtsLangCode;
  ttsMessage?: string;
}

export interface CustomTtsPayload {
  id: string;
  text: string;
  lang: TtsLangCode;
  rate: number;
  pitch: number;
  volume: number;
  timestamp: string;
}
