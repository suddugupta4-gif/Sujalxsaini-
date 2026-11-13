import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Flame,
  History,
  Link2,
  Play,
  Save,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';
import type {
  AlertEventType,
  AppSettings,
  FontFamilyName,
  ObsClientCounts,
  SfxPresetId,
  TextAlertEventFilter,
  TextAlertLinkHistoryItem,
  TextAlertStyle,
  TtsLangCode,
} from '../types';
import {
  GOOGLE_FONTS,
  PUBLIC_RENDER_ORIGIN,
  TEXT_ALERT_STYLES,
  TTS_LANGUAGES,
  buildObsTextAlertUrl,
  formatEventTtsText,
} from '../utils/logic';
import {
  SFX_PRESET_INFO,
  playSynthesizedSfx,
  prepareTtsAudio,
} from '../utils/soundEngine';
import { TextOnlyAlert } from './TextOnlyAlert';

interface TabKicksSubsStudioProps {
  settings: AppSettings;
  obsCounts: ObsClientCounts;
  previewUsername: string;
  onPreviewUsernameChange: (name: string) => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onFireTestAlert: (
    customUsername?: string,
    eventOptions?: {
      eventType?: AlertEventType;
      amount?: number;
      subMessage?: string;
    }
  ) => Promise<void>;
}

const EVENT_FILTER_OPTIONS: {
  id: TextAlertEventFilter;
  label: string;
  badge: string;
}[] = [
  { id: 'all', label: 'All Kicks & Subs (Kicks + Sub Gift + Sub Buy)', badge: 'ALL KICKS & SUBS' },
  { id: 'kicks', label: 'Kicks Send Only (kicks.gifted)', badge: 'KICKS ONLY' },
  { id: 'sub-gift', label: 'Subs Gift Only (channel.subscription.gifts)', badge: 'SUBS GIFT ONLY' },
  { id: 'sub-buy', label: 'Sub Buy Only (channel.subscription.new)', badge: 'SUB BUY ONLY' },
];

