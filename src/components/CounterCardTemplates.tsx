import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Heart, Terminal, Radio, Sparkles, Zap } from 'lucide-react';
import type { CounterTemplateId, FontFamilyName, RecentFollower } from '../types';
import {
  calculateGoalPercentage,
  generateGamerAvatarDataUri,
  getFollowerAvatarUrl,
} from '../utils/logic';
import { AutoFitUsername } from './AutoFitUsername';

export interface CounterTemplateMeta {
  id: CounterTemplateId;
  name: string;
  subtitle: string;
  accentColor: string;
  defaultFont: FontFamilyName;
  description: string;
}

export const COUNTER_TEMPLATES: CounterTemplateMeta[] = [
  {
    id: 'neon',
    name: 'Kick Neon Pulse Pro',
    subtitle: 'Glowing #53FC18 Tube, Animated Goal Bar & Follower PFP',
    accentColor: '#53FC18',
    defaultFont: 'Orbitron',
    description:
      'Glowing #53FC18 neon tube frame, real follower count & full goal title progress bar with animated plasma stripes, and recent follower PFP + "started following" box.',
  },
  {
    id: 'gold',
    name: 'Royal Gold & Obsidian Crest',
    subtitle: '3D Metallic Plaque, Sovereign Goal Bar & Follower PFP',
    accentColor: '#FFD700',
    defaultFont: 'Cinzel',
    description:
      '3D luxury dark metallic badge with sweeping gold light reflection, animated golden goal bar, and recent follower PFP + "started following" box.',
  },
  {
    id: 'esports',
    name: 'Tactical Broadcast HUD',
    subtitle: 'Valorant HUD Bar, Segmented Armor Goal & Follower PFP',
    accentColor: '#FF0055',
    defaultFont: 'Chakra Petch',
    description:
      'Tactical esports overlay bar with LIVE indicator, segmented armor-style animated goal progress bar, and recent follower PFP + "started following" box.',
  },
  {
    id: 'glass',
    name: 'Spatial Glass Floating Pill',
    subtitle: 'Frosted VisionOS Pill, Fluid Goal Bar & Follower PFP',
    accentColor: '#38BDF8',
    defaultFont: 'Outfit',
    description:
      'Sleek frosted glass widget with beating neon heart, animated spatial goal progress bar, and recent follower PFP + "started following" box.',
  },
  {
    id: 'matrix',
    name: 'Cyberpunk Matrix Terminal',
    subtitle: 'CRT Scanline Odometer, Terminal Goal & Follower PFP',
    accentColor: '#10B981',
    defaultFont: 'JetBrains Mono',
    description:
      'Retro CRT scanline card with glowing emerald borders, real-time terminal goal progress bar, and recent follower PFP + "started following" box.',
  },
  {
    id: 'holo',
    name: 'Holographic Chrome Ticker',
    subtitle: 'Live Count, Holo Goal Bar & Follower PFP',
    accentColor: '#E879F9',
    defaultFont: 'Syne',
    description:
      'Iridescent chrome-bordered widget showing the live Follower Count, animated holographic goal bar, and recent follower PFP + "started following" box.',
  },
];

interface CounterCardProps {
  template: CounterTemplateId;
  font: FontFamilyName;
  count: number;
  goal: number;
  goalTitle: string;
  showGoal: boolean;
  recentFollowers: RecentFollower[];
  previewUsername?: string;
  customAvatarUrl?: string;
}

