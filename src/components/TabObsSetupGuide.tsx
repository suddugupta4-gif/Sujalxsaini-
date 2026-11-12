import React, { useState } from 'react';
import {
  Copy,
  Check,
  Volume2,
  Monitor,
  Sliders,
  CheckSquare,
  Square,
  ExternalLink,
  Code2,
} from 'lucide-react';
import type { AppSettings, ObsClientCounts, SetupChecklist } from '../types';
import {
  OBS_CUSTOM_CSS,
  PUBLIC_RENDER_ORIGIN,
  buildObsAlertUrl,
  buildObsCounterUrl,
} from '../utils/logic';

interface TabObsSetupGuideProps {
  settings: AppSettings;
  obsCounts: ObsClientCounts;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onFireTestAlert: (customUsername?: string) => Promise<void>;
}

export const TabObsSetupGuide: React.FC<TabObsSetupGuideProps> = ({
  settings,
  obsCounts,
  onUpdateSettings,
  onFireTestAlert,
}) => {
  const [copiedAlerts, setCopiedAlerts] = useState(false);
  const [copiedCounter, setCopiedCounter] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [testSentMessage, setTestSentMessage] = useState('');

  const origin = PUBLIC_RENDER_ORIGIN;

  const alertsUrl = buildObsAlertUrl(origin, {
    template: settings.activeAlertTemplate,
    font: settings.selectedFont,
    tts: settings.ttsSettings.enabled,
    voice: settings.ttsSettings.lang,
    sfx: settings.sfxPreset,
    duration: settings.alertDuration,
    rate: settings.ttsSettings.rate,
    volume: settings.ttsSettings.volume,
  });

  const counterUrl = buildObsCounterUrl(origin, {
    template: settings.activeCounterTemplate,
    font: settings.counterFont || settings.selectedFont,
    showGoal: settings.showGoalOnCounter ?? true,
    goal: settings.followerGoal,
  });

  const toggleStep = (key: keyof SetupChecklist) => {
    onUpdateSettings({
      setupChecklist: {
        ...settings.setupChecklist,
        [key]: !settings.setupChecklist[key],
      },
    });
  };

  const obsSteps: { key: keyof SetupChecklist; label: string }[] = [
    { key: 'obsStep1LinksCopied', label: 'Step 1: Copy Overlay Links' },
    { key: 'obsStep2SourceCreated', label: 'Step 2: Create OBS Browser Source' },
    { key: 'obsStep3DimensionsSet', label: 'Step 3: Set Dimensions & CSS' },
    { key: 'obsStep4AudioControlEnabled', label: 'Step 4: Enable Control Audio via OBS' },
    { key: 'obsStep5MonitorAndOutput', label: 'Step 5: Set Monitor and Output' },
    { key: 'obsStep6VerifiedLive', label: 'Step 6: Verify Live Alert & Voice' },
  ];

  const completedCount = obsSteps.filter(
    (s) => settings.setupChecklist[s.key]
  ).length;

  return (
    <div className="space-y-6">
      {/* Checklist Progress Header */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
              Zero-to-Live OBS Studio Interactive Setup Tutorial
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              6-Step Checklist: From Zero to Hearing Animated TTS in OBS Studio
            </h2>
          </div>
          <div className="text-right font-mono tabular-nums">
            <span className="text-sm font-bold text-[#53FC18]">
              {completedCount} / 6 Steps Completed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {obsSteps.map((step) => {
            const done = settings.setupChecklist[step.key];
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => toggleStep(step.key)}
                className={`p-2.5 rounded-lg border text-left text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  done
                    ? 'bg-[#53FC18]/12 border-[#53FC18]/60 text-white'
                    : 'bg-[#080B11] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {done ? (
                  <CheckSquare className="w-4 h-4 text-[#53FC18] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className="truncate font-medium">{step.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 1: Generate & Copy Your Links */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-[#53FC18] uppercase">
              Step 01
            </span>
            <h3 className="text-lg font-bold text-white">
              Generate & Copy Your Root OBS Overlay Links
            </h3>
          </div>
          <button
            type="button"
            onClick={() => toggleStep('obsStep1LinksCopied')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            {settings.setupChecklist.obsStep1LinksCopied ? (
              <CheckSquare className="w-4 h-4 text-[#53FC18]" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>Mark Done</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                1A. Follower Alert + Animated TTS URL
              </span>
              <span className="text-[11px] font-mono text-[#53FC18]">
                850 × 600 px
              </span>
            </div>
            <input
              type="text"
              readOnly
              aria-label="Follower Alert OBS URL"
              value={alertsUrl}
              className="w-full rounded bg-[#05070B] border border-slate-800 px-3 py-2 text-xs font-mono text-[#53FC18]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(alertsUrl);
                  } catch {
                    // ignore
                  }
                  setCopiedAlerts(true);
                  onUpdateSettings({
                    setupChecklist: {
                      ...settings.setupChecklist,
                      obsStep1LinksCopied: true,
                    },
                  });
                  setTimeout(() => setCopiedAlerts(false), 2000);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs py-2 cursor-pointer"
              >
                {copiedAlerts ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAlerts ? 'Copied Alert URL!' : 'Copy Alert + TTS URL'}</span>
              </button>
              <a
                href={`${alertsUrl}&preview=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-2 border border-slate-700"
              >
                <span>Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                1B. Live Follower Counter + Goal Bar URL
              </span>
              <span className="text-[11px] font-mono text-[#53FC18]">
                550 × 200 px
              </span>
            </div>
            <input
              type="text"
              readOnly
              aria-label="Follower Counter OBS URL"
              value={counterUrl}
              className="w-full rounded bg-[#05070B] border border-slate-800 px-3 py-2 text-xs font-mono text-[#53FC18]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(counterUrl);
                  } catch {
                    // ignore
                  }
                  setCopiedCounter(true);
                  onUpdateSettings({
                    setupChecklist: {
                      ...settings.setupChecklist,
                      obsStep1LinksCopied: true,
                    },
                  });
                  setTimeout(() => setCopiedCounter(false), 2000);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs py-2 cursor-pointer"
              >
                {copiedCounter ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCounter ? 'Copied Counter URL!' : 'Copy Counter URL'}</span>
              </button>
              <a
                href={counterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-2 border border-slate-700"
              >
                <span>Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Steps 2, 3, 4, 5 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 2 & Step 3 */}
        <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-5 h-5 text-[#53FC18]" />
              <h3 className="text-base font-bold text-white">
                Step 02 & 03: Create OBS Browser Source & Set Dimensions
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({
                  setupChecklist: {
                    ...settings.setupChecklist,
                    obsStep2SourceCreated: true,
                    obsStep3DimensionsSet: true,
                  },
                });
              }}
              className="text-xs font-mono text-[#53FC18] hover:underline cursor-pointer"
            >
              Mark Steps 2 & 3 Done
            </button>
          </div>

          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-2 text-xs text-slate-300 font-mono">
            <div className="text-white font-sans font-semibold">
              OBS Studio Navigation Flow (Auto-Transparent — No Custom CSS Needed!):
            </div>
            <div>
              OBS Studio &rarr; Sources Dock &rarr; Click [+] &rarr; Select &ldquo;Browser&rdquo; &rarr; Name it &ldquo;SujalX Kick Alerts&rdquo; &rarr; Paste URL
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
              <div className="rounded bg-[#05070B] border border-slate-800 p-2.5">
                <div className="text-slate-400">Alerts + TTS Size</div>
                <div className="text-sm font-mono font-bold text-[#53FC18]">
                  Width: 850 · Height: 250
                </div>
              </div>
              <div className="rounded bg-[#05070B] border border-slate-800 p-2.5">
                <div className="text-slate-400">Follower Counter Size</div>
                <div className="text-sm font-mono font-bold text-[#53FC18]">
                  Width: 600 · Height: 260
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Code2 className="w-4 h-4 text-[#53FC18]" />
                <span>Optional: How to Add 60FPS Animation Custom CSS in OBS</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(OBS_CUSTOM_CSS);
                  } catch {
                    // ignore
                  }
                  setCopiedCss(true);
                  setTimeout(() => setCopiedCss(false), 2000);
                }}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 shrink-0 cursor-pointer"
              >
                {copiedCss ? 'Copied!' : 'Copy Optional CSS'}
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              Your link is already 100% transparent without CSS. If you want extra 60FPS GPU animation acceleration: <strong className="text-white">1)</strong> Double-click your Browser Source in OBS &rarr; <strong className="text-white">2)</strong> Scroll down to the <strong className="text-[#53FC18]">&ldquo;Custom CSS&rdquo;</strong> box &rarr; <strong className="text-white">3)</strong> Paste this snippet &rarr; <strong className="text-white">4)</strong> Click OK.
            </p>
            <code className="block text-[11px] font-mono text-slate-400 truncate bg-[#05070B] px-2.5 py-1.5 rounded border border-slate-800">
              {OBS_CUSTOM_CSS}
            </code>
          </div>
        </section>

        {/* Step 4 & Step 5: OBS Audio Control & Audio Mixer Monitor and Output */}
        <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-[#53FC18]" />
              <h3 className="text-base font-bold text-white">
                Step 04 & 05: Enable OBS Audio & Hear TTS in Headphones
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({
                  setupChecklist: {
                    ...settings.setupChecklist,
                    obsStep4AudioControlEnabled: true,
                    obsStep5MonitorAndOutput: true,
                  },
                });
              }}
              className="text-xs font-mono text-[#53FC18] hover:underline cursor-pointer"
            >
              Mark Steps 4 & 5 Done
            </button>
          </div>

          {/* Visual Mockup of Browser Source Checkboxes */}
          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-2.5 text-xs">
            <div className="font-semibold text-white">
              Step 04: Inside OBS Browser Source Properties, check both boxes:
            </div>
            <div className="flex items-center gap-2 text-[#53FC18] font-mono bg-[#05070B] px-3 py-2 rounded border border-[#53FC18]/40">
              <span>☑ Control audio via OBS</span>
              <span className="text-slate-400 font-sans ml-auto">
                (Creates dedicated Audio Mixer slider)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#53FC18] font-mono bg-[#05070B] px-3 py-2 rounded border border-slate-800">
              <span>☑ Refresh browser when scene becomes active</span>
            </div>
          </div>

          {/* Visual Diagram of OBS Advanced Audio Properties */}
          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-2 text-xs">
            <div className="font-semibold text-white">
              Step 05: Hear TTS Voice in Your Headphones AND Stream Output:
            </div>
            <p className="text-slate-300 font-mono text-[11px]">
              OBS Audio Mixer &rarr; Click Gear Icon ⚙️ next to &ldquo;SujalX Kick Alerts&rdquo; &rarr; Advanced Audio Properties &rarr; Set Audio Monitoring to{' '}
              <strong className="text-[#53FC18]">&ldquo;Monitor and Output&rdquo;</strong>
            </p>
          </div>
        </section>
      </div>

      {/* Step 6: Live Verification Test */}
      <section className="rounded-xl bg-[#0D131C] border border-[#53FC18]/50 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
            Step 06 · Live OBS Verification Test
          </div>
          <h3 className="text-lg font-bold text-white">
            Confirm Visual Popup & Spoken TTS Voice Inside OBS Studio
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
            <span>
              Alerts Status:{' '}
              <strong className="text-[#53FC18] font-mono">
                {obsCounts.alerts > 0
                  ? `🟢 Connected in OBS (${obsCounts.alerts} active)`
                  : '⚪ Waiting for OBS...'}
              </strong>
            </span>
            <span>·</span>
            <span>
              Counter Status:{' '}
              <strong className="text-[#53FC18] font-mono">
                {obsCounts.counter > 0
                  ? `🟢 Connected in OBS (${obsCounts.counter} active)`
                  : '⚪ Waiting for OBS...'}
              </strong>
            </span>
          </div>
          {testSentMessage && (
            <p className="text-xs font-mono text-[#53FC18] pt-1">
              {testSentMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            await onFireTestAlert('SujalX_OBS_Verified');
            await onUpdateSettings({
              setupChecklist: {
                ...settings.setupChecklist,
                obsStep6VerifiedLive: true,
              },
            });
            setTestSentMessage(
              'Test Alert + TTS dispatched to all connected OBS overlays!'
            );
            setTimeout(() => setTestSentMessage(''), 4000);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-5 py-3 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          <span>Send Test Audio & Alert to OBS Now</span>
        </button>
      </section>
    </div>
  );
};
