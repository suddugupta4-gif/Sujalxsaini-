import React, { useEffect, useRef, useState } from 'react';
import {
  Target,
  Zap,
  Check,
  Sparkles,
  Trophy,
  Copy,
  Save,
  Link2,
  RefreshCw,
  Radio,
  History,
  Trash2,
} from 'lucide-react';
import type {
  AppSettings,
  CounterTemplateId,
  FontFamilyName,
  GoalLinkHistoryItem,
  ObsClientCounts,
} from '../types';
import {
  GOOGLE_FONTS,
  PUBLIC_RENDER_ORIGIN,
  buildObsCounterUrl,
  calculateGoalPercentage,
} from '../utils/logic';
import { COUNTER_TEMPLATES, CounterCardRenderer } from './CounterCardTemplates';
import { ObsLinkGeneratorPanel } from './ObsLinkGeneratorModal';

interface TabCounterStudioProps {
  settings: AppSettings;
  obsCounts: ObsClientCounts;
  previewUsername: string;
  onPreviewUsernameChange: (name: string) => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onAdjustCounter: (payload: {
    delta?: number;
    exactCount?: number;
    exactGoal?: number;
    goalTitle?: string;
  }) => Promise<void>;
  onTriggerMilestone: () => Promise<void>;
}

const QUICK_GOAL_PRESETS = [500, 1000, 1500, 2000, 5000, 10000];

