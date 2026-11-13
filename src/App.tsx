import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  BellRing,
  Flame,
  MonitorPlay,
  PartyPopper,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Lock,
  ExternalLink,
  Webhook,
  Zap,
} from 'lucide-react';
import type {
  AlertEventType,
  AppSettings,
  FollowAlertPayload,
  ObsClientCounts,
  WebhookLogEntry,
} from './types';
import {
  formatEventTtsText,
  parseObsQueryOverrides,
} from './utils/logic';
import {
  playSynthesizedSfx,
  playMilestoneFanfare,
  prepareTtsAudio,
  stopActiveSpeech,
} from './utils/soundEngine';
import { ObsAlertsOverlay } from './components/ObsAlertsOverlay';
import { ObsCounterOverlay } from './components/ObsCounterOverlay';
import { PinLockScreen } from './components/PinLockScreen';
import { TabAlertStudio } from './components/TabAlertStudio';
import { TabKicksSubsStudio } from './components/TabKicksSubsStudio';
import { TabCounterStudio } from './components/TabCounterStudio';
import { TabWebhookSetup } from './components/TabWebhookSetup';
import { TabObsSetupGuide } from './components/TabObsSetupGuide';
import { TabVipToolsFeed } from './components/TabVipToolsFeed';
import { AlertCardRenderer } from './components/AlertCardTemplates';
import { TextOnlyAlert } from './components/TextOnlyAlert';

type DashboardTabId =
  | 'alerts'
  | 'kicks-subs'
  | 'counter'
  | 'webhook'
  | 'obs-guide'
  | 'vip-tools';

