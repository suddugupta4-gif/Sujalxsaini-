import React, { useRef, useState } from 'react';
import {
  Flame,
  Volume2,
  Zap,
  Music,
  Type,
  Check,
  Sparkles,
  Play,
  UserCheck,
  Copy,
  Save,
  Link2,
} from 'lucide-react';
import type {
  AlertTemplateId,
  AppSettings,
  FontFamilyName,
  ObsClientCounts,
  SfxPresetId,
  TtsLangCode,
} from '../types';
import {
  GOOGLE_FONTS,
  PUBLIC_RENDER_ORIGIN,
  TTS_LANGUAGES,
  buildObsAlertUrl,
  formatTtsMessage,
} from '../utils/logic';
import {
  SFX_PRESET_INFO,
  playSynthesizedSfx,
  speakAlertTts,
} from '../utils/soundEngine';
import { ALERT_TEMPLATES, AlertCardRenderer } from './AlertCardTemplates';
import { ObsLinkGeneratorPanel } from './ObsLinkGeneratorModal';

interface TabAlertStudioProps {
  settings: AppSettings;
  obsCounts: ObsClientCounts;
  previewUsername: string;
  onPreviewUsernameChange: (name: string) => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onFireTestAlert: (customUsername?: string) => Promise<void>;
}

const SAMPLE_PREVIEW_USERNAMES = [
  'RohanGamingIN',
  'AaravSniper_IN',
  'ApexValkyrie',
  'SujalVIP_Legend',
  'SujalX_Ultimate_Pro_Legend_VIP',
];

