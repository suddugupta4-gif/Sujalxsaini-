import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import type { CounterTemplateId, FontFamilyName, RecentFollower } from '../types';
import {
  calculateGoalPercentage,
  generateGamerAvatarDataUri,
  getFollowerAvatarUrl,
  getLatestFollowOnlyEntries,
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
  showRecentFollower?: boolean;
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
  showRecentFollower = false,
  recentFollowers,
  previewUsername,
  customAvatarUrl,
}) => {
  const pct = calculateGoalPercentage(count, goal);
  const remaining = Math.max(0, goal - count);
  const shouldShowGoal = showGoal || !showRecentFollower;

  // Strictly filter to actual follow events (never kicks/sub-gifts/sub-buys)
  const uniqueFollowers = getLatestFollowOnlyEntries(
    recentFollowers,
    previewUsername,
    customAvatarUrl
  );
  const currentRecent = uniqueFollowers[0] || { username: 'RohanGamingIN' };

  const fontStyle = { fontFamily: `'${font}', sans-serif` };
  const crispReadFontStack = "'Outfit', 'Rajdhani', system-ui, -apple-system, sans-serif";
  const crispShadow =
    '0 2px 4px rgba(0, 0, 0, 1), 0 0 2px rgba(0, 0, 0, 1)';
  const boldStrokeStyle = {
    WebkitTextStroke: '0.35px currentColor',
  };

  // High-Contrast Goal Progress Bar & Crystal-Clear Bold Follower Count Readout
  const renderAnimatedGoalProgressBar = (
    barGradientClass: string,
    accentHex: string,
    trackBorderClass: string
  ) => (
    <div>
      {/* Row 1: Bold Goal Title + Large Crisp Percentage Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          style={{ ...fontStyle, ...boldStrokeStyle, textShadow: crispShadow }}
          className="text-sm sm:text-lg font-black tracking-wide text-white uppercase whitespace-nowrap truncate"
        >
          {goalTitle || `ROAD TO ${goal.toLocaleString()} FOLLOWERS`}
        </span>
        <span
          style={{
            color: '#FFFFFF',
            borderColor: accentHex,
            backgroundColor: '#04070B',
            textShadow: crispShadow,
          }}
          className="px-2.5 py-0.5 rounded-md border-2 text-sm sm:text-base font-mono font-black tabular-nums whitespace-nowrap shrink-0"
        >
          {pct}%
        </span>
      </div>

      {/* Row 2: Solid High-Contrast Progress Bar Track */}
      <div
        className={`relative h-4 sm:h-4.5 w-full rounded-full bg-[#020408] overflow-hidden border-2 ${trackBorderClass}`}
      >
        <motion.div
          initial={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{
            backgroundColor: accentHex,
            boxShadow: `0 0 12px ${accentHex}`,
          }}
          className={`relative h-full rounded-full ${barGradientClass}`}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-progress-stripes"
          />
          <span
            aria-hidden="true"
            style={{ boxShadow: `0 0 10px #ffffff, 0 0 14px ${accentHex}` }}
            className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full"
          />
        </motion.div>
      </div>

      {/* Row 3: Prominent Heavy Bold Follower Count + Goal & Remaining */}
      <div
        style={{ fontFamily: crispReadFontStack, textShadow: crispShadow }}
        className="flex items-baseline justify-between gap-2 mt-2.5 tabular-nums"
      >
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            style={boldStrokeStyle}
            className="text-xl sm:text-2xl font-black text-white leading-none"
          >
            {count.toLocaleString()}
          </span>
          <span
            style={boldStrokeStyle}
            className="text-sm sm:text-base font-black text-white/95 tracking-wide leading-none"
          >
            / {goal.toLocaleString()} FOLLOWERS
          </span>
        </div>
        <span
          style={{ color: accentHex, ...boldStrokeStyle }}
          className="text-sm sm:text-base font-black uppercase tracking-wide whitespace-nowrap shrink-0"
        >
          {remaining > 0 ? `${remaining.toLocaleString()} TO GO` : 'GOAL REACHED!'}
        </span>
      </div>
    </div>
  );

  // Crystal-Clear Recent Follower Row on Solid Dark Backdrop:
  // Full-width pure crisp white username + clear subtitle + compact badge on row 2
  const renderAnimatedRecentFollowsRow = (accentHex: string, hasTopDivider = true) => {
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
      <div
        className={`${
          hasTopDivider ? 'mt-3 pt-2.5 border-t border-white/15' : ''
        }`}
      >
        <div className="rounded-xl bg-[#0B111A] border border-white/20 px-3 py-2.5 flex items-center gap-3">
          {/* Crisp Follower PFP */}
          <div
            style={{
              borderColor: accentHex,
              boxShadow: `0 0 10px ${accentHex}44`,
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 bg-[#04070B] shrink-0"
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

          {/* Right Column: Full-Width Crisp White Username + Clear Subtitle & Compact Badge */}
          <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
            <AutoFitUsername
              text={currentRecent.username}
              fontFamily={crispReadFontStack}
              mode="counter-recent"
              colorHex="#FFFFFF"
              textShadow={crispShadow}
              sharp
            />

            <div className="flex items-center justify-between gap-2 mt-1">
              <div
                style={{ fontFamily: crispReadFontStack, textShadow: crispShadow }}
                className="inline-flex items-center gap-1.5 min-w-0"
              >
                <span
                  style={{ backgroundColor: accentHex }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span className="text-sm sm:text-[15px] font-black text-white whitespace-nowrap truncate">
                  started following
                </span>
              </div>

              <span
                style={{
                  color: accentHex,
                  borderColor: `${accentHex}85`,
                  backgroundColor: '#05080D',
                }}
                className="px-1.5 sm:px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider whitespace-nowrap shrink-0 inline-flex items-center gap-1"
              >
                <Zap className="w-2.5 h-2.5 shrink-0" />
                <span className="sm:hidden">NEW</span>
                <span className="hidden sm:inline">RECENT FOLLOW</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (template === 'neon') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-xl bg-[#05080C] border-2 border-[#53FC18] neon-pulse-green p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#53FC18] to-transparent animate-laser-scan"
          />

          {shouldShowGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-[#16A34A] via-[#22C55E] to-[#53FC18]',
              '#53FC18',
              'border-[#53FC18]/50'
            )}

          {showRecentFollower && renderAnimatedRecentFollowsRow('#53FC18', shouldShowGoal)}
        </div>
      </div>
    );
  }

  if (template === 'gold') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-xl bg-[#0B0905] border-2 border-[#FFD700] neon-pulse-gold p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent animate-shimmer"
          />

          <div className="relative z-10">
            {shouldShowGoal &&
              renderAnimatedGoalProgressBar(
                'bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#FFF3B0]',
                '#FFD700',
                'border-[#FFD700]/50'
              )}

            {showRecentFollower && renderAnimatedRecentFollowsRow('#FFD700', shouldShowGoal)}
          </div>
        </div>
      </div>
    );
  }

  if (template === 'esports') {
    const segments = 10;
    const activeSegments = Math.round((pct / 100) * segments);

    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-lg bg-[#070A12] border-2 border-[#FF0055] neon-pulse-crimson p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#53FC18]"
          />

          {shouldShowGoal && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  style={{ ...fontStyle, ...boldStrokeStyle, textShadow: crispShadow }}
                  className="text-sm sm:text-lg font-black tracking-wide text-white uppercase whitespace-nowrap truncate"
                >
                  {goalTitle || `ROAD TO ${goal.toLocaleString()} FOLLOWERS`}
                </span>
                <span
                  style={{ textShadow: crispShadow }}
                  className="px-2.5 py-0.5 rounded-md border-2 border-[#53FC18] bg-[#04070B] text-white tabular-nums text-sm sm:text-base font-mono font-black whitespace-nowrap shrink-0"
                >
                  {pct}%
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: segments }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-3.5 rounded-xs transition-all duration-300 ${
                      idx < activeSegments
                        ? 'bg-gradient-to-r from-[#FF0055] to-[#53FC18]'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div
                style={{ fontFamily: crispReadFontStack, textShadow: crispShadow }}
                className="flex items-baseline justify-between gap-2 mt-2.5 tabular-nums"
              >
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span
                    style={boldStrokeStyle}
                    className="text-xl sm:text-2xl font-black text-white leading-none"
                  >
                    {count.toLocaleString()}
                  </span>
                  <span
                    style={boldStrokeStyle}
                    className="text-sm sm:text-base font-black text-white/95 tracking-wide leading-none"
                  >
                    / {goal.toLocaleString()} FOLLOWERS
                  </span>
                </div>
                <span
                  style={boldStrokeStyle}
                  className="text-[#53FC18] text-sm sm:text-base font-black uppercase tracking-wide whitespace-nowrap shrink-0"
                >
                  {remaining > 0 ? `${remaining.toLocaleString()} TO GO` : 'GOAL REACHED!'}
                </span>
              </div>
            </div>
          )}

          {showRecentFollower && renderAnimatedRecentFollowsRow('#53FC18', shouldShowGoal)}
        </div>
      </div>
    );
  }

  if (template === 'glass') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-2xl bg-[#070D17] border-2 border-sky-400/85 shadow-[0_0_24px_rgba(56,189,248,0.35)] p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
          {shouldShowGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-sky-400 via-emerald-300 to-fuchsia-400',
              '#38BDF8',
              'border-sky-400/50'
            )}

          {showRecentFollower && renderAnimatedRecentFollowsRow('#38BDF8', shouldShowGoal)}
        </div>
      </div>
    );
  }

  if (template === 'matrix') {
    return (
      <div className="p-2 w-full">
        <div className="relative overflow-hidden rounded-xl bg-[#040B07] border-2 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)] p-4 sm:p-5 text-white font-mono w-full max-w-lg mx-auto">
          {shouldShowGoal &&
            renderAnimatedGoalProgressBar(
              'bg-gradient-to-r from-emerald-500 to-[#53FC18]',
              '#53FC18',
              'border-emerald-400/50'
            )}

          {showRecentFollower && renderAnimatedRecentFollowsRow('#53FC18', shouldShowGoal)}
        </div>
      </div>
    );
  }

  // 'holo' — Holographic Chrome Ticker
  return (
    <div className="p-2 w-full">
      <div className="relative overflow-hidden rounded-xl bg-[#0D071A] border-2 border-fuchsia-400 shadow-[0_0_24px_rgba(232,121,249,0.45)] p-4 sm:p-5 text-white w-full max-w-lg mx-auto">
        {shouldShowGoal &&
          renderAnimatedGoalProgressBar(
            'bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300',
            '#F0ABFC',
            'border-fuchsia-400/50'
          )}

        {showRecentFollower && renderAnimatedRecentFollowsRow('#F0ABFC', shouldShowGoal)}
      </div>
    </div>
  );
};