const FALLBACK_SETTINGS: AppSettings = {
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
  recentFollowers: [],
  webhookLogs: [],
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

export default function App() {
  // 1. Foolproof Root Query-Parameter Overlay Routing
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const queryInfo = parseObsQueryOverrides(search);

  if (queryInfo.obsMode === 'alerts') {
    return <ObsAlertsOverlay />;
  }

  if (queryInfo.obsMode === 'text-alerts') {
    return <ObsAlertsOverlay textOnlyMode />;
  }

  if (queryInfo.obsMode === 'counter') {
    return <ObsCounterOverlay />;
  }

  return <StreamerDashboard autostart={queryInfo.autostart} />;
}

function StreamerDashboard({ autostart }: { autostart: boolean }) {
  const [settings, setSettings] = useState<AppSettings>(FALLBACK_SETTINGS);
  const [obsCounts, setObsCounts] = useState<ObsClientCounts>({
    alerts: 0,
    counter: 0,
    dashboard: 1,
  });
  const [activeTab, setActiveTab] = useState<DashboardTabId>('alerts');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (autostart) return true;
    try {
      return sessionStorage.getItem('sujalx_vip_unlocked') === '1';
    } catch {
      return false;
    }
  });
  const [bannerStatus, setBannerStatus] = useState<string>('');
  const [previewUsername, setPreviewUsername] = useState<string>('RohanGamingIN');
  const [liveDashboardAlert, setLiveDashboardAlert] =
    useState<FollowAlertPayload | null>(null);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
        if (data?.obsCounts) setObsCounts(data.obsCounts);
      })
      .catch(() => {});

    const es = new EventSource('/api/events?client=dashboard');
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, data } = parsed;
        if (type === 'STATE_INIT') {
          if (data.settings) setSettings(data.settings);
          if (data.obsCounts) setObsCounts(data.obsCounts);
        } else if (type === 'SETTINGS_UPDATED') {
          setSettings(data);
        } else if (type === 'OBS_STATUS_CHANGED') {
          setObsCounts(data);
        } else if (type === 'FOLLOW_ALERT') {
          const alert = data as FollowAlertPayload;
          if (alert.source === 'kick-webhook' || alert.source === 'simulator') {
            setLiveDashboardAlert(alert);
            setPreviewUsername(alert.username);
            setTimeout(() => {
              setLiveDashboardAlert((curr) =>
                curr?.id === alert.id ? null : curr
              );
            }, (alert.duration || 7) * 1000);
          }
        } else if (type === 'WEBHOOK_RECEIVED') {
          const log = data as WebhookLogEntry;
          setSettings((prev) => ({
            ...prev,
            webhookLogs: [
              log,
              ...prev.webhookLogs.filter((l) => l.id !== log.id).slice(0, 39),
            ],
          }));
          setBannerStatus(
            `Incoming Kick Follow: ${log.username} followed sujalxsaini!`
          );
          setTimeout(() => setBannerStatus(''), 5000);
        } else if (type === 'MILESTONE_REACHED') {
          try {
            confetti({
              particleCount: 90,
              spread: 90,
              origin: { y: 0.6 },
              colors: ['#53FC18', '#FFD700', '#00F0FF', '#FF0055'],
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      es.close();
    };
  }, []);

  const handleUnlock = () => {
    try {
      sessionStorage.setItem('sujalx_vip_unlocked', '1');
    } catch {
      // ignore
    }
    setIsUnlocked(true);
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem('sujalx_vip_unlocked');
    } catch {
      // ignore
    }
    setIsUnlocked(false);
  };

  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
      ttsSettings: {
        ...prev.ttsSettings,
        ...(partial.ttsSettings || {}),
      },
      setupChecklist: {
        ...prev.setupChecklist,
        ...(partial.setupChecklist || {}),
      },
    }));

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (json?.settings) {
        setSettings(json.settings);
      }
    } catch {
      // ignore
    }
  };

  const handleAdjustCounter = async (payload: {
    delta?: number;
    exactCount?: number;
    exactGoal?: number;
    goalTitle?: string;
  }) => {
    try {
      const res = await fetch('/api/counter-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.settings) {
        setSettings(json.settings);
      }
    } catch {
      // ignore
    }
  };

  const handleFireTestAlert = async (
    customUsername?: string,
    eventOptions?: {
      eventType?: AlertEventType;
      amount?: number;
      subMessage?: string;
    }
  ) => {
    const targetUsername =
      customUsername?.trim() || previewUsername.trim() || 'RohanGamingIN';
    const eventType: AlertEventType = eventOptions?.eventType || 'follow';
    const amount = eventOptions?.amount;
    const subMessage = eventOptions?.subMessage;

    try {
      const msgText = formatEventTtsText(
        eventType,
        targetUsername,
        amount,
        settings.ttsSettings.messageTemplate,
        settings.channelName,
        subMessage
      );

      // Pre-prepare TTS audio in parallel with /api/test-alert so local voice fires at 0ms
      const ttsPreparePromise =
        !settings.alertsMuted && settings.ttsSettings.enabled
          ? prepareTtsAudio({
              text: msgText,
              lang: settings.ttsSettings.lang,
              mode: settings.ttsSettings.mode,
              rate: settings.ttsSettings.rate,
              pitch: settings.ttsSettings.pitch,
              volume: settings.ttsSettings.volume,
              muted: settings.alertsMuted,
            })
          : Promise.resolve(null);

      const res = await fetch('/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername,
          eventType,
          amount,
          subMessage,
        }),
      });
      const json = await res.json();
      if (json?.settings) {
        setSettings(json.settings);
      }
      const alertData = json?.alert as FollowAlertPayload | undefined;
      const finalMsg = alertData?.ttsMessage || msgText;

      setBannerStatus(
        `Fired Exact-Time Alert + TTS: "${finalMsg}" → sent to OBS!`
      );
      setTimeout(() => setBannerStatus(''), 3500);

      try {
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.65 },
          colors: ['#53FC18', '#FFD700', '#00F0FF'],
        });
      } catch {
        // ignore
      }

      if (!settings.alertsMuted) {
        if (eventType !== 'follow') {
          await playSynthesizedSfx(
            settings.textAlertSfxPreset || 'royal',
            settings.customSfxUrl,
            settings.alertsMuted
          ).catch(() => {});
        }
        const prepared = await ttsPreparePromise;
        prepared?.playNow();
      }
    } catch {
      // ignore
    }
  };

  const handleTriggerMilestone = async () => {
    try {
      await fetch('/api/milestone', { method: 'POST' });
      playMilestoneFanfare(settings.alertsMuted);
      setBannerStatus('Triggered Full-Screen Milestone Confetti & Fanfare in OBS!');
      setTimeout(() => setBannerStatus(''), 3500);
    } catch {
      // ignore
    }
  };

  const handleQueueControl = async (
    action:
      | 'pause'
      | 'resume'
      | 'toggle-pause'
      | 'mute'
      | 'unmute'
      | 'toggle-mute'
      | 'skip'
      | 'clear-logs'
  ) => {
    if (action === 'skip') {
      stopActiveSpeech();
    }
    try {
      const res = await fetch('/api/queue-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json?.settings) {
        setSettings(json.settings);
      }
    } catch {
      // ignore
    }
  };

  const handleReplayAlert = async (
    username: string,
    opts?: { eventType?: AlertEventType; amount?: number; subMessage?: string }
  ) => {
    try {
      await fetch('/api/replay-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          eventType: opts?.eventType,
          amount: opts?.amount,
          subMessage: opts?.subMessage,
        }),
      });
      setBannerStatus(`Replayed VIP Alert + TTS for "${username}"!`);
      setTimeout(() => setBannerStatus(''), 3000);
    } catch {
      // ignore
    }
  };

  if (!isUnlocked) {
    return (
      <PinLockScreen
        expectedPin={settings.pin || '1234'}
        onUnlock={handleUnlock}
      />
    );
  }

  const navItems: {
    id: DashboardTabId;
    label: string;
    badge?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'alerts',
      label: 'Alert Studio',
      icon: <BellRing className="w-3.5 h-3.5" />,
    },
    {
      id: 'kicks-subs',
      label: 'Kicks & Subs',
      badge: settings.textAlertLinkHistory?.length
        ? String(settings.textAlertLinkHistory.length)
        : undefined,
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'counter',
      label: 'Follower Goal',
      badge: settings.goalLinkHistory?.length
        ? String(settings.goalLinkHistory.length)
        : undefined,
      icon: <Target className="w-3.5 h-3.5" />,
    },
    {
      id: 'webhook',
      label: 'Kick Webhooks',
      icon: <Webhook className="w-3.5 h-3.5" />,
    },
    {
      id: 'obs-guide',
      label: 'OBS Guide',
      icon: <MonitorPlay className="w-3.5 h-3.5" />,
    },
    {
      id: 'vip-tools',
      label: 'VIP Tools & Feed',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 flex flex-col">
      {/* Clean Top Brand & Live Channel Status Bar */}
      <header className="px-6 py-3.5 border-b border-slate-800/90 bg-[#0B0F17]/95 backdrop-blur">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <a
              href="/"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
              className="text-lg font-extrabold tracking-wide text-[#53FC18] whitespace-nowrap shrink-0"
            >
              SujalX Kick Studio
            </a>

            <a
              href="https://kick.com/sujalxsaini"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#111824] border border-slate-800 px-2.5 py-1 text-xs font-mono font-semibold text-slate-200 hover:text-[#53FC18] hover:border-[#53FC18]/40 transition-colors"
            >
              <span>kick.com/sujalxsaini</span>
              <ExternalLink className="w-3 h-3 text-[#53FC18]" />
            </a>

            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#0D1610] border border-[#53FC18]/30 px-2.5 py-1 text-xs font-mono tabular-nums text-slate-300">
              <span>Followers:</span>
              <strong className="text-[#53FC18]">
                {settings.followerCount.toLocaleString()}
              </strong>
              <span className="text-slate-500">/</span>
              <span>{settings.followerGoal.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-[#101622] border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300"
              data-testid="obs-alerts-status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  obsCounts.alerts > 0 ? 'bg-[#53FC18]' : 'bg-slate-600'
                }`}
              />
              <span>OBS Alerts ({obsCounts.alerts})</span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-[#101622] border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300"
              data-testid="obs-counter-status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  obsCounts.counter > 0 ? 'bg-[#53FC18]' : 'bg-slate-600'
                }`}
              />
              <span>OBS Counter ({obsCounts.counter})</span>
            </span>

            <button
              type="button"
              onClick={() => handleFireTestAlert()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-[#53FC18] hover:bg-[#45d912] rounded-lg shadow-[0_0_16px_rgba(83,252,24,0.22)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Fire Test Alert + TTS</span>
            </button>

            <button
              type="button"
              onClick={handleLock}
              aria-label="Lock VIP Dashboard"
              className="inline-flex items-center gap-1 rounded-lg bg-[#101622] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dedicated All-Section Selection Buttons + Compact Stream Deck Controls */}
      <div className="bg-[#090D14] border-b border-slate-800/80 px-6 py-3">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Clear Interactive Buttons for All Sections */}
          <nav
            aria-label="All Section Selection"
            data-testid="section-selector-bar"
            className="flex flex-wrap items-center gap-2"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? item.id === 'kicks-subs'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.28)]'
                        : 'bg-[#53FC18] text-slate-950 border-[#53FC18] shadow-[0_0_18px_rgba(83,252,24,0.28)]'
                      : 'bg-[#101622] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white hover:bg-[#151D2C]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-800 text-[#53FC18]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Stream Deck Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerMilestone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/12 hover:bg-amber-400/20 border border-amber-400/35 text-amber-300 text-xs font-bold px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Milestone</span>
            </button>

            <button
              type="button"
              onClick={() => handleQueueControl('toggle-pause')}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3 py-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.alertsPaused
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-[#101622] hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              {settings.alertsPaused ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              <span>{settings.alertsPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQueueControl('skip')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#101622] hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </button>

            <button
              type="button"
              onClick={() => handleQueueControl('toggle-mute')}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3 py-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.alertsMuted
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-[#101622] hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              {settings.alertsMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{settings.alertsMuted ? 'Muted' : 'Audio On'}</span>
            </button>
          </div>
        </div>
      </div>

      {settings.alertsPaused && (
        <div
          role="alert"
          className="bg-amber-500/20 border-b border-amber-400/60 px-6 py-2.5 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-amber-200"
        >
          <span>
            ⚠️ Alert Queue is currently <strong>PAUSED</strong> — real Kick follow alerts will wait until resumed.
          </span>
          <button
            type="button"
            onClick={() => handleQueueControl('resume')}
            className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer"
          >
            Resume Alerts Now
          </button>
        </div>
      )}

      {bannerStatus && (
        <div
          role="status"
          className="bg-[#53FC18]/15 border-b border-[#53FC18]/40 px-6 py-2 text-center text-xs font-mono text-[#53FC18]"
        >
          {bannerStatus}
        </div>
      )}

      {liveDashboardAlert && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none max-w-md w-full px-4">
          {liveDashboardAlert.eventType &&
          liveDashboardAlert.eventType !== 'follow' ? (
            <TextOnlyAlert
              eventType={liveDashboardAlert.eventType}
              username={liveDashboardAlert.username}
              amount={liveDashboardAlert.amount}
              subMessage={liveDashboardAlert.subMessage}
              font={
                liveDashboardAlert.font ||
                settings.textAlertFont ||
                'Bebas Neue'
              }
              stylePreset={
                liveDashboardAlert.textStyle ||
                settings.textAlertStyle ||
                'kinetic-neon'
              }
              compact={true}
            />
          ) : (
            <AlertCardRenderer
              template={liveDashboardAlert.template || settings.activeAlertTemplate}
              font={liveDashboardAlert.font || settings.selectedFont}
              username={liveDashboardAlert.username}
              avatarUrl={liveDashboardAlert.avatarUrl || settings.customAvatarUrl}
              ttsMessage={liveDashboardAlert.ttsMessage}
              isSpeaking={true}
              compact={true}
            />
          )}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8">
        {activeTab === 'alerts' && (
          <TabAlertStudio
            settings={settings}
            obsCounts={obsCounts}
            previewUsername={previewUsername}
            onPreviewUsernameChange={setPreviewUsername}
            onUpdateSettings={handleUpdateSettings}
            onFireTestAlert={handleFireTestAlert}
            onOpenKicksSubsTab={() => setActiveTab('kicks-subs')}
          />
        )}

        {activeTab === 'kicks-subs' && (
          <TabKicksSubsStudio
            settings={settings}
            obsCounts={obsCounts}
            previewUsername={previewUsername}
            onPreviewUsernameChange={setPreviewUsername}
            onUpdateSettings={handleUpdateSettings}
            onFireTestAlert={handleFireTestAlert}
          />
        )}

        {activeTab === 'counter' && (
          <TabCounterStudio
            settings={settings}
            obsCounts={obsCounts}
            previewUsername={previewUsername}
            onPreviewUsernameChange={setPreviewUsername}
            onUpdateSettings={handleUpdateSettings}
            onAdjustCounter={handleAdjustCounter}
            onTriggerMilestone={handleTriggerMilestone}
          />
        )}

        {activeTab === 'webhook' && (
          <TabWebhookSetup
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClearLogs={() => handleQueueControl('clear-logs')}
          />
        )}

        {activeTab === 'obs-guide' && (
          <TabObsSetupGuide
            settings={settings}
            obsCounts={obsCounts}
            onUpdateSettings={handleUpdateSettings}
            onFireTestAlert={handleFireTestAlert}
          />
        )}

        {activeTab === 'vip-tools' && (
          <TabVipToolsFeed
            settings={settings}
            onReplayAlert={handleReplayAlert}
          />
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-6 text-xs text-slate-400">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            SujalX Kick Studio · Private VIP OBS Alert, Animated TTS & Webhook Suite for sujalxsaini
          </span>
          <a
            href="https://kick.com/sujalxsaini"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#53FC18] hover:underline font-mono"
          >
            https://kick.com/sujalxsaini
          </a>
        </div>
      </footer>
    </div>
  );
}
