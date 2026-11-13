export type AlertTemplateId = 'neon' | 'gold' | 'esports' | 'glass' | 'anime' | 'holo';
export type CounterTemplateId = 'neon' | 'gold' | 'esports' | 'glass' | 'matrix' | 'holo';
export type AlertEventType = 'follow' | 'kicks' | 'sub-gift' | 'sub-buy';
export type TextAlertStyle = 'kinetic-neon' | 'cyber-drop' | 'gold-impact' | 'glitch-pulse';
export type TextAlertEventFilter = 'all' | 'kicks' | 'sub-gift' | 'sub-buy';

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

export type TtsLangCode =
  | 'pro-hype-male'
  | 'pro-caster-female'
  | 'pro-vip-narrator'
  | 'pro-uk-gent'
  | 'pro-emotional-female'
  | 'pro-funny-male'
  | 'pro-aussie-chill'
  | 'en-IN'
  | 'hi-IN'
  | 'en-US'
  | 'en-GB'
  | 'ja-JP'
  | 'es-ES';

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
  eventType?: AlertEventType;
  amount?: number;
  subMessage?: string;
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

export interface GoalLinkHistoryItem {
  id: string;
  label: string;
  url: string;
  goal: number;
  goalTitle: string;
  template: CounterTemplateId;
  font: FontFamilyName;
  showGoal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TextAlertLinkHistoryItem {
  id: string;
  label: string;
  url: string;
  eventFilter: TextAlertEventFilter;
  style: TextAlertStyle;
  font: FontFamilyName;
  sfxPreset?: SfxPresetId;
  duration: number;
  ttsEnabled: boolean;
  voice: TtsLangCode;
  rate: number;
  volume: number;
  createdAt: string;
  updatedAt: string;
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
  textAlertFont?: FontFamilyName;
  textAlertStyle?: TextAlertStyle;
  textAlertDuration?: number;
  textAlertSfxPreset?: SfxPresetId;
  alertDuration: number;
  sfxPreset: SfxPresetId;
  customSfxUrl: string;
  customAvatarUrl?: string;
  ttsSettings: TtsSettings;
  recentFollowers: RecentFollower[];
  webhookLogs: WebhookLogEntry[];
  goalLinkHistory?: GoalLinkHistoryItem[];
  textAlertLinkHistory?: TextAlertLinkHistoryItem[];
  setupChecklist: SetupChecklist;
}

export interface FollowAlertPayload {
  id: string;
  eventType?: AlertEventType;
  amount?: number;
  subMessage?: string;
  textStyle?: TextAlertStyle;
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
