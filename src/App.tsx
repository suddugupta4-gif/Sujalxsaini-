import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  PartyPopper,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
  Lock,
  ExternalLink,
} from 'lucide-react';
import type {
  AppSettings,
  FollowAlertPayload,
  ObsClientCounts,
  WebhookLogEntry,
} from './types';
import { parseObsQueryOverrides, formatTtsMessage } from './utils/logic';
import {
  playSynthesizedSfx,
  playMilestoneFanfare,
  speakAlertTts,
  stopActiveSpeech,
} from './utils/soundEngine';
import { ObsAlertsOverlay } from './components/ObsAlertsOverlay';
import { ObsCounterOverlay } from './components/ObsCounterOverlay';
import { PinLockScreen } from './components/PinLockScreen';
import { TabAlertStudio } from './components/TabAlertStudio';
import { TabCounterStudio } from './components/TabCounterStudio';
import { TabWebhookSetup } from './components/TabWebhookSetup';
import { TabObsSetupGuide } from './components/TabObsSetupGuide';
import { TabVipToolsFeed } from './components/TabVipToolsFeed';
import { AlertCardRenderer } from './components/AlertCardTemplates';

type DashboardTabId =
  | 'alerts'
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
  recentFollowers: [],
  webhookLogs: [],
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

  const handleFireTestAlert = async (customUsername?: string) => {
    const targetUsername =
      customUsername?.trim() || previewUsername.trim() || 'RohanGamingIN';
    try {
      const res = await fetch('/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      });
      const json = await res.json();
      if (json?.settings) {
        setSettings(json.settings);
      }
      const alertData = json?.alert as FollowAlertPayload | undefined;
      setBannerStatus(
        `Fired Test Alert + TTS: "${targetUsername} started following" → sent to OBS!`
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
        await playSynthesizedSfx(
          settings.sfxPreset,
          settings.customSfxUrl,
          settings.alertsMuted
        );
        if (settings.ttsSettings.enabled) {
          const msg =
            alertData?.ttsMessage ||
            formatTtsMessage(
              settings.ttsSettings.messageTemplate,
              targetUsername,
              settings.channelName
            );
          speakAlertTts({
            text: msg,
            lang: settings.ttsSettings.lang,
            mode: settings.ttsSettings.mode,
            rate: settings.ttsSettings.rate,
            pitch: settings.ttsSettings.pitch,
            volume: settings.ttsSettings.volume,
            muted: settings.alertsMuted,
          });
        }
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

  const handleReplayAlert = async (username: string) => {
    try {
      await fetch('/api/replay-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
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

  const navItems: { id: DashboardTabId; label: string }[] = [
    { id: 'alerts', label: 'Alert Studio' },
    { id: 'counter', label: 'Counters & Goals' },
    { id: 'webhook', label: 'Kick Webhook Setup' },
    { id: 'obs-guide', label: 'OBS Setup Guide' },
    { id: 'vip-tools', label: 'VIP Tools & Feed' },
  ];

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark — 5 Single-Line Nav Links — 1 Primary Action) */}
      <header className="flex flex-wrap items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0B0F17]">
        <a
          href="/"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
          className="text-lg font-extrabold tracking-wide text-[#53FC18] whitespace-nowrap shrink-0"
        >
          SujalX Kick Studio
        </a>

        <nav
          aria-label="Primary Studio Navigation"
          className="flex items-center gap-6 overflow-x-auto text-sm font-medium text-slate-300"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  isActive
                    ? 'text-[#53FC18] border-[#53FC18] font-semibold'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleFireTestAlert()}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-[#53FC18] hover:bg-[#45d912] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fire Test Alert + TTS
          </button>
        </div>
      </header>

      {/* Live Stream Deck Control Strip below Header */}
      <div className="bg-[#0A0E15] border-b border-slate-800/80 px-6 py-3">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Channel Info & Real-Time OBS Connection Telemetry */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href="https://kick.com/sujalxsaini"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono font-bold text-white hover:text-[#53FC18] transition-colors"
            >
              <span>kick.com/sujalxsaini</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#53FC18]" />
            </a>
            <span className="text-slate-600">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              Followers:{' '}
              <strong className="text-[#53FC18]">
                {settings.followerCount.toLocaleString()}
              </strong>{' '}
              / {settings.followerGoal.toLocaleString()}
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-slate-300" data-testid="obs-alerts-status">
              {obsCounts.alerts > 0
                ? `🟢 OBS Alerts (${obsCounts.alerts} active)`
                : '⚪ OBS Alerts (0 active)'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-slate-300" data-testid="obs-counter-status">
              {obsCounts.counter > 0
                ? `🟢 OBS Counter (${obsCounts.counter} active)`
                : '⚪ OBS Counter (0 active)'}
            </span>
          </div>

          {/* Right: Stream Deck Quick Controls (Milestone, Pause, Skip, Mute, Lock) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleFireTestAlert()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#53FC18]/15 hover:bg-[#53FC18]/25 border border-[#53FC18]/50 text-[#53FC18] text-xs font-bold px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Test Alert + TTS</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerMilestone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Trigger Milestone Confetti</span>
            </button>

            <button
              type="button"
              onClick={() => handleQueueControl('toggle-pause')}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3 py-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.alertsPaused
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {settings.alertsPaused ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              <span>{settings.alertsPaused ? 'Resume Queue' : 'Pause Queue'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQueueControl('skip')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip Alert</span>
            </button>

            <button
              type="button"
              onClick={() => handleQueueControl('toggle-mute')}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3 py-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.alertsMuted
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {settings.alertsMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{settings.alertsMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
            </button>

            <button
              type="button"
              onClick={handleLock}
              aria-label="Lock VIP Dashboard"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
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
          <AlertCardRenderer
            template={liveDashboardAlert.template || settings.activeAlertTemplate}
            font={liveDashboardAlert.font || settings.selectedFont}
            username={liveDashboardAlert.username}
            avatarUrl={liveDashboardAlert.avatarUrl || settings.customAvatarUrl}
            ttsMessage={liveDashboardAlert.ttsMessage}
            isSpeaking={true}
            compact={true}
          />
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