export const TabKicksSubsStudio: React.FC<TabKicksSubsStudioProps> = ({
  settings,
  obsCounts,
  previewUsername,
  onPreviewUsernameChange,
  onUpdateSettings,
  onFireTestAlert,
}) => {
  const [previewEvent, setPreviewEvent] =
    useState<Exclude<AlertEventType, 'follow'>>('kicks');
  const [previewAmount, setPreviewAmount] = useState<number>(500);
  const [previewNote, setPreviewNote] = useState<string>('OP gameplay bhai!');

  // Generator controls state
  const [linkLabelInput, setLinkLabelInput] = useState<string>('');
  const [selectedEventFilter, setSelectedEventFilter] =
    useState<TextAlertEventFilter>('all');
  const [selectedStyle, setSelectedStyle] = useState<TextAlertStyle>(
    settings.textAlertStyle || 'kinetic-neon'
  );
  const [selectedFont, setSelectedFont] = useState<FontFamilyName>(
    settings.textAlertFont || 'Bebas Neue'
  );
  const [selectedSfxPreset, setSelectedSfxPreset] = useState<SfxPresetId>(
    settings.textAlertSfxPreset || 'royal'
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(
    settings.textAlertDuration || 6
  );
  const [selectedTtsEnabled, setSelectedTtsEnabled] = useState<boolean>(
    settings.ttsSettings.enabled
  );
  const [selectedVoice, setSelectedVoice] = useState<TtsLangCode>(
    settings.ttsSettings.lang
  );
  const [selectedRate, setSelectedRate] = useState<number>(
    settings.ttsSettings.rate || 1.0
  );
  const [selectedVolume, setSelectedVolume] = useState<number>(
    settings.ttsSettings.volume ?? 1.0
  );

  const [activeLinkId, setActiveLinkId] = useState<string | null>(
    settings.textAlertLinkHistory?.[0]?.id || null
  );
  const [copiedActive, setCopiedActive] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  // Per-history-item live edit drafts
  const [drafts, setDrafts] = useState<
    Record<string, Partial<TextAlertLinkHistoryItem>>
  >({});
  const [savedHistoryId, setSavedHistoryId] = useState<string | null>(null);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const list = settings.textAlertLinkHistory || [];
    if (!activeLinkId && list[0]?.id) {
      setActiveLinkId(list[0].id);
    }
  }, [settings.textAlertLinkHistory, activeLinkId]);

  const activeUserDisplay = previewUsername.trim() || 'KaranClutchX';
  const historyList = settings.textAlertLinkHistory || [];
  const activeSavedItem = historyList.find((item) => item.id === activeLinkId);

  const generatedPreviewUrl = activeSavedItem
    ? activeSavedItem.url
    : buildObsTextAlertUrl(PUBLIC_RENDER_ORIGIN, {
        style: selectedStyle,
        font: selectedFont,
        sfx: selectedSfxPreset,
        tts: selectedTtsEnabled,
        voice: selectedVoice,
        duration: selectedDuration,
        rate: selectedRate,
        volume: selectedVolume,
        eventFilter: selectedEventFilter,
      });

  const handleGenerateAndSaveLink = async () => {
    try {
      const res = await fetch('/api/text-alert-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: linkLabelInput.trim() || undefined,
          eventFilter: selectedEventFilter,
          style: selectedStyle,
          font: selectedFont,
          sfxPreset: selectedSfxPreset,
          duration: selectedDuration,
          ttsEnabled: selectedTtsEnabled,
          voice: selectedVoice,
          rate: selectedRate,
          volume: selectedVolume,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        item?: TextAlertLinkHistoryItem;
        settings?: AppSettings;
      };
      if (json?.settings) {
        await onUpdateSettings({
          textAlertLinkHistory: json.settings.textAlertLinkHistory,
          textAlertStyle: selectedStyle,
          textAlertFont: selectedFont,
          textAlertSfxPreset: selectedSfxPreset,
          textAlertDuration: selectedDuration,
        });
      }
      if (json?.item) {
        setActiveLinkId(json.item.id);
        setLinkLabelInput('');
        try {
          await navigator.clipboard.writeText(json.item.url);
          setCopiedActive(true);
          setTimeout(() => setCopiedActive(false), 2600);
        } catch {
          // ignore
        }
      }
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3500);
    } catch {
      // ignore
    }
  };

  const getDraft = (item: TextAlertLinkHistoryItem): TextAlertLinkHistoryItem => ({
    ...item,
    ...(drafts[item.id] || {}),
  });

  const updateDraft = (
    id: string,
    patch: Partial<TextAlertLinkHistoryItem>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch,
      },
    }));
  };

  const handleLiveUpdateHistoryLink = async (id: string) => {
    const original = historyList.find((i) => i.id === id);
    if (!original) return;
    const merged = getDraft(original);

    try {
      const res = await fetch(`/api/text-alert-links/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: merged.label,
          eventFilter: merged.eventFilter,
          style: merged.style,
          font: merged.font,
          sfxPreset: merged.sfxPreset || selectedSfxPreset,
          duration: Number(merged.duration) || 6,
          ttsEnabled: Boolean(merged.ttsEnabled),
          voice: merged.voice,
          rate: Number(merged.rate) || 1.0,
          volume: Number(merged.volume) ?? 1.0,
          syncMain: true,
        }),
      });
      const json = (await res.json()) as { settings?: AppSettings };
      if (json?.settings) {
        await onUpdateSettings({
          textAlertStyle: json.settings.textAlertStyle,
          textAlertFont: json.settings.textAlertFont,
          textAlertSfxPreset: json.settings.textAlertSfxPreset,
          textAlertDuration: json.settings.textAlertDuration,
          textAlertLinkHistory: json.settings.textAlertLinkHistory,
        });
      }
      setSavedHistoryId(id);
      setTimeout(
        () => setSavedHistoryId((curr) => (curr === id ? null : curr)),
        3500
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteHistoryLink = async (id: string) => {
    try {
      const res = await fetch(`/api/text-alert-links/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { settings?: AppSettings };
      if (json?.settings) {
        await onUpdateSettings({
          textAlertLinkHistory: json.settings.textAlertLinkHistory,
        });
        if (activeLinkId === id) {
          setActiveLinkId(json.settings.textAlertLinkHistory?.[0]?.id || null);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleLocalVoicePreview = async () => {
    const text = formatEventTtsText(
      previewEvent,
      activeUserDisplay,
      previewAmount,
      settings.ttsSettings.messageTemplate,
      settings.channelName,
      previewNote.trim() || undefined
    );
    const [, prepared] = await Promise.all([
      playSynthesizedSfx(
        selectedSfxPreset,
        settings.customSfxUrl,
        settings.alertsMuted
      ).catch(() => {}),
      prepareTtsAudio({
        text,
        lang: selectedVoice,
        mode: settings.ttsSettings.mode,
        rate: selectedRate,
        pitch: settings.ttsSettings.pitch,
        volume: selectedVolume,
        muted: settings.alertsMuted,
      }),
    ]);
    await prepared.playNow();
  };

  return (
    <div className="space-y-8" data-testid="kicks-subs-studio-page">
      {/* 1. Live Zero-Box Kinetic Typography Preview Stage */}
      <section className="rounded-xl bg-[#0D131C] border border-amber-400/40 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-mono text-amber-300 uppercase tracking-wider">
              Specific Kicks Send · Subs Gift · Sub Buy Studio · 0ms Exact-Time TTS
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Kicks &amp; Subs Pure-Text OBS Overlay + Link History Studio
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              100% transparent floating text + amount ONLY (zero box, zero PFP). Generate permanent Kicks/Subs links below and edit them live anytime without changing your OBS URL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#070B10] border border-slate-700 text-slate-300">
              {obsCounts.alerts > 0
                ? `🟢 OBS Alert Sources: ${obsCounts.alerts}`
                : '⚪ OBS Alert Sources: 0'}
            </span>
            {(['kicks', 'sub-gift', 'sub-buy'] as const).map((evt) => (
              <button
                key={evt}
                type="button"
                onClick={() => {
                  setPreviewEvent(evt);
                  if (evt === 'kicks' && previewAmount < 10) setPreviewAmount(500);
                  if (evt === 'sub-gift' && previewAmount > 50) setPreviewAmount(5);
                  if (evt === 'sub-buy') setPreviewAmount(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  previewEvent === evt
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {evt === 'kicks'
                  ? 'Kicks Send'
                  : evt === 'sub-gift'
                    ? 'Subs Gift'
                    : 'Sub Buy'}
              </button>
            ))}
          </div>
        </div>

        {/* Pure Transparent Box-Free Kinetic Text Preview */}
        <div className="rounded-xl bg-[#04070B] border border-slate-800/80 px-4 py-8 flex flex-col items-center justify-center min-h-[180px]">
          <TextOnlyAlert
            key={`${previewEvent}-${selectedStyle}-${selectedFont}-${previewAmount}-${activeUserDisplay}-${previewNote}`}
            eventType={previewEvent}
            username={activeUserDisplay}
            amount={previewAmount}
            subMessage={previewNote.trim() || undefined}
            font={selectedFont}
            stylePreset={selectedStyle}
            compact
          />
        </div>

        {/* Quick Live Trigger Row */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            aria-label="Kicks Test Sender Username"
            value={previewUsername}
            onChange={(e) => onPreviewUsernameChange(e.target.value)}
            placeholder="Sender username..."
            className="rounded-lg bg-[#070A0F] border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-[#53FC18] w-44 focus:outline-none focus:border-amber-400"
          />
          <input
            type="number"
            aria-label="Kicks or Subs Amount"
            min={1}
            max={100000}
            value={previewAmount}
            onChange={(e) =>
              setPreviewAmount(Math.max(1, Number(e.target.value) || 1))
            }
            className="rounded-lg bg-[#070A0F] border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-amber-300 w-28 focus:outline-none focus:border-amber-400"
          />
          <input
            type="text"
            aria-label="Optional Gift Note"
            data-testid="kicks-gift-note-input"
            value={previewNote}
            onChange={(e) => setPreviewNote(e.target.value)}
            placeholder="Gift note (optional, emojis supported — blank reads amount only)..."
            className="flex-1 min-w-[200px] rounded-lg bg-[#070A0F] border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          />

          <button
            type="button"
            data-testid="kicks-preview-sound-tts-btn"
            onClick={handleLocalVoicePreview}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs px-3.5 py-2 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Preview Sound → TTS</span>
          </button>

          <button
            type="button"
            data-testid="kicks-tab-fire-kicks-btn"
            onClick={() => {
              setPreviewEvent('kicks');
              onFireTestAlert(activeUserDisplay, {
                eventType: 'kicks',
                amount: previewAmount >= 1 ? previewAmount : 500,
                subMessage: previewNote.trim() || undefined,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-extrabold text-xs px-3.5 py-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fire Kicks ({previewAmount})</span>
          </button>

          <button
            type="button"
            data-testid="kicks-tab-fire-sub-gift-btn"
            onClick={() => {
              setPreviewEvent('sub-gift');
              onFireTestAlert(activeUserDisplay, {
                eventType: 'sub-gift',
                amount: previewAmount > 50 ? 5 : Math.max(1, previewAmount),
                subMessage: previewNote.trim() || undefined,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fire Subs Gift</span>
          </button>

          <button
            type="button"
            data-testid="kicks-tab-fire-sub-buy-btn"
            onClick={() => {
              setPreviewEvent('sub-buy');
              onFireTestAlert(activeUserDisplay, {
                eventType: 'sub-buy',
                amount: 1,
                subMessage: previewNote.trim() || undefined,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Fire Sub Buy</span>
          </button>
        </div>
      </section>

      {/* 2. Specific Kicks & Subs Link Generator Section */}
      <section
        data-testid="kicks-link-generator-section"
        className="rounded-xl bg-[#0D131C] border border-[#53FC18]/40 p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#53FC18]">
              Step 1: Customize Kicks/Subs Overlay → Step 2: Generate Permanent Saved OBS Link
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Generate Specific Kicks &amp; Subs OBS Link (Saved to History + Live Editable)
            </h2>
          </div>

          <button
            type="button"
            data-testid="generate-save-kicks-link-btn"
            onClick={handleGenerateAndSaveLink}
            className="inline-flex items-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-black text-xs px-5 py-2.5 shadow-[0_0_22px_rgba(83,252,24,0.3)] transition-all cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Generate &amp; Save Permanent OBS Link</span>
          </button>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
            <label
              htmlFor="kicks-gen-label"
              className="block text-[11px] font-mono uppercase text-slate-400"
            >
              1. Link Label / Name
            </label>
            <input
              id="kicks-gen-label"
              type="text"
              data-testid="kicks-link-label-input"
              value={linkLabelInput}
              onChange={(e) => setLinkLabelInput(e.target.value)}
              placeholder="e.g. Main Kicks Only OBS"
              className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#53FC18]"
            />
          </div>

          <div className="rounded-lg bg-[#05080D] border border-[#53FC18]/40 p-3 space-y-1.5">
            <label
              htmlFor="kicks-gen-event"
              className="block text-[11px] font-mono uppercase text-[#53FC18] font-bold"
            >
              2. Specific Event Filter
            </label>
            <select
              id="kicks-gen-event"
              data-testid="kicks-link-event-select"
              value={selectedEventFilter}
              onChange={(e) =>
                setSelectedEventFilter(e.target.value as TextAlertEventFilter)
              }
              className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
            >
              {EVENT_FILTER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
            <label
              htmlFor="kicks-gen-style"
              className="block text-[11px] font-mono uppercase text-slate-400"
            >
              3. Text Animation Style
            </label>
            <select
              id="kicks-gen-style"
              data-testid="kicks-link-style-select"
              value={selectedStyle}
              onChange={(e) =>
                setSelectedStyle(e.target.value as TextAlertStyle)
              }
              className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
            >
              {TEXT_ALERT_STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 space-y-1.5">
            <label
              htmlFor="kicks-gen-font"
              className="block text-[11px] font-mono uppercase text-slate-400"
            >
              4. Cool Display Font
            </label>
            <select
              id="kicks-gen-font"
              data-testid="kicks-link-font-select"
              value={selectedFont}
              onChange={(e) =>
                setSelectedFont(e.target.value as FontFamilyName)
              }
              className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
            >
              {GOOGLE_FONTS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.styleTag})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alert Sound -> TTS & Duration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="rounded-lg bg-[#05080D] border border-amber-400/35 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="kicks-gen-sfx"
                className="block text-[11px] font-mono uppercase text-amber-300 font-bold whitespace-nowrap"
              >
                5. Alert Sound
              </label>
              <button
                type="button"
                onClick={() =>
                  playSynthesizedSfx(
                    selectedSfxPreset,
                    settings.customSfxUrl,
                    settings.alertsMuted
                  )
                }
                className="text-[10px] font-mono text-[#53FC18] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Test SFX
              </button>
            </div>
            <select
              id="kicks-gen-sfx"
              data-testid="kicks-link-sfx-select"
              value={selectedSfxPreset}
              onChange={(e) => {
                const nextSfx = e.target.value as SfxPresetId;
                setSelectedSfxPreset(nextSfx);
                onUpdateSettings({ textAlertSfxPreset: nextSfx });
                playSynthesizedSfx(nextSfx, settings.customSfxUrl, settings.alertsMuted);
              }}
              className="w-full rounded bg-[#0B1018] border border-slate-700 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
            >
              {SFX_PRESET_INFO.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-[#05080D] border border-[#53FC18]/35 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="kicks-gen-voice"
                className="block text-[11px] font-mono uppercase text-[#53FC18] font-bold whitespace-nowrap"
              >
                6. Pro TTS Voice
              </label>
              <button
                type="button"
                onClick={() => setSelectedTtsEnabled((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedTtsEnabled
                    ? 'bg-[#53FC18]/20 text-[#53FC18] border border-[#53FC18]/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {selectedTtsEnabled ? 'TTS ON' : 'TTS OFF'}
              </button>
            </div>
            <select
              id="kicks-gen-voice"
              data-testid="kicks-link-voice-select"
              value={selectedVoice}
              onChange={(e) => {
                const nextVoice = e.target.value as TtsLangCode;
                setSelectedVoice(nextVoice);
                onUpdateSettings({
                  ttsSettings: {
                    ...settings.ttsSettings,
                    lang: nextVoice,
                  },
                });
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

          <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-mono text-[11px] uppercase text-slate-400">
                7. Duration
              </span>
              <span className="font-mono font-bold text-amber-300">
                {selectedDuration}s
              </span>
            </div>
            <input
              type="range"
              aria-label="Generated Link Duration"
              min={3}
              max={15}
              step={1}
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-mono text-[11px] uppercase text-slate-400">
                8. TTS Speed
              </span>
              <span className="font-mono font-bold text-[#53FC18]">
                {selectedRate.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              aria-label="Generated Link TTS Speed"
              min={0.7}
              max={1.5}
              step={0.1}
              value={selectedRate}
              onChange={(e) => setSelectedRate(Number(e.target.value))}
              className="w-full accent-[#53FC18]"
            />
          </div>

          <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-mono text-[11px] uppercase text-slate-400">
                9. TTS Volume
              </span>
              <span className="font-mono font-bold text-[#53FC18]">
                {Math.round(selectedVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Generated Link TTS Volume"
              min={0.1}
              max={1.0}
              step={0.05}
              value={selectedVolume}
              onChange={(e) => setSelectedVolume(Number(e.target.value))}
              className="w-full accent-[#53FC18]"
            />
          </div>
        </div>

        {/* Optional Custom SFX MP3/WAV URL for Kicks & Subs */}
        <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <label
            htmlFor="kicks-custom-sfx-url"
            className="text-[11px] font-mono uppercase text-amber-300 font-bold whitespace-nowrap"
          >
            Optional Custom Kicks/Subs SFX URL:
          </label>
          <input
            id="kicks-custom-sfx-url"
            type="url"
            value={settings.customSfxUrl}
            onChange={(e) => onUpdateSettings({ customSfxUrl: e.target.value })}
            placeholder="https://example.com/kicks-alert-sound.mp3 (Leave blank for built-in synth SFX)"
            className="flex-1 rounded bg-[#0B1018] border border-slate-700 px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Active Generated Link Display */}
        <div className="rounded-lg bg-[#05070B] border border-amber-400/40 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Link2 className="w-4 h-4 text-amber-300" />
              <span>
                {activeSavedItem
                  ? `Active Permanent OBS Link (${activeSavedItem.label}) — Edit Below Without Changing URL:`
                  : 'Quick OBS Text Alert Link (Click "Generate & Save" above to create a permanent live-editable link):'}
              </span>
            </div>
            {savedBanner && (
              <span className="text-[11px] font-mono font-bold text-[#53FC18]">
                ✓ Permanent Link Created &amp; Saved in History!
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              data-testid="active-kicks-obs-url-input"
              aria-label="Active Kicks and Subs OBS URL"
              value={generatedPreviewUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 rounded-lg bg-[#090D14] border border-slate-700 px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(generatedPreviewUrl);
                } catch {
                  // ignore
                }
                setCopiedActive(true);
                setTimeout(() => setCopiedActive(false), 2400);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-4 py-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedActive ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy OBS Link</span>
                </>
              )}
            </button>
            <a
              href={generatedPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2 border border-slate-700 whitespace-nowrap shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Open Overlay</span>
            </a>
          </div>
        </div>
      </section>

      {/* 3. Saved Kicks & Subs Link History + Inline Live Edit Section */}
      <section
        data-testid="kicks-link-history-section"
        className="rounded-xl bg-[#0D131C] border border-amber-400/40 p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Saved Kicks &amp; Subs Link History (Edit Generated Link Live Without Changing URL)
              </h2>
              <p className="text-xs text-slate-400">
                Every generated Kicks / Subs OBS link is saved here. Edit its Event Filter, Animation Style, Font, Duration, or TTS Voice right here — OBS updates immediately over SSE using the exact same link!
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/40 px-2.5 py-1 rounded">
            {historyList.length} Saved Link(s)
          </span>
        </div>

        {historyList.length === 0 ? (
          <div className="rounded-lg bg-[#080C12] border border-slate-800 p-6 text-center space-y-2">
            <p className="text-xs text-slate-400">
              No saved Kicks/Subs OBS links yet. Click{' '}
              <strong className="text-[#53FC18]">
                “Generate &amp; Save Permanent OBS Link”
              </strong>{' '}
              above to create your first live-editable Kicks / Subs overlay link!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyList.map((item) => {
              const draft = getDraft(item);
              const isJustSaved = savedHistoryId === item.id;
              const isCopied = copiedHistoryId === item.id;
              const isActive = activeLinkId === item.id;
              const badgeLabel =
                EVENT_FILTER_OPTIONS.find((e) => e.id === item.eventFilter)?.badge ||
                'ALL KICKS & SUBS';

              return (
                <div
                  key={item.id}
                  data-testid={`kicks-history-item-${item.id}`}
                  className={`rounded-xl p-4 border transition-all space-y-3.5 ${
                    isActive
                      ? 'bg-[#0C1009] border-[#53FC18]/60'
                      : 'bg-[#070B11] border-slate-800'
                  }`}
                >
                  {/* Header Badges + Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-white">{item.label}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 font-mono text-[11px] font-bold text-amber-300">
                        {badgeLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-[#53FC18]">
                        {item.style} · {item.font}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                        SFX: {item.sfxPreset || 'royal'} → {item.ttsEnabled ? `TTS ${item.voice}` : 'TTS OFF'} · {item.duration}s
                      </span>
                      {isJustSaved && (
                        <span className="px-2 py-0.5 rounded bg-[#53FC18]/20 border border-[#53FC18] font-mono text-[11px] font-bold text-[#53FC18]">
                          ✓ Link Updated Live! OBS Synced Without URL Change!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const testEvt: AlertEventType =
                            item.eventFilter === 'sub-gift'
                              ? 'sub-gift'
                              : item.eventFilter === 'sub-buy'
                                ? 'sub-buy'
                                : 'kicks';
                          onFireTestAlert(activeUserDisplay, {
                            eventType: testEvt,
                            amount:
                              testEvt === 'kicks'
                                ? previewAmount || 500
                                : testEvt === 'sub-gift'
                                  ? 5
                                  : 1,
                            subMessage: previewNote.trim() || undefined,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold bg-[#53FC18]/15 text-[#53FC18] border border-[#53FC18]/40 hover:bg-[#53FC18]/25 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Test Live</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistoryLink(item.id)}
                        aria-label={`Remove saved link ${item.label}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {/* Permanent OBS URL Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      aria-label={`Permanent Kicks OBS URL for ${item.label}`}
                      value={item.url}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 rounded-lg bg-[#04070B] border border-slate-800 px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(item.url);
                        } catch {
                          // ignore
                        }
                        setCopiedHistoryId(item.id);
                        setActiveLinkId(item.id);
                        setTimeout(() => setCopiedHistoryId(null), 2200);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{isCopied ? 'Copied!' : 'Copy Permanent Link'}</span>
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-2 border border-slate-700 whitespace-nowrap shrink-0"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </a>
                  </div>

                  {/* Inline Live Edit Section for Generated Link */}
                  <div className="rounded-lg bg-[#05080D] border border-slate-800/90 p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-300">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Section of Generated Link (Same OBS URL Updates Live)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Label
                        </label>
                        <input
                          type="text"
                          aria-label={`Edit Label for ${item.id}`}
                          value={draft.label}
                          onChange={(e) =>
                            updateDraft(item.id, { label: e.target.value })
                          }
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Event Filter
                        </label>
                        <select
                          aria-label={`Edit Event Filter for ${item.id}`}
                          value={draft.eventFilter}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              eventFilter: e.target.value as TextAlertEventFilter,
                            })
                          }
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {EVENT_FILTER_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Animation Style
                        </label>
                        <select
                          aria-label={`Edit Animation Style for ${item.id}`}
                          value={draft.style}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              style: e.target.value as TextAlertStyle,
                            })
                          }
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {TEXT_ALERT_STYLES.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Font
                        </label>
                        <select
                          aria-label={`Edit Font for ${item.id}`}
                          value={draft.font}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              font: e.target.value as FontFamilyName,
                            })
                          }
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {GOOGLE_FONTS.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-amber-300 mb-1">
                          Alert Sound (SFX)
                        </label>
                        <select
                          aria-label={`Edit SFX for ${item.id}`}
                          value={draft.sfxPreset || 'royal'}
                          onChange={(e) => {
                            const sfxVal = e.target.value as SfxPresetId;
                            updateDraft(item.id, { sfxPreset: sfxVal });
                            playSynthesizedSfx(sfxVal, settings.customSfxUrl, settings.alertsMuted);
                          }}
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {SFX_PRESET_INFO.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Duration (sec)
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={20}
                          aria-label={`Edit Duration for ${item.id}`}
                          value={draft.duration}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              duration: Math.max(2, Math.min(20, Number(e.target.value) || 6)),
                            })
                          }
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Good TTS Voice
                        </label>
                        <select
                          aria-label={`Edit Voice for ${item.id}`}
                          value={draft.voice}
                          onChange={(e) =>
                            updateDraft(item.id, {
                              voice: e.target.value as TtsLangCode,
                            })
                          }
                          className="w-full rounded bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {TTS_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.label} ({l.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          TTS Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(item.id, { ttsEnabled: !draft.ttsEnabled })
                          }
                          className={`w-full rounded px-2.5 py-1.5 text-xs font-bold border cursor-pointer ${
                            draft.ttsEnabled
                              ? 'bg-[#53FC18]/15 border-[#53FC18] text-[#53FC18]'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {draft.ttsEnabled ? 'TTS: ENABLED' : 'TTS: OFF'}
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Speed ({Number(draft.rate).toFixed(1)}x) / Vol ({Math.round(Number(draft.volume) * 100)}%)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            aria-label={`Edit Speed for ${item.id}`}
                            min={0.7}
                            max={1.5}
                            step={0.1}
                            value={draft.rate}
                            onChange={(e) =>
                              updateDraft(item.id, { rate: Number(e.target.value) })
                            }
                            className="w-1/2 accent-[#53FC18]"
                          />
                          <input
                            type="range"
                            aria-label={`Edit Volume for ${item.id}`}
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={draft.volume}
                            onChange={(e) =>
                              updateDraft(item.id, { volume: Number(e.target.value) })
                            }
                            className="w-1/2 accent-amber-400"
                          />
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          data-testid={`save-live-kicks-link-${item.id}`}
                          onClick={() => handleLiveUpdateHistoryLink(item.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3 py-2 transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Update Link Live</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