export const TabAlertStudio: React.FC<TabAlertStudioProps> = ({
  settings,
  obsCounts,
  previewUsername,
  onPreviewUsernameChange,
  onUpdateSettings,
  onFireTestAlert,
}) => {
  const [isSpeakingPreview, setIsSpeakingPreview] = useState(false);
  const [highlightedGeneratorTemplate, setHighlightedGeneratorTemplate] =
    useState<AlertTemplateId>(settings.activeAlertTemplate);
  const [savedSingleLinkBanner, setSavedSingleLinkBanner] = useState(false);
  const [copiedInlineLink, setCopiedInlineLink] = useState(false);
  const linkGeneratorRef = useRef<HTMLDivElement | null>(null);

  const origin = PUBLIC_RENDER_ORIGIN;

  const generatedAlertUrl = buildObsAlertUrl(origin, {
    template: settings.activeAlertTemplate,
    font: settings.selectedFont,
    tts: settings.ttsSettings.enabled,
    voice: settings.ttsSettings.lang,
    sfx: settings.sfxPreset,
    duration: settings.alertDuration,
    rate: settings.ttsSettings.rate,
    volume: settings.ttsSettings.volume,
  });

  const activeTemplateMeta =
    ALERT_TEMPLATES.find((t) => t.id === settings.activeAlertTemplate) ||
    ALERT_TEMPLATES[0];

  const activeSfxMeta =
    SFX_PRESET_INFO.find((s) => s.id === settings.sfxPreset) ||
    SFX_PRESET_INFO[0];

  const activeVoiceMeta =
    TTS_LANGUAGES.find((l) => l.code === settings.ttsSettings.lang) ||
    TTS_LANGUAGES[0];

  const activeUserDisplay = previewUsername.trim() || 'SujalVIP_Legend';

  const previewTtsMessage = formatTtsMessage(
    settings.ttsSettings.messageTemplate,
    activeUserDisplay,
    settings.channelName
  );

  const handleSelectAndGenerateLink = async (
    templateId: AlertTemplateId,
    defaultFont?: FontFamilyName
  ) => {
    setHighlightedGeneratorTemplate(templateId);
    await onUpdateSettings({
      activeAlertTemplate: templateId,
      ...(defaultFont ? { selectedFont: defaultFont } : {}),
    });
    setSavedSingleLinkBanner(true);
    linkGeneratorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSaveAllAndGenerateSingleLink = async () => {
    setHighlightedGeneratorTemplate(settings.activeAlertTemplate);
    await onUpdateSettings({
      activeAlertTemplate: settings.activeAlertTemplate,
      selectedFont: settings.selectedFont,
      sfxPreset: settings.sfxPreset,
      alertDuration: settings.alertDuration,
      ttsSettings: {
        ...settings.ttsSettings,
      },
      setupChecklist: {
        ...settings.setupChecklist,
        obsStep1LinksCopied: true,
      },
    });
    try {
      await navigator.clipboard.writeText(generatedAlertUrl);
      setCopiedInlineLink(true);
      setTimeout(() => setCopiedInlineLink(false), 3000);
    } catch {
      // clipboard fallback
    }
    setSavedSingleLinkBanner(true);
  };

  const handleCopySingleLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedAlertUrl);
    } catch {
      // ignore
    }
    setCopiedInlineLink(true);
    await onUpdateSettings({
      setupChecklist: {
        ...settings.setupChecklist,
        obsStep1LinksCopied: true,
      },
    });
    setTimeout(() => setCopiedInlineLink(false), 2500);
  };

  const handleLocalVoicePreview = async () => {
    await playSynthesizedSfx(
      settings.sfxPreset,
      settings.customSfxUrl,
      settings.alertsMuted
    );
    if (settings.ttsSettings.enabled) {
      await speakAlertTts({
        text: previewTtsMessage,
        lang: settings.ttsSettings.lang,
        mode: settings.ttsSettings.mode,
        rate: settings.ttsSettings.rate,
        pitch: settings.ttsSettings.pitch,
        volume: settings.ttsSettings.volume,
        muted: settings.alertsMuted,
        onStart: () => setIsSpeakingPreview(true),
        onEnd: () => setIsSpeakingPreview(false),
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Live Interactive Alert + Equalizer Preview Stage */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="text-xs font-mono text-[#53FC18] uppercase tracking-wider">
              Interactive Stage Preview · Real-Time Rectangle VFX Alert + Animated TTS
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {activeTemplateMeta.name} ({settings.selectedFont})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <UserCheck className="w-3.5 h-3.5 text-[#53FC18] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Preview Follower Username"
                value={previewUsername}
                onChange={(e) => onPreviewUsernameChange(e.target.value)}
                placeholder="Type Username to Preview..."
                className="rounded-lg bg-[#070A0F] border border-slate-700 pl-8 pr-3 py-2 text-xs font-mono text-[#53FC18] font-bold focus:outline-none focus:border-[#53FC18] w-52"
              />
            </div>
            <button
              type="button"
              onClick={handleLocalVoicePreview}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2 border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-[#53FC18]" />
              <span>Preview Audio + Equalizer</span>
            </button>
            <button
              type="button"
              onClick={() => onFireTestAlert(activeUserDisplay)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-4 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Send Live to OBS Now</span>
            </button>
          </div>
        </div>

        {/* Spacious Non-Clipping Preview Stage */}
        <div className="rounded-xl bg-[#05080D] border border-slate-800/80 px-4 py-8 sm:px-6 sm:py-10 flex flex-col items-center justify-center">
          <AlertCardRenderer
            template={settings.activeAlertTemplate}
            font={settings.selectedFont}
            username={activeUserDisplay}
            avatarUrl={settings.customAvatarUrl}
            ttsMessage={previewTtsMessage}
            isSpeaking={isSpeakingPreview}
          />

          {/* Quick Sample Username Presets + Optional Custom PFP URL */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400">Test Username (Short &amp; Long Auto-Fit) + PFP:</span>
            {SAMPLE_PREVIEW_USERNAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onPreviewUsernameChange(name)}
                className={`px-2.5 py-1 rounded font-mono text-xs border transition-colors cursor-pointer ${
                  previewUsername === name
                    ? 'bg-[#53FC18]/20 border-[#53FC18] text-[#53FC18] font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="mt-3 w-full max-w-md flex items-center gap-2">
            <input
              type="url"
              aria-label="Custom Follower PFP Image URL"
              value={settings.customAvatarUrl || ''}
              onChange={(e) =>
                onUpdateSettings({ customAvatarUrl: e.target.value })
              }
              placeholder="Optional: Paste Custom PFP URL (or leave blank for Cyber Gamer PFP)"
              className="flex-1 rounded-lg bg-[#070A0F] border border-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#53FC18]"
            />
            {settings.customAvatarUrl && (
              <button
                type="button"
                onClick={() => onUpdateSettings({ customAvatarUrl: '' })}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Reset PFP
              </button>
            )}
          </div>
        </div>

        {/* All-in-One Preview Customizer & Save / Single OBS Link Generator */}
        <div
          data-testid="unified-preview-settings-bar"
          className="mt-6 rounded-xl bg-[#080C12] border border-[#53FC18]/40 p-5 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#53FC18]">
                All-in-One Alert &amp; TTS Settings · Auto-Generates Single Unified OBS Link
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Select Template, Music, Font, Duration, Speed, Volume &amp; English / Hindi Accent
              </h3>
            </div>

            <button
              type="button"
              data-testid="save-and-generate-single-link-btn"
              onClick={handleSaveAllAndGenerateSingleLink}
              className="inline-flex items-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-extrabold text-xs px-4 py-2.5 shadow-[0_0_20px_rgba(83,252,24,0.3)] transition-all cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings &amp; Generate Single OBS Link</span>
            </button>
          </div>

          {/* 7-Control Unified Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Template Selector */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
              <label
                htmlFor="quick-select-template"
                className="block text-[11px] font-mono uppercase text-slate-400"
              >
                1. Alert Box Template
              </label>
              <select
                id="quick-select-template"
                value={settings.activeAlertTemplate}
                onChange={(e) => {
                  const newTpl = e.target.value as AlertTemplateId;
                  setHighlightedGeneratorTemplate(newTpl);
                  onUpdateSettings({ activeAlertTemplate: newTpl });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
              >
                {ALERT_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Music / Sound (SFX) Selector */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="quick-select-sfx"
                  className="block text-[11px] font-mono uppercase text-slate-400"
                >
                  2. Alert Music / Sound
                </label>
                <button
                  type="button"
                  onClick={() => playSynthesizedSfx(settings.sfxPreset, settings.customSfxUrl)}
                  className="text-[10px] font-mono text-[#53FC18] hover:underline cursor-pointer"
                >
                  Test Sound
                </button>
              </div>
              <select
                id="quick-select-sfx"
                value={settings.sfxPreset}
                onChange={(e) => {
                  const sfx = e.target.value as SfxPresetId;
                  onUpdateSettings({ sfxPreset: sfx });
                  playSynthesizedSfx(sfx, settings.customSfxUrl);
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
              >
                {SFX_PRESET_INFO.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Font Family Selector */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
              <label
                htmlFor="quick-select-font"
                className="block text-[11px] font-mono uppercase text-slate-400"
              >
                3. Broadcast Font
              </label>
              <select
                id="quick-select-font"
                value={settings.selectedFont}
                onChange={(e) => {
                  onUpdateSettings({
                    selectedFont: e.target.value as FontFamilyName,
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
              >
                {GOOGLE_FONTS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.styleTag})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. English & Hindi Voice Accent Selector */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <label
                  htmlFor="quick-select-voice"
                  className="block text-[11px] font-mono uppercase text-slate-400"
                >
                  4. Voice Accent (EN / HI)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({
                        ttsSettings: {
                          ...settings.ttsSettings,
                          enabled: true,
                          lang: 'en-US',
                        },
                      });
                      setSavedSingleLinkBanner(true);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                      settings.ttsSettings.lang === 'en-US' ||
                      settings.ttsSettings.lang === 'en-IN'
                        ? 'bg-[#53FC18]/20 border-[#53FC18] text-[#53FC18]'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({
                        ttsSettings: {
                          ...settings.ttsSettings,
                          enabled: true,
                          lang: 'hi-IN',
                        },
                      });
                      setSavedSingleLinkBanner(true);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                      settings.ttsSettings.lang === 'hi-IN'
                        ? 'bg-[#53FC18]/20 border-[#53FC18] text-[#53FC18]'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    Hindi
                  </button>
                </div>
              </div>
              <select
                id="quick-select-voice"
                value={settings.ttsSettings.lang}
                onChange={(e) => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      lang: e.target.value as TtsLangCode,
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
              >
                {TTS_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sliders Row: Alert Duration, TTS Speed, TTS Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 5. Alert Duration */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-mono text-[11px] uppercase text-slate-400">
                  5. Alert Duration
                </span>
                <span className="font-mono font-bold text-[#53FC18]">
                  {settings.alertDuration}s
                </span>
              </div>
              <input
                type="range"
                aria-label="Quick Alert Duration"
                min={3}
                max={20}
                step={1}
                value={settings.alertDuration}
                onChange={(e) => {
                  onUpdateSettings({ alertDuration: Number(e.target.value) });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full accent-[#53FC18]"
              />
            </div>

            {/* 6. TTS Voice Speed */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-mono text-[11px] uppercase text-slate-400">
                  6. TTS Voice Speed
                </span>
                <span className="font-mono font-bold text-[#53FC18]">
                  {settings.ttsSettings.rate.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                aria-label="Quick TTS Voice Speed"
                min={0.7}
                max={1.5}
                step={0.1}
                value={settings.ttsSettings.rate}
                onChange={(e) => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      rate: Number(e.target.value),
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full accent-[#53FC18]"
              />
            </div>

            {/* 7. TTS Volume */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-mono text-[11px] uppercase text-slate-400">
                  7. TTS Voice Volume
                </span>
                <span className="font-mono font-bold text-[#53FC18]">
                  {Math.round(settings.ttsSettings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Quick TTS Voice Volume"
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.ttsSettings.volume}
                onChange={(e) => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      volume: Number(e.target.value),
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full accent-[#53FC18]"
              />
            </div>
          </div>

          {/* Auto-Generated Single Unified OBS URL Box (Includes Template + Music + Font + Duration + Speed + Volume + Accent) */}
          <div className="rounded-lg bg-[#05070B] border border-[#53FC18]/50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Link2 className="w-4 h-4 text-[#53FC18]" />
                <span>
                  Single Unified OBS Link (All Applied Settings Combined in 1 Link):
                </span>
              </div>
              {savedSingleLinkBanner && (
                <span className="text-[11px] font-mono font-bold text-[#53FC18]">
                  ✓ Settings Saved &amp; Link Auto-Updated!
                </span>
              )}
            </div>

            {/* Applied Settings Summary Tags */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#53FC18]/15 border border-[#53FC18]/40 text-[#53FC18]">
                Template: {activeTemplateMeta.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Music: {activeSfxMeta.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Font: {settings.selectedFont}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Duration: {settings.alertDuration}s
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Speed: {settings.ttsSettings.rate.toFixed(1)}x
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Volume: {Math.round(settings.ttsSettings.volume * 100)}%
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[#53FC18]">
                Accent: {activeVoiceMeta.label}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                data-testid="single-unified-obs-url-input"
                aria-label="Single Unified OBS Alert URL"
                value={generatedAlertUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 rounded-lg bg-[#090D14] border border-slate-700 px-3 py-2 text-xs font-mono text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
              />
              <button
                type="button"
                onClick={handleCopySingleLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-4 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedInlineLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Single Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Single OBS Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Streamlabs-Style OBS Link Generator Panel */}
      <div ref={linkGeneratorRef}>
        <ObsLinkGeneratorPanel
          mode="alerts"
          generatedUrl={generatedAlertUrl}
          templateName={
            ALERT_TEMPLATES.find((t) => t.id === highlightedGeneratorTemplate)?.name ||
            activeTemplateMeta.name
          }
          activeConnections={obsCounts.alerts}
          onLinkCopied={() =>
            onUpdateSettings({
              setupChecklist: {
                ...settings.setupChecklist,
                obsStep1LinksCopied: true,
              },
            })
          }
        />
      </div>

      {/* 6 Ultra-Premium Follower Alert + Animated TTS Templates (Spacious 2-Column Grid so Zero Boxes Cut Out) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              6 Ultra-Premium Follower Alert + Animated TTS Templates
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Previewing live username <strong className="text-[#53FC18] font-mono">{activeUserDisplay}</strong> across all 6 rectangle VFX boxes. Click any template to activate or generate its OBS link.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ALERT_TEMPLATES.map((tpl) => {
            const isSelected = settings.activeAlertTemplate === tpl.id;
            return (
              <div
                key={tpl.id}
                className={`rounded-xl bg-[#0D131C] border p-6 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-[#53FC18] shadow-[0_0_25px_rgba(83,252,24,0.12)]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">{tpl.name}</h3>
                      <p className="text-xs text-slate-400">{tpl.subtitle}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-300">
                      Font: {tpl.defaultFont}
                    </span>
                  </div>

                  {/* Full-Width Non-Clipping Preview Box with Live Username & PFP */}
                  <div className="my-2 rounded-lg bg-[#05080D] border border-slate-800/80 p-3 sm:p-4 flex items-center justify-center">
                    <AlertCardRenderer
                      template={tpl.id}
                      font={tpl.defaultFont}
                      username={activeUserDisplay}
                      avatarUrl={settings.customAvatarUrl}
                      ttsMessage={previewTtsMessage}
                      isSpeaking={isSelected}
                      compact
                    />
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mt-3">
                    {tpl.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        activeAlertTemplate: tpl.id,
                        selectedFont: tpl.defaultFont,
                      })
                    }
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#53FC18]/20 text-[#53FC18] border border-[#53FC18]/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isSelected ? 'Active Template' : 'Use Template'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAndGenerateLink(tpl.id, tpl.defaultFont)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs py-2.5 px-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Generate OBS Link</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8 Selectable Google Fonts + 6 Polyphonic Sound Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 8 Google Fonts Selector */}
        <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Type className="w-5 h-5 text-[#53FC18]" />
              <div>
                <h3 className="text-base font-bold text-white">
                  8 Premium Broadcast Google Fonts
                </h3>
                <p className="text-xs text-slate-400">
                  Instantly updates follower typography across OBS overlays
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#53FC18]">
              Active: {settings.selectedFont}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {GOOGLE_FONTS.map((f) => {
              const active = settings.selectedFont === f.name;
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ selectedFont: f.name });
                    setSavedSingleLinkBanner(true);
                  }}
                  className={`text-left rounded-lg p-3 border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#53FC18]/12 border-[#53FC18] text-white'
                      : 'bg-[#080B11] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>{f.name}</span>
                    <span>{f.styleTag}</span>
                  </div>
                  <div
                    className="text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ fontFamily: `'${f.name}', sans-serif` }}
                  >
                    <span className="text-[#53FC18]">{activeUserDisplay}</span>{' '}
                    <span className="text-white">started following</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6 Polyphonic Web Audio API Sound Effect Presets */}
        <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Music className="w-5 h-5 text-[#53FC18]" />
              <div>
                <h3 className="text-base font-bold text-white">
                  6 Synthesized Polyphonic Alert Sound Presets
                </h3>
                <p className="text-xs text-slate-400">
                  Zero-latency Web Audio API synthesizer chimes played before TTS
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#53FC18] uppercase">
              SFX: {settings.sfxPreset}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SFX_PRESET_INFO.map((preset) => {
              const active = settings.sfxPreset === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`rounded-lg p-3 border flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-[#53FC18]/12 border-[#53FC18]'
                      : 'bg-[#080B11] border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ sfxPreset: preset.id as SfxPresetId });
                      setSavedSingleLinkBanner(true);
                    }}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="text-xs font-bold text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {preset.description}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ sfxPreset: preset.id as SfxPresetId });
                      setSavedSingleLinkBanner(true);
                      playSynthesizedSfx(preset.id);
                    }}
                    aria-label={`Audition ${preset.name}`}
                    className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[#53FC18] text-xs font-mono font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Play</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <label
              htmlFor="custom-sfx-url"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Optional Custom MP3/WAV Sound URL (Leave blank to use Polyphonic Synth)
            </label>
            <input
              id="custom-sfx-url"
              type="url"
              value={settings.customSfxUrl}
              onChange={(e) => onUpdateSettings({ customSfxUrl: e.target.value })}
              placeholder="https://example.com/custom-alert-sound.mp3"
              className="w-full rounded-lg bg-[#070A0F] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#53FC18]"
            />
          </div>
        </section>
      </div>

      {/* Multi-Accent Animated Text-to-Speech (TTS) Engine Customizer */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-[#53FC18]" />
            <div>
              <h3 className="text-base font-bold text-white">
                Multi-Accent OBS Text-to-Speech (TTS) Customizer
              </h3>
              <p className="text-xs text-slate-400">
                Streams crystal-clear HTML5 MP3 audio via /api/tts directly into OBS Studio Browser Sources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({
                  ttsSettings: {
                    ...settings.ttsSettings,
                    enabled: !settings.ttsSettings.enabled,
                  },
                });
                setSavedSingleLinkBanner(true);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                settings.ttsSettings.enabled
                  ? 'bg-[#53FC18] text-slate-950'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {settings.ttsSettings.enabled ? 'TTS Voice: ENABLED' : 'TTS Voice: OFF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Voice Accent Selection */}
          <div className="space-y-2">
            <label
              htmlFor="tts-voice-lang"
              className="block text-xs font-semibold text-slate-300"
            >
              Select Voice Accent / Language (English &amp; Hindi)
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      lang: 'en-IN',
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  settings.ttsSettings.lang.startsWith('en')
                    ? 'bg-[#53FC18]/20 border-[#53FC18] text-[#53FC18]'
                    : 'bg-[#080B11] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                English Accent
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      lang: 'hi-IN',
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  settings.ttsSettings.lang === 'hi-IN'
                    ? 'bg-[#53FC18]/20 border-[#53FC18] text-[#53FC18]'
                    : 'bg-[#080B11] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Hindi (हिन्दी)
              </button>
            </div>
            <select
              id="tts-voice-lang"
              value={settings.ttsSettings.lang}
              onChange={(e) => {
                onUpdateSettings({
                  ttsSettings: {
                    ...settings.ttsSettings,
                    lang: e.target.value as TtsLangCode,
                  },
                });
                setSavedSingleLinkBanner(true);
              }}
              className="w-full rounded-lg bg-[#070A0F] border border-slate-700 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
            >
              {TTS_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </select>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Audio Engine Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ttsSettings: { ...settings.ttsSettings, mode: 'stream' },
                    });
                    setSavedSingleLinkBanner(true);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                    settings.ttsSettings.mode === 'stream'
                      ? 'bg-[#53FC18]/15 border-[#53FC18] text-[#53FC18]'
                      : 'bg-[#080B11] border-slate-800 text-slate-400'
                  }`}
                >
                  OBS Stream (/api/tts)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ttsSettings: { ...settings.ttsSettings, mode: 'browser' },
                    });
                    setSavedSingleLinkBanner(true);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                    settings.ttsSettings.mode === 'browser'
                      ? 'bg-[#53FC18]/15 border-[#53FC18] text-[#53FC18]'
                      : 'bg-[#080B11] border-slate-800 text-slate-400'
                  }`}
                >
                  Browser Speech API
                </button>
              </div>
            </div>
          </div>

          {/* TTS Message Template */}
          <div className="space-y-2">
            <label
              htmlFor="tts-message-template"
              className="block text-xs font-semibold text-slate-300"
            >
              Spoken Alert Template (Use &#123;username&#125; and &#123;channel&#125;)
            </label>
            <textarea
              id="tts-message-template"
              rows={3}
              value={settings.ttsSettings.messageTemplate}
              onChange={(e) => {
                onUpdateSettings({
                  ttsSettings: {
                    ...settings.ttsSettings,
                    messageTemplate: e.target.value,
                  },
                });
                setSavedSingleLinkBanner(true);
              }}
              className="w-full rounded-lg bg-[#070A0F] border border-slate-700 p-3 text-xs text-white focus:outline-none focus:border-[#53FC18]"
            />
            <button
              type="button"
              onClick={handleLocalVoicePreview}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#53FC18] hover:underline cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Spoken Template Now</span>
            </button>
          </div>

          {/* Sliders: Duration, Rate, Volume */}
          <div className="space-y-3 bg-[#080B11] border border-slate-800/80 rounded-lg p-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Alert Popup Duration</span>
                <span className="font-mono tabular-nums text-[#53FC18]">
                  {settings.alertDuration}s
                </span>
              </div>
              <input
                type="range"
                aria-label="Alert Popup Duration"
                min={3}
                max={20}
                step={1}
                value={settings.alertDuration}
                onChange={(e) => {
                  onUpdateSettings({ alertDuration: Number(e.target.value) });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full accent-[#53FC18]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">TTS Voice Speed</span>
                <span className="font-mono tabular-nums text-[#53FC18]">
                  {settings.ttsSettings.rate.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                aria-label="TTS Voice Speed"
                min={0.7}
                max={1.5}
                step={0.1}
                value={settings.ttsSettings.rate}
                onChange={(e) => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      rate: Number(e.target.value),
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full accent-[#53FC18]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">TTS Voice Volume</span>
                <span className="font-mono tabular-nums text-[#53FC18]">
                  {Math.round(settings.ttsSettings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="TTS Voice Volume"
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.ttsSettings.volume}
                onChange={(e) => {
                  onUpdateSettings({
                    ttsSettings: {
                      ...settings.ttsSettings,
                      volume: Number(e.target.value),
                    },
                  });
                  setSavedSingleLinkBanner(true);
                }}
                className="w-full accent-[#53FC18]"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE SETTINGS & GENERATE SINGLE COMBINED OBS LINK */}
        <div
          data-testid="bottom-save-and-generate-link-box"
          className="pt-5 border-t border-slate-800 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#53FC18]">
                <Save className="w-4 h-4" />
                <span>Save All Selected Settings &amp; Generate Single OBS Link</span>
              </div>
              <p className="text-xs text-slate-300">
                Bundles your selected <strong className="text-white">Template ({settings.activeAlertTemplate})</strong>,{' '}
                <strong className="text-white">Music ({settings.sfxPreset})</strong>,{' '}
                <strong className="text-white">Font ({settings.selectedFont})</strong>,{' '}
                <strong className="text-white">Alert Duration ({settings.alertDuration}s)</strong>,{' '}
                <strong className="text-white">TTS Speed ({settings.ttsSettings.rate.toFixed(1)}x)</strong>,{' '}
                <strong className="text-white">TTS Volume ({Math.round(settings.ttsSettings.volume * 100)}%)</strong>, and{' '}
                <strong className="text-white">Accent ({settings.ttsSettings.lang})</strong> into one single link below.
              </p>
            </div>

            <button
              type="button"
              data-testid="bottom-save-generate-btn"
              onClick={handleSaveAllAndGenerateSingleLink}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-black text-xs px-6 py-3 transition-all shadow-[0_0_24px_rgba(83,252,24,0.35)] cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings &amp; Generate Single Link Below</span>
            </button>
          </div>

          <div
            className={`rounded-xl p-4 border transition-all space-y-3 ${
              savedSingleLinkBanner
                ? 'bg-[#53FC18]/10 border-[#53FC18] shadow-[0_0_25px_rgba(83,252,24,0.16)]'
                : 'bg-[#070A0F] border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-[#53FC18] uppercase tracking-wider">
                {savedSingleLinkBanner
                  ? '✓ Settings Saved! Your Single Unified OBS Browser Source Link:'
                  : 'Generated Single OBS Link (Template + Music + Font + Duration + Speed + Volume + Accent):'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Template: <strong className="text-[#53FC18]">{settings.activeAlertTemplate}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Music: <strong className="text-[#53FC18]">{settings.sfxPreset}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Font: <strong className="text-[#53FC18]">{settings.selectedFont}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Duration: <strong className="text-[#53FC18]">{settings.alertDuration}s</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Speed: <strong className="text-[#53FC18]">{settings.ttsSettings.rate.toFixed(1)}x</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Volume: <strong className="text-[#53FC18]">{Math.round(settings.ttsSettings.volume * 100)}%</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Accent: <strong className="text-[#53FC18]">{settings.ttsSettings.lang}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                readOnly
                data-testid="bottom-generated-single-link-input"
                aria-label="Bottom Generated Single OBS Alert Link"
                value={generatedAlertUrl}
                className="flex-1 rounded-lg bg-[#05070B] border border-[#53FC18]/50 px-3.5 py-2.5 text-xs font-mono text-[#53FC18] focus:outline-none"
              />
              <button
                type="button"
                data-testid="bottom-copy-single-link-btn"
                onClick={handleCopySingleLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-5 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedInlineLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedInlineLink ? 'Single Link Copied!' : 'Copy Single OBS Link'}</span>
              </button>
              <a
                href={generatedAlertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2.5 transition-colors border border-slate-700 whitespace-nowrap shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Open Overlay</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