export const CounterCardRenderer: React.FC<CounterCardProps> = ({
  template,
  font,
  count,
  goal,
  goalTitle,
  showGoal,
  recentFollowers,
  previewUsername,
  customAvatarUrl,
}) => {
  const pct = calculateGoalPercentage(count, goal);
  const remaining = Math.max(0, goal - count);

  // Build a clean, deduplicated list of follower entries with PFP support
  const rawEntries: { username: string; avatarUrl?: string }[] = [
    ...(previewUsername && previewUsername.trim()
      ? [{ username: previewUsername.trim(), avatarUrl: customAvatarUrl }]
      : []),
    ...(recentFollowers && recentFollowers.length > 0
      ? recentFollowers
          .filter((f) => f.username && f.username.trim())
          .map((f) => ({
            username: f.username.trim(),
            avatarUrl: f.avatarUrl || customAvatarUrl,
          }))
      : []),
    { username: 'RohanGamingIN' },
    { username: 'AaravSniper_IN' },
    { username: 'ApexValkyrie' },
    { username: 'KaranClutchX' },
  ];

  const uniqueFollowers: { username: string; avatarUrl?: string }[] = [];
  for (const item of rawEntries) {
    if (
      !uniqueFollowers.some(
        (existing) =>
          existing.username.toLowerCase() === item.username.toLowerCase()
      )
    ) {
      uniqueFollowers.push(item);
    }
    if (uniqueFollowers.length >= 5) break;
  }

  const [activeFollowerIdx, setActiveFollowerIdx] = useState(0);

  useEffect(() => {
    if (previewUsername && previewUsername.trim()) {
      setActiveFollowerIdx(0);
    }
  }, [previewUsername]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveFollowerIdx((prev) => (prev + 1) % uniqueFollowers.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [uniqueFollowers.length]);

  const currentRecent =
    uniqueFollowers[activeFollowerIdx % uniqueFollowers.length] ||
    uniqueFollowers[0] || { username: 'RohanGamingIN' };

  const fontStyle = { fontFamily: `'${font}', sans-serif` };

  // Full-visibility Goal Progress Bar:
  // Row 1: Full Goal Title (never crushed to "RO...") + Percentage pill
  // Row 2: Glowing animated plasma progress bar
  // Row 3: Real Count / Goal on left + Remaining TO GO on right
  const renderAnimatedGoalProgressBar = (
    barGradientClass: string,
    accentHex: string,
    trackBorderClass: string
  ) => (
    <div className="mt-3 pt-2.5 border-t border-white/15">
      {/* Row 1: Full Goal Title + Percentage */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] sm:text-xs font-extrabold tracking-wider text-white uppercase whitespace-nowrap truncate">
          {goalTitle || 'ROAD TO 1.5K FOLLOWERS'}
        </span>
        <span
          style={{
            color: accentHex,
            borderColor: `${accentHex}55`,
            backgroundColor: `${accentHex}18`,
          }}
          className="px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-mono font-extrabold tabular-nums whitespace-nowrap shrink-0"
        >
          {pct}%
        </span>
      </div>

      {/* Row 2: Animated VFX Progress Bar Track */}
      <div
        className={`relative h-3 w-full rounded-full bg-black/90 overflow-hidden border ${trackBorderClass}`}
      >
        <motion.div
          initial={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{
            backgroundColor: accentHex,
            boxShadow: `0 0 14px ${accentHex}`,
          }}
          className={`relative h-full rounded-full ${barGradientClass}`}
        >
          {/* Animated diagonal plasma stripes overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-progress-stripes"
          />
          {/* Leading-edge glowing spark VFX */}
          <span
            aria-hidden="true"
            style={{ boxShadow: `0 0 12px #ffffff, 0 0 18px ${accentHex}` }}
            className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full animate-pulse"
          />
        </motion.div>
      </div>

      {/* Row 3: Real Follower Count / Target + Remaining Count */}
      <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] font-mono tabular-nums">
        <span style={{ color: accentHex }} className="font-bold whitespace-nowrap">
          {count.toLocaleString()} / {goal.toLocaleString()} FOLLOWERS
        </span>
        <span className="text-slate-300 font-semibold whitespace-nowrap">
          {remaining > 0 ? `${remaining.toLocaleString()} TO GO` : 'GOAL REACHED!'}
        </span>
      </div>
    </div>
  );

  // Recent Follow Box with Follower PFP + Top Username + Bottom "started following"
  const renderAnimatedRecentFollowsRow = (accentHex: string) => {
    const pfpSrc = getFollowerAvatarUrl(
      currentRecent.username,
      currentRecent.avatarUrl,
      accentHex
    );
    const fallbackSrc = generateGamerAvatarDataUri(
      currentRecent.username,
      accentHex
    );

    return (
      <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between gap-2.5">
        {/* Left: Follower PFP + Top Username + Bottom "started following" */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            style={{
              borderColor: accentHex,
              boxShadow: `0 0 12px ${accentHex}55`,
            }}
            className="w-9 h-9 rounded-lg overflow-hidden border bg-[#060A0F] shrink-0"
          >
            <img
              src={pfpSrc}
              alt={`${currentRecent.username} PFP`}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== fallbackSrc) {
                  target.src = fallbackSrc;
                }
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div
            style={fontStyle}
            className="min-w-0 flex-1 flex flex-col items-start justify-center text-left"
          >
            {/* TOP: Follower Username (Auto-Shrinks Long Usernames to Fit Box) */}
            <AutoFitUsername
              text={currentRecent.username}
              fontFamily={`'${font}', sans-serif`}
              mode="counter-recent"
              colorHex={accentHex}
              textShadow={`0 0 10px ${accentHex}80`}
              className="font-black"
            />
            {/* BOTTOM: started following (Auto-Fits Box) */}
            <AutoFitUsername
              text="started following"
              fontFamily={`'${font}', sans-serif`}
              mode="subtitle-compact"
              colorHex="#FFFFFF"
              textShadow="0 0 8px rgba(255, 255, 255, 0.45)"
              className="font-bold mt-0.5"
            />
          </div>
        </div>

        {/* Right: Compact Recent Badge */}
        <span
          style={{
            color: accentHex,
            borderColor: `${accentHex}55`,
            backgroundColor: `${accentHex}18`,
          }}
          className="px-2 py-1 rounded border text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap shrink-0 inline-flex items-center gap-1"
        >
          <Zap className="w-3 h-3 shrink-0" />
          <span>RECENT FOLLOW</span>
        </span>
      </div>
    );
  };

  if (template === 'neon') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-xl bg-[#070B0E]/95 border-2 border-[#53FC18] neon-pulse-green p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#53FC18] to-transparent animate-laser-scan"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#53FC18]/20 border border-[#53FC18] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(83,252,24,0.45)]">
                <span
                  className="text-xl sm:text-2xl font-black text-[#53FC18]"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  K
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#53FC18] uppercase whitespace-nowrap truncate">
                  SUJALXSAINI · FOLLOWERS
                </div>
                <div
                  style={fontStyle}
                  className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white whitespace-nowrap leading-tight"
                >
                  {count.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-right font-mono tabular-nums shrink-0">
              <div className="text-[10px] text-slate-400 uppercase whitespace-nowrap">
                FOLLOW GOAL
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#53FC18] whitespace-nowrap">
                {goal.toLocaleString()} GOAL
              </div>
            </div>
          </div>

          {showGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-[#16A34A] via-[#22C55E] to-[#53FC18]',
              '#53FC18',
              'border-[#53FC18]/45'
            )}

          {renderAnimatedRecentFollowsRow('#53FC18')}
        </div>
      </div>
    );
  }

  if (template === 'gold') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#161209]/95 via-[#0B0905]/95 to-[#161209]/95 border-2 border-[#FFD700] neon-pulse-gold p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/12 to-transparent animate-shimmer"
          />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFD700]/20 border border-[#FFD700] flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-[#FFD700]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#FFD700] uppercase whitespace-nowrap truncate">
                  SUJALXSAINI · FOLLOWERS
                </div>
                <div
                  style={{
                    ...fontStyle,
                    color: '#FFD700',
                    textShadow: '0 0 14px rgba(255, 215, 0, 0.55)',
                  }}
                  className="text-2xl sm:text-3xl font-bold tabular-nums whitespace-nowrap leading-tight"
                >
                  {count.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-right font-mono tabular-nums shrink-0">
              <div className="text-[10px] text-amber-200/70 uppercase whitespace-nowrap">
                FOLLOW GOAL
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#FFD700] whitespace-nowrap">
                {goal.toLocaleString()} GOAL
              </div>
            </div>
          </div>

          {showGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#FFF3B0]',
              '#FFD700',
              'border-[#FFD700]/45'
            )}

          {renderAnimatedRecentFollowsRow('#FFD700')}
        </div>
      </div>
    );
  }

  if (template === 'esports') {
    const segments = 10;
    const activeSegments = Math.round((pct / 100) * segments);

    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-lg bg-[#0B0E17]/95 border-2 border-[#FF0055] neon-pulse-crimson p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#53FC18]"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#FF0055] whitespace-nowrap">
                <Radio className="w-3.5 h-3.5 text-[#FF0055] shrink-0" />
                <span>LIVE · SUJALXSAINI FOLLOWERS</span>
              </div>
              <div
                style={fontStyle}
                className="text-2xl sm:text-3xl font-bold tabular-nums tracking-wider text-white whitespace-nowrap leading-tight mt-0.5"
              >
                {count.toLocaleString()}
              </div>
            </div>

            <div className="text-right font-mono tabular-nums shrink-0">
              <div className="text-[10px] text-slate-400 uppercase whitespace-nowrap">
                FOLLOW GOAL
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#53FC18] whitespace-nowrap">
                {goal.toLocaleString()} GOAL
              </div>
            </div>
          </div>

          {showGoal && (
            <div className="mt-3 pt-2.5 border-t border-[#FF0055]/30">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-1.5">
                <span className="text-white uppercase font-bold whitespace-nowrap truncate">
                  {goalTitle || 'ROAD TO 1.5K FOLLOWERS'}
                </span>
                <span className="text-[#53FC18] tabular-nums font-bold whitespace-nowrap shrink-0">
                  {pct}%
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: segments }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2.5 transition-all duration-300 ${
                      idx < activeSegments
                        ? 'bg-gradient-to-r from-[#FF0055] to-[#53FC18] animate-pulse'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] font-mono tabular-nums">
                <span className="text-[#53FC18] font-bold whitespace-nowrap">
                  {count.toLocaleString()} / {goal.toLocaleString()} FOLLOWERS
                </span>
                <span className="text-slate-300 whitespace-nowrap">
                  {remaining > 0 ? `${remaining.toLocaleString()} TO GO` : 'GOAL REACHED!'}
                </span>
              </div>
            </div>
          )}

          {renderAnimatedRecentFollowsRow('#53FC18')}
        </div>
      </div>
    );
  }

  if (template === 'glass') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-2xl backdrop-blur-2xl bg-slate-900/90 border-2 border-sky-400/60 shadow-[0_0_28px_rgba(56,189,248,0.35)] p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-400/20 border border-sky-300/40 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-sky-300 whitespace-nowrap truncate">
                  sujalxsaini · Followers
                </div>
                <div
                  style={fontStyle}
                  className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-white whitespace-nowrap leading-tight"
                >
                  {count.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-right font-mono tabular-nums shrink-0">
              <div className="text-[10px] text-slate-300 uppercase whitespace-nowrap">
                FOLLOW GOAL
              </div>
              <div className="text-xs sm:text-sm font-bold text-sky-300 whitespace-nowrap">
                {goal.toLocaleString()} GOAL
              </div>
            </div>
          </div>

          {showGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-sky-400 via-emerald-300 to-fuchsia-400',
              '#38BDF8',
              'border-sky-400/40'
            )}

          {renderAnimatedRecentFollowsRow('#38BDF8')}
        </div>
      </div>
    );
  }

  if (template === 'matrix') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-xl bg-[#040D08]/95 border-2 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)] p-4 sm:p-5 text-emerald-300 font-mono w-full max-w-lg mx-auto">
          <div className="flex items-center justify-between text-[11px] text-emerald-400 border-b border-emerald-500/30 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 whitespace-nowrap truncate">
              <Terminal className="w-3.5 h-3.5 shrink-0" />
              <span>root@sujalxsaini:~# followers</span>
            </div>
            <span className="text-[#53FC18] font-bold shrink-0">[LIVE]</span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div
              style={fontStyle}
              className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[#53FC18] tracking-wider whitespace-nowrap"
            >
              {count.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 tabular-nums whitespace-nowrap">
              FOLLOW GOAL: <span className="text-white font-bold">{goal.toLocaleString()}</span>
            </div>
          </div>

          {showGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-emerald-500 to-[#53FC18]',
              '#53FC18',
              'border-emerald-500/45'
            )}

          {renderAnimatedRecentFollowsRow('#53FC18')}
        </div>
      </div>
    );
  }

  // 'holo' — Holographic Chrome Ticker
  return (
    <div className="p-2 w-full">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#170B2A]/95 via-[#0B1228]/95 to-[#1F0B24]/95 border-2 border-fuchsia-400 shadow-[0_0_24px_rgba(232,121,249,0.45)] p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-fuchsia-500/25 border border-fuchsia-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-fuchsia-300 whitespace-nowrap truncate">
                SUJALXSAINI · FOLLOWERS
              </div>
              <div
                style={{
                  ...fontStyle,
                  color: '#F0ABFC',
                  textShadow: '0 0 12px rgba(232, 121, 249, 0.65)',
                }}
                className="text-2xl sm:text-3xl font-extrabold tabular-nums whitespace-nowrap leading-tight"
              >
                {count.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="text-right font-mono tabular-nums shrink-0">
            <div className="text-[10px] text-cyan-200 uppercase whitespace-nowrap">
              FOLLOW GOAL
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-300 whitespace-nowrap">
              {goal.toLocaleString()} GOAL
            </div>
          </div>
        </div>

        {showGoal &&
          renderAnimatedGoalProgressBar(
            'bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300',
            '#F0ABFC',
            'border-fuchsia-400/45'
          )}

        {renderAnimatedRecentFollowsRow('#F0ABFC')}
      </div>
    </div>
  );
};