export const TabCounterStudio: React.FC<TabCounterStudioProps> = ({
  settings,
  obsCounts,
  previewUsername,
  onPreviewUsernameChange,
  onUpdateSettings,
  onAdjustCounter,
  onTriggerMilestone,
}) => {
  const [goalTextInput, setGoalTextInput] = useState(
    String(settings.followerGoal)
  );
  const [goalTitleInput, setGoalTitleInput] = useState(
    settings.goalTitle || `ROAD TO ${settings.followerGoal.toLocaleString()} FOLLOWERS`
  );
  const [savedGoalBanner, setSavedGoalBanner] = useState(false);
  const [copiedSingleGoalLink, setCopiedSingleGoalLink] = useState(false);
  const [isSyncingFollowers, setIsSyncingFollowers] = useState(false);
  const [activeGoalLinkId, setActiveGoalLinkId] = useState<string | null>(
    settings.goalLinkHistory?.[0]?.id || null
  );
  const [historyGoalDrafts, setHistoryGoalDrafts] = useState<Record<string, string>>({});
  const [historyTitleDrafts, setHistoryTitleDrafts] = useState<Record<string, string>>({});
  const [historyMetaDrafts, setHistoryMetaDrafts] = useState<
    Record<
      string,
      {
        label?: string;
        template?: CounterTemplateId;
        font?: FontFamilyName;
        showGoal?: boolean;
      }
    >
  >({});
  const [savedHistoryId, setSavedHistoryId] = useState<string | null>(null);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  const goalConfigRef = useRef<HTMLDivElement | null>(null);
  const goalInputFieldRef = useRef<HTMLInputElement | null>(null);
  const linkGeneratorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setGoalTextInput(String(settings.followerGoal));
  }, [settings.followerGoal]);

  useEffect(() => {
    if (settings.goalTitle) {
      setGoalTitleInput(settings.goalTitle);
    }
  }, [settings.goalTitle]);

  useEffect(() => {
    const historyList = settings.goalLinkHistory || [];
    if (!activeGoalLinkId && historyList[0]?.id) {
      setActiveGoalLinkId(historyList[0].id);
    }
  }, [settings.goalLinkHistory, activeGoalLinkId]);

  // Automatically detect / sync real followers on mount
  useEffect(() => {
    fetch('/api/sync-kick-followers', { method: 'POST' }).catch(() => {
      // Ignore network error; SSE state keeps real follower count synced
    });
  }, []);

  const origin = PUBLIC_RENDER_ORIGIN;

  const activeFont = settings.counterFont || settings.selectedFont || 'Orbitron';

  const parsedDraftGoal = Number(goalTextInput.replace(/[^0-9]/g, ''));
  const effectiveGoal =
    Number.isFinite(parsedDraftGoal) && parsedDraftGoal > 0
      ? parsedDraftGoal
      : settings.followerGoal;

  const activeHistoryItem: GoalLinkHistoryItem | undefined = (
    settings.goalLinkHistory || []
  ).find((item) => item.id === activeGoalLinkId);

  const generatedCounterUrl = activeHistoryItem
    ? activeHistoryItem.url
    : buildObsCounterUrl(origin, {
        template: settings.activeCounterTemplate,
        font: activeFont,
        showGoal: settings.showGoalOnCounter ?? true,
      });

  const activeTemplateMeta =
    COUNTER_TEMPLATES.find((t) => t.id === settings.activeCounterTemplate) ||
    COUNTER_TEMPLATES[0];

  const pct = calculateGoalPercentage(settings.followerCount, effectiveGoal);
  const remainingToGoal = Math.max(0, effectiveGoal - settings.followerCount);

  const handleAutoSyncRealFollowers = async () => {
    setIsSyncingFollowers(true);
    try {
      await fetch('/api/sync-kick-followers', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsSyncingFollowers(false), 500);
    }
  };

  // Generates a new persistent Follower Goal link and saves it in Goal Link History
  const handleApplyGoalAndGenerateLink = async (
    customGoalValue?: number,
    customTemplateId?: CounterTemplateId,
    customFont?: FontFamilyName
  ) => {
    const cleanNum =
      typeof customGoalValue === 'number' && customGoalValue > 0
        ? customGoalValue
        : Number(goalTextInput.replace(/[^0-9]/g, ''));
    const nextGoal =
      Number.isFinite(cleanNum) && cleanNum > 0
        ? Math.round(cleanNum)
        : settings.followerGoal;

    setGoalTextInput(String(nextGoal));
    const nextTitle =
      goalTitleInput.trim() &&
      !goalTitleInput.trim().startsWith('ROAD TO ')
        ? goalTitleInput.trim()
        : `ROAD TO ${nextGoal.toLocaleString()} FOLLOWERS`;
    setGoalTitleInput(nextTitle);

    const nextTemplate = customTemplateId || settings.activeCounterTemplate;
    const nextFont = customFont || activeFont;

    let finalUrl = generatedCounterUrl;

    try {
      const res = await fetch('/api/goal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: nextGoal,
          goalTitle: nextTitle,
          template: nextTemplate,
          font: nextFont,
          showGoal: settings.showGoalOnCounter ?? true,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        item?: GoalLinkHistoryItem;
        settings?: AppSettings;
      };
      if (json?.settings) {
        await onUpdateSettings({ goalLinkHistory: json.settings.goalLinkHistory });
      }
      if (json?.item) {
        setActiveGoalLinkId(json.item.id);
        finalUrl = json.item.url;
      }
    } catch {
      await onAdjustCounter({
        exactGoal: nextGoal,
        goalTitle: nextTitle,
      });
    }

    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopiedSingleGoalLink(true);
      setTimeout(() => setCopiedSingleGoalLink(false), 3000);
    } catch {
      // ignore clipboard errors
    }

    setSavedGoalBanner(true);
  };

  // Live-edit goal from main input WITHOUT changing the currently generated OBS link
  const handleLiveEditActiveGoalOnly = async () => {
    const cleanNum = Number(goalTextInput.replace(/[^0-9]/g, ''));
    const nextGoal =
      Number.isFinite(cleanNum) && cleanNum > 0
        ? Math.round(cleanNum)
        : settings.followerGoal;

    const nextTitle =
      goalTitleInput.trim() &&
      !goalTitleInput.trim().startsWith('ROAD TO ')
        ? goalTitleInput.trim()
        : `ROAD TO ${nextGoal.toLocaleString()} FOLLOWERS`;
    setGoalTitleInput(nextTitle);

    if (activeGoalLinkId) {
      await handleLiveUpdateHistoryItem(activeGoalLinkId, nextGoal, nextTitle);
    } else {
      await onAdjustCounter({
        exactGoal: nextGoal,
        goalTitle: nextTitle,
      });
    }
    setSavedGoalBanner(true);
  };

  const handleLiveUpdateHistoryItem = async (
    id: string,
    overrideGoal?: number,
    overrideTitle?: string
  ) => {
    const existing = (settings.goalLinkHistory || []).find((i) => i.id === id);
    if (!existing) return;

    const draftGoalNum =
      typeof overrideGoal === 'number'
        ? overrideGoal
        : Number((historyGoalDrafts[id] ?? String(existing.goal)).replace(/[^0-9]/g, ''));
    const nextGoal =
      Number.isFinite(draftGoalNum) && draftGoalNum > 0
        ? Math.round(draftGoalNum)
        : existing.goal;
    const rawDraftTitle =
      typeof overrideTitle === 'string'
        ? overrideTitle
        : historyTitleDrafts[id] ?? existing.goalTitle;
    const nextTitle =
      rawDraftTitle.trim() && !rawDraftTitle.trim().startsWith('ROAD TO ')
        ? rawDraftTitle.trim()
        : `ROAD TO ${nextGoal.toLocaleString()} FOLLOWERS`;

    const metaDraft = historyMetaDrafts[id] || {};
    const nextLabel =
      typeof metaDraft.label === 'string' && metaDraft.label.trim()
        ? metaDraft.label.trim()
        : existing.label;
    const nextTemplate = metaDraft.template || existing.template;
    const nextFont = metaDraft.font || existing.font;
    const nextShowGoal =
      typeof metaDraft.showGoal === 'boolean'
        ? metaDraft.showGoal
        : existing.showGoal;

    try {
      const res = await fetch(`/api/goal-links/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: nextLabel,
          goal: nextGoal,
          goalTitle: nextTitle,
          template: nextTemplate,
          font: nextFont,
          showGoal: nextShowGoal,
          syncMain: true,
        }),
      });
      const json = (await res.json()) as { settings?: AppSettings };
      if (json?.settings) {
        await onUpdateSettings({
          followerGoal: json.settings.followerGoal,
          goalTitle: json.settings.goalTitle,
          activeCounterTemplate: json.settings.activeCounterTemplate,
          counterFont: json.settings.counterFont,
          goalLinkHistory: json.settings.goalLinkHistory,
        });
      }
      setSavedHistoryId(id);
      setTimeout(() => setSavedHistoryId((curr) => (curr === id ? null : curr)), 3500);
    } catch {
      // ignore
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/goal-links/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { settings?: AppSettings };
      if (json?.settings) {
        await onUpdateSettings({ goalLinkHistory: json.settings.goalLinkHistory });
        if (activeGoalLinkId === id) {
          setActiveGoalLinkId(json.settings.goalLinkHistory?.[0]?.id || null);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSelectTemplateAndPromptGoal = async (
    tplId: CounterTemplateId,
    defaultFont: FontFamilyName
  ) => {
    await onUpdateSettings({
      activeCounterTemplate: tplId,
      counterFont: defaultFont,
    });
    setSavedGoalBanner(true);
    goalConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      goalInputFieldRef.current?.focus();
      goalInputFieldRef.current?.select();
    }, 300);
  };

  const handleCopyCounterLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedCounterUrl);
    } catch {
      // ignore
    }
    setCopiedSingleGoalLink(true);
    await onUpdateSettings({
      setupChecklist: {
        ...settings.setupChecklist,
        obsStep1LinksCopied: true,
      },
    });
    setTimeout(() => setCopiedSingleGoalLink(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Live Interactive Follower Goal Stage + Auto-Detected Follower & Goal Customizer */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="text-xs font-mono text-[#53FC18] uppercase tracking-wider">
              Interactive Follower Goal Stage · Auto-Detects Real Followers + Animated Goal Bar
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {activeTemplateMeta.name} ({activeFont})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-Detected Real Followers Badge */}
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#070B10] border border-[#53FC18]/50 px-3.5 py-2 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-[#53FC18] animate-pulse" />
              <span className="text-slate-300">Auto-Detected Real Followers:</span>
              <strong className="text-[#53FC18] text-sm font-black tabular-nums">
                {settings.followerCount.toLocaleString()}
              </strong>
              <button
                type="button"
                onClick={handleAutoSyncRealFollowers}
                title="Sync Live Follower Count from Kick"
                className="ml-1 p-1 rounded bg-slate-800 hover:bg-slate-700 text-[#53FC18] cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isSyncingFollowers ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={onTriggerMilestone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-2 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Test Goal Reached Fanfare</span>
            </button>
          </div>
        </div>

        {/* Spacious Live Counter & Goal Preview Box */}
        <div className="rounded-xl bg-[#05080D] border border-slate-800/80 px-4 py-6 sm:px-6 sm:py-8 flex flex-col items-center justify-center">
          <CounterCardRenderer
            template={settings.activeCounterTemplate}
            font={activeFont}
            count={settings.followerCount}
            goal={effectiveGoal}
            goalTitle={
              goalTitleInput.trim() ||
              `ROAD TO ${effectiveGoal.toLocaleString()} FOLLOWERS`
            }
            showGoal={settings.showGoalOnCounter ?? true}
            recentFollowers={settings.recentFollowers}
            previewUsername={previewUsername}
            customAvatarUrl={settings.customAvatarUrl}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 w-full max-w-lg text-xs text-slate-400">
            <span>
              Live Progress:{' '}
              <strong className="text-[#53FC18] font-mono tabular-nums">
                {settings.followerCount.toLocaleString()} /{' '}
                {effectiveGoal.toLocaleString()} FOLLOWERS ({pct}%)
              </strong>{' '}
              · {remainingToGoal.toLocaleString()} to go
            </span>
            <div className="flex items-center gap-2">
              <span>Preview Recent Follower:</span>
              <input
                type="text"
                aria-label="Preview Recent Follower Username"
                value={previewUsername}
                onChange={(e) => onPreviewUsernameChange(e.target.value)}
                placeholder="Follower username..."
                className="rounded bg-[#070A0F] border border-slate-700 px-2.5 py-1 text-xs font-mono font-bold text-[#53FC18] w-40 focus:outline-none focus:border-[#53FC18]"
              />
            </div>
          </div>
        </div>

        {/* All-in-One Follower Goal Setup Bar (Same System as Follower Pop Alert: Select Template -> Enter/Select Goal -> Apply & Generate Single Link) */}
        <div
          ref={goalConfigRef}
          data-testid="unified-counter-goal-bar"
          className="mt-6 rounded-xl bg-[#080C12] border border-[#53FC18]/40 p-5 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#53FC18]">
                Follower Goal Setup · Real Followers Auto-Detected ({settings.followerCount.toLocaleString()})
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Step 1: Select Template &rarr; Step 2: Enter or Select How Much Goal You Have &rarr; Apply &amp; Get Single Link
              </h3>
            </div>

            <button
              type="button"
              data-testid="apply-goal-and-generate-link-btn"
              onClick={() => handleApplyGoalAndGenerateLink()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-extrabold text-xs px-4 py-2.5 shadow-[0_0_20px_rgba(83,252,24,0.3)] transition-all cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Apply Follower Goal &amp; Generate Single OBS Link</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Select Template */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3.5 space-y-2">
              <label
                htmlFor="counter-template-select"
                className="block text-[11px] font-mono uppercase text-slate-400"
              >
                1. Select Follower Goal Template
              </label>
              <select
                id="counter-template-select"
                value={settings.activeCounterTemplate}
                onChange={(e) => {
                  const nextTpl = e.target.value as CounterTemplateId;
                  onUpdateSettings({ activeCounterTemplate: nextTpl });
                  setSavedGoalBanner(true);
                }}
                className="w-full rounded-lg bg-[#0B1018] border border-slate-700 px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
              >
                {COUNTER_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400">
                Real Followers:{' '}
                <strong className="text-[#53FC18] font-mono">
                  {settings.followerCount.toLocaleString()} (Auto-Detected)
                </strong>
              </div>
            </div>

            {/* 2. Enter Follower Goal Manually as Text OR Click Quick Goal Preset */}
            <div className="rounded-lg bg-[#05080D] border border-[#53FC18]/50 p-3.5 space-y-2">
              <label
                htmlFor="manual-follower-goal-text"
                className="block text-[11px] font-mono uppercase text-[#53FC18] font-bold"
              >
                2. How Much Is Your Follower Goal? (Type or Select)
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={goalInputFieldRef}
                  id="manual-follower-goal-text"
                  type="text"
                  inputMode="numeric"
                  data-testid="manual-goal-text-input"
                  value={goalTextInput}
                  onChange={(e) => setGoalTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLiveEditActiveGoalOnly();
                    }
                  }}
                  placeholder="Enter goal (e.g. 1500)..."
                  className="flex-1 rounded-lg bg-[#0B1018] border border-slate-700 px-3 py-2 text-sm font-mono font-extrabold text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
                />
                <button
                  type="button"
                  data-testid="live-apply-goal-no-link-change-btn"
                  onClick={handleLiveEditActiveGoalOnly}
                  className="px-3 py-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                >
                  Apply Live
                </button>
              </div>

              {/* Quick Goal Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {QUICK_GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setGoalTextInput(String(preset));
                      const nextTitle = `ROAD TO ${preset.toLocaleString()} FOLLOWERS`;
                      setGoalTitleInput(nextTitle);
                      if (activeGoalLinkId) {
                        handleLiveUpdateHistoryItem(activeGoalLinkId, preset, nextTitle);
                      } else {
                        onAdjustCounter({ exactGoal: preset, goalTitle: nextTitle });
                      }
                      setSavedGoalBanner(true);
                    }}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors cursor-pointer ${
                      effectiveGoal === preset
                        ? 'bg-[#53FC18]/20 border-[#53FC18] text-[#53FC18] font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Select Font & Custom Goal Title */}
            <div className="rounded-lg bg-[#05080D] border border-slate-800 p-3.5 space-y-2">
              <label
                htmlFor="counter-font-select"
                className="block text-[11px] font-mono uppercase text-slate-400"
              >
                3. Broadcast Font &amp; Goal Bar Title
              </label>
              <select
                id="counter-font-select"
                value={activeFont}
                onChange={(e) => {
                  onUpdateSettings({
                    counterFont: e.target.value as FontFamilyName,
                  });
                  setSavedGoalBanner(true);
                }}
                className="w-full rounded-lg bg-[#0B1018] border border-slate-700 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#53FC18]"
              >
                {GOOGLE_FONTS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.styleTag})
                  </option>
                ))}
              </select>
              <input
                type="text"
                aria-label="Goal Bar Banner Title"
                value={goalTitleInput}
                onChange={(e) => setGoalTitleInput(e.target.value)}
                onBlur={() => handleApplyGoalAndGenerateLink()}
                placeholder="ROAD TO 1,500 FOLLOWERS"
                className="w-full rounded-lg bg-[#0B1018] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
              />
            </div>
          </div>

          {/* Auto-Updated Single Unified OBS Link for Follower Goal */}
          <div className="rounded-lg bg-[#05070B] border border-[#53FC18]/50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Link2 className="w-4 h-4 text-[#53FC18]" />
                <span>
                  Single Unified Follower Goal OBS Link (Auto-Detects Real Followers + Your Applied Goal):
                </span>
              </div>
              {savedGoalBanner && (
                <span className="text-[11px] font-mono font-bold text-[#53FC18]">
                  ✓ Goal Applied ({effectiveGoal.toLocaleString()} Followers) &amp; Link Auto-Updated!
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#53FC18]/15 border border-[#53FC18]/40 text-[#53FC18]">
                Template: {activeTemplateMeta.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Real Followers: {settings.followerCount.toLocaleString()} (Auto)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[#53FC18] font-bold">
                Follow Goal: {effectiveGoal.toLocaleString()} GOAL
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                Font: {activeFont}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                data-testid="single-unified-counter-url-input"
                aria-label="Single Unified Follower Goal OBS URL"
                value={generatedCounterUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 rounded-lg bg-[#090D14] border border-slate-700 px-3 py-2 text-xs font-mono text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
              />
              <button
                type="button"
                onClick={handleCopyCounterLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-4 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedSingleGoalLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Goal Link!</span>
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

      {/* Streamlabs-Style OBS Link Generator for Counter */}
      <div ref={linkGeneratorRef}>
        <ObsLinkGeneratorPanel
          mode="counter"
          generatedUrl={generatedCounterUrl}
          templateName={activeTemplateMeta.name}
          activeConnections={obsCounts.counter}
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

      {/* Saved Follower Goal Link History (Live Edit Goal Without Changing Your OBS Link!) */}
      <section
        data-testid="goal-link-history-section"
        className="rounded-xl bg-[#0D131C] border border-[#53FC18]/40 p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#53FC18]" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Saved Follower Goal Link History (Edit Goal Live Without Changing OBS Link)
              </h2>
              <p className="text-xs text-slate-400">
                Every Follower Goal link you generate is saved here automatically. Edit its Goal Target anytime below and your OBS Browser Source updates live instantly — zero need to replace the URL in OBS!
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#53FC18] bg-[#53FC18]/10 border border-[#53FC18]/40 px-2.5 py-1 rounded">
            {(settings.goalLinkHistory || []).length} Saved Link(s)
          </span>
        </div>

        {(settings.goalLinkHistory || []).length === 0 ? (
          <div className="rounded-lg bg-[#080C12] border border-slate-800 p-5 text-center space-y-2">
            <p className="text-xs text-slate-400">
              No saved Follower Goal links yet. Click <strong className="text-[#53FC18]">“Apply Follower Goal &amp; Generate Single OBS Link”</strong> above to create and save your first live-editable OBS goal link!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(settings.goalLinkHistory || []).map((item) => {
              const draftGoal = historyGoalDrafts[item.id] ?? String(item.goal);
              const draftTitle = historyTitleDrafts[item.id] ?? item.goalTitle;
              const isJustSaved = savedHistoryId === item.id;
              const isCopied = copiedHistoryId === item.id;
              const isActive = activeGoalLinkId === item.id;

              return (
                <div
                  key={item.id}
                  data-testid={`goal-history-item-${item.id}`}
                  className={`rounded-xl p-4 border transition-all space-y-3 ${
                    isActive
                      ? 'bg-[#080F0B] border-[#53FC18]/60'
                      : 'bg-[#070B11] border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-white">{item.label}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-[#53FC18]">
                        Current Live Goal: {item.goal.toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
                        {item.template} · {item.font}
                      </span>
                      {isJustSaved && (
                        <span className="px-2 py-0.5 rounded bg-[#53FC18]/20 border border-[#53FC18] font-mono text-[11px] font-bold text-[#53FC18]">
                          ✓ Updated Live! Same OBS Link Auto-Synced!
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      aria-label={`Delete saved goal link ${item.label}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* Permanent Link Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      aria-label={`Saved OBS URL for ${item.label}`}
                      value={item.url}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 rounded-lg bg-[#04070B] border border-slate-800 px-3 py-2 text-xs font-mono text-[#53FC18] focus:outline-none"
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
                        setActiveGoalLinkId(item.id);
                        setTimeout(() => setCopiedHistoryId(null), 2200);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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

                  {/* Live Edit Goal Row (Updates OBS Without Changing URL!) */}
                  <div className="rounded-lg bg-[#05080D] border border-slate-800/90 p-3 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Link Label
                        </label>
                        <input
                          type="text"
                          aria-label={`Edit Label for ${item.id}`}
                          value={historyMetaDrafts[item.id]?.label ?? item.label}
                          onChange={(e) =>
                            setHistoryMetaDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], label: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg bg-[#0A1017] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Live Edit Follower Goal
                        </label>
                        <input
                          type="number"
                          min={1}
                          aria-label={`Edit Follower Goal for ${item.id}`}
                          value={draftGoal}
                          onChange={(e) =>
                            setHistoryGoalDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg bg-[#0A1017] border border-slate-700 px-3 py-1.5 text-xs font-mono font-bold text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Live Edit Goal Title
                        </label>
                        <input
                          type="text"
                          aria-label={`Edit Goal Title for ${item.id}`}
                          value={draftTitle}
                          onChange={(e) =>
                            setHistoryTitleDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg bg-[#0A1017] border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Template
                        </label>
                        <select
                          aria-label={`Edit Template for ${item.id}`}
                          value={historyMetaDrafts[item.id]?.template ?? item.template}
                          onChange={(e) =>
                            setHistoryMetaDrafts((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                template: e.target.value as CounterTemplateId,
                              },
                            }))
                          }
                          className="w-full rounded-lg bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
                        >
                          {COUNTER_TEMPLATES.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                          Edit Font
                        </label>
                        <select
                          aria-label={`Edit Font for ${item.id}`}
                          value={historyMetaDrafts[item.id]?.font ?? item.font}
                          onChange={(e) =>
                            setHistoryMetaDrafts((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                font: e.target.value as FontFamilyName,
                              },
                            }))
                          }
                          className="w-full rounded-lg bg-[#0A1017] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
                        >
                          {GOOGLE_FONTS.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryMetaDrafts((prev) => {
                              const currentVal = prev[item.id]?.showGoal ?? item.showGoal;
                              return {
                                ...prev,
                                [item.id]: { ...prev[item.id], showGoal: !currentVal },
                              };
                            })
                          }
                          className={`w-full rounded-lg px-2 py-1.5 text-[11px] font-mono font-bold border cursor-pointer ${
                            (historyMetaDrafts[item.id]?.showGoal ?? item.showGoal)
                              ? 'bg-[#53FC18]/15 border-[#53FC18] text-[#53FC18]'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {(historyMetaDrafts[item.id]?.showGoal ?? item.showGoal) ? 'BAR ON' : 'BAR OFF'}
                        </button>
                      </div>

                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          data-testid={`save-live-history-goal-${item.id}`}
                          onClick={() => handleLiveUpdateHistoryItem(item.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3 py-2 transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Update Goal Live</span>
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

      {/* 6 Ultra-Premium Follower Counter & Goal Templates Grid (Select Template -> Enter Goal -> Generate Link) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            6 Ultra-Premium Follower Goal &amp; Live Counter Templates
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select any template below, enter your Follower Goal as text, and click Apply &amp; Generate Link — real followers ({settings.followerCount.toLocaleString()}) are detected automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {COUNTER_TEMPLATES.map((tpl) => {
            const isSelected = settings.activeCounterTemplate === tpl.id;
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

                  <div className="my-2 rounded-lg bg-[#05080D] border border-slate-800/80 p-3 sm:p-4 flex items-center justify-center">
                    <CounterCardRenderer
                      template={tpl.id}
                      font={tpl.defaultFont}
                      count={settings.followerCount}
                      goal={effectiveGoal}
                      goalTitle={
                        goalTitleInput.trim() ||
                        `ROAD TO ${effectiveGoal.toLocaleString()} FOLLOWERS`
                      }
                      showGoal={settings.showGoalOnCounter ?? true}
                      recentFollowers={settings.recentFollowers}
                      previewUsername={previewUsername}
                      customAvatarUrl={settings.customAvatarUrl}
                    />
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mt-3">
                    {tpl.description}
                  </p>
                </div>

                {/* Inline Follower Goal Input + Apply & Generate Link on Every Template Card */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#53FC18] shrink-0" />
                    <span className="text-xs font-mono text-slate-300 whitespace-nowrap">
                      Set Follow Goal:
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Set Follower Goal for ${tpl.name}`}
                      value={goalTextInput}
                      onChange={(e) => setGoalTextInput(e.target.value)}
                      placeholder="e.g. 1500"
                      className="flex-1 rounded-lg bg-[#070A0F] border border-slate-700 px-2.5 py-1.5 text-xs font-mono font-bold text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectTemplateAndPromptGoal(
                          tpl.id as CounterTemplateId,
                          tpl.defaultFont
                        )
                      }
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#53FC18]/20 text-[#53FC18] border border-[#53FC18]/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSelected ? 'Active Template' : 'Select Template & Goal'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleApplyGoalAndGenerateLink(
                          undefined,
                          tpl.id as CounterTemplateId,
                          tpl.defaultFont
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs py-2.5 px-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Apply Goal &amp; Generate Link</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Save Follower Goal & Generate Single OBS Link Box */}
        <div
          data-testid="bottom-counter-save-and-generate-box"
          className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4 mt-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#53FC18]">
                <Save className="w-4 h-4" />
                <span>Save Follower Goal Settings &amp; Generate Single OBS Link</span>
              </div>
              <p className="text-xs text-slate-300">
                Auto-detects real followers (<strong className="text-[#53FC18]">{settings.followerCount.toLocaleString()}</strong>) and bundles your selected{' '}
                <strong className="text-white">Template ({settings.activeCounterTemplate})</strong>,{' '}
                <strong className="text-white">Font ({activeFont})</strong>, and{' '}
                <strong className="text-white">Follow Goal ({effectiveGoal.toLocaleString()})</strong> into a single OBS link below.
              </p>
            </div>

            <button
              type="button"
              data-testid="bottom-counter-save-generate-btn"
              onClick={() => handleApplyGoalAndGenerateLink()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-black text-xs px-6 py-3 transition-all shadow-[0_0_24px_rgba(83,252,24,0.35)] cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Save Goal &amp; Generate Single Link Below</span>
            </button>
          </div>

          <div
            className={`rounded-xl p-4 border transition-all space-y-3 ${
              savedGoalBanner
                ? 'bg-[#53FC18]/10 border-[#53FC18] shadow-[0_0_25px_rgba(83,252,24,0.16)]'
                : 'bg-[#070A0F] border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-[#53FC18] uppercase tracking-wider">
                {savedGoalBanner
                  ? '✓ Follower Goal Saved! Your Single Unified OBS Counter & Goal Link:'
                  : 'Generated Single OBS Follower Counter & Goal Link:'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Real Followers: <strong className="text-[#53FC18]">{settings.followerCount.toLocaleString()}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Follow Goal: <strong className="text-[#53FC18]">{effectiveGoal.toLocaleString()}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  Template: <strong className="text-[#53FC18]">{settings.activeCounterTemplate}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                readOnly
                data-testid="bottom-counter-generated-link-input"
                aria-label="Bottom Generated Single OBS Counter Link"
                value={generatedCounterUrl}
                className="flex-1 rounded-lg bg-[#05070B] border border-[#53FC18]/50 px-3.5 py-2.5 text-xs font-mono text-[#53FC18] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyCounterLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-5 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedSingleGoalLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSingleGoalLink ? 'Single Link Copied!' : 'Copy Single OBS Link'}</span>
              </button>
              <a
                href={generatedCounterUrl}
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
