import React from 'react';
import { Crown, Crosshair, Heart, Zap, Star } from 'lucide-react';
import type { AlertTemplateId, FontFamilyName } from '../types';
import {
  generateGamerAvatarDataUri,
  getFollowerAvatarUrl,
} from '../utils/logic';
import { AutoFitUsername } from './AutoFitUsername';

export interface AlertTemplateMeta {
  id: AlertTemplateId;
  name: string;
  subtitle: string;
  accentColor: string;
  defaultFont: FontFamilyName;
  description: string;
}

export const ALERT_TEMPLATES: AlertTemplateMeta[] = [
  {
    id: 'neon',
    name: 'Kick Apex Cyber',
    subtitle: 'Signature #53FC18 Laser Rectangle + Follower PFP',
    accentColor: '#53FC18',
    defaultFont: 'Orbitron',
    description:
      'Sleek compact horizontal rectangle box with #53FC18 laser border VFX, live Follower PFP avatar, auto-fitting top username, and bottom animated "started following" text.',
  },
  {
    id: 'gold',
    name: 'Imperial Sovereign VIP Gold',
    subtitle: 'Brushed Gold Plaque Rectangle + Follower PFP',
    accentColor: '#FFD700',
    defaultFont: 'Cinzel',
    description:
      'Luxury metallic gold & obsidian horizontal rectangle box with shimmering light sweep VFX, live Follower PFP avatar, auto-fitting top username, and bottom animated "started following" text.',
  },
  {
    id: 'esports',
    name: 'Radiant Protocol Tactical HUD',
    subtitle: 'Valorant Crimson & Emerald HUD + Follower PFP',
    accentColor: '#FF0055',
    defaultFont: 'Chakra Petch',
    description:
      'Sharp tactical HUD rectangle box with crimson & emerald laser accents, live Follower PFP avatar, auto-fitting top username, and bottom animated "started following" text.',
  },
  {
    id: 'glass',
    name: 'VisionOS Spatial Frosted Glass',
    subtitle: 'Iridescent Frosted Rectangle + Follower PFP',
    accentColor: '#38BDF8',
    defaultFont: 'Outfit',
    description:
      'Spatial frosted glass rectangle box with iridescent light refraction VFX, live Follower PFP avatar, auto-fitting top username, and bottom animated "started following" text.',
  },
  {
    id: 'anime',
    name: 'Anime Overdrive Slash',
    subtitle: 'High-Voltage Katana Slash Rectangle + Follower PFP',
    accentColor: '#00F0FF',
    defaultFont: 'Rajdhani',
    description:
      'Electric cyan & magenta overdrive rectangle box with diagonal katana-slash beam VFX, live Follower PFP avatar, auto-fitting top username, and bottom animated "started following" text.',
  },
  {
    id: 'holo',
    name: 'Holographic Synthwave VIP',
    subtitle: 'Rainbow-Chrome Foil Rectangle + Follower PFP',
    accentColor: '#E879F9',
    defaultFont: 'Syne',
    description:
      'Holographic synthwave rectangle box with chrome neon grid VFX, live Follower PFP avatar, auto-fitting top username, and bottom animated "started following" text.',
  },
];

interface AlertCardProps {
  template: AlertTemplateId;
  font: FontFamilyName;
  username: string;
  avatarUrl?: string;
  ttsMessage?: string;
  isSpeaking: boolean;
  compact?: boolean;
}

export const AlertCardRenderer: React.FC<AlertCardProps> = ({
  template,
  font,
  username,
  avatarUrl,
  isSpeaking,
  compact = false,
}) => {
  const fontFamilyStr = `'${font}', sans-serif`;
  const cleanUser = (username || 'RohanGamingIN').trim() || 'RohanGamingIN';

  const renderFollowerPfp = (
    accentHex: string,
    borderClass: string,
    cornerBadge: React.ReactNode
  ) => {
    const resolvedPfp = getFollowerAvatarUrl(cleanUser, avatarUrl, accentHex);
    const fallbackPfp = generateGamerAvatarDataUri(cleanUser, accentHex);

    return (
      <div className="relative z-10 shrink-0">
        <div
          style={{ boxShadow: `0 0 14px ${accentHex}55` }}
          className={`${
            compact ? 'w-10 h-10' : 'w-11 h-11 sm:w-13 sm:h-13'
          } rounded-lg overflow-hidden border-2 ${borderClass} bg-[#060A0F] flex items-center justify-center`}
        >
          <img
            src={resolvedPfp}
            alt={`${cleanUser} PFP`}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== fallbackPfp) {
                target.src = fallbackPfp;
              }
            }}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Corner Emblem Badge on PFP */}
        <div
          style={{
            backgroundColor: '#060A0F',
            borderColor: accentHex,
            boxShadow: `0 0 6px ${accentHex}`,
          }}
          className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border flex items-center justify-center"
        >
          {cornerBadge}
        </div>
      </div>
    );
  };

  // Auto-fitting Top Username + Auto-fitting Bottom "started following" with ZERO overflow-hidden clipping
  const renderTopBottomVfxText = (
    userColorHex: string,
    userShadow: string,
    badgeColorHex: string
  ) => (
    <div className="relative z-10 min-w-0 flex-1 flex flex-col items-start justify-center text-left select-none py-0.5">
      {/* TOP LINE: Auto-Fitting Follower Username (shrinks automatically for long usernames) */}
      <AutoFitUsername
        text={cleanUser}
        mode={compact ? 'alert-compact' : 'alert-full'}
        colorHex={userColorHex}
        textShadow={userShadow}
        fontFamily={fontFamilyStr}
      />

      {/* BOTTOM LINE: Auto-Fitting "started following" VFX Line (no clipped border box) */}
      <div className="w-full mt-0.5">
        <AutoFitUsername
          text="started following"
          mode={compact ? 'subtitle-compact' : 'subtitle-full'}
          colorHex="#FFFFFF"
          textShadow="0 0 8px rgba(255, 255, 255, 0.45)"
          fontFamily={fontFamilyStr}
          prefixNode={
            <span
              style={{
                backgroundColor: badgeColorHex,
                boxShadow: `0 0 6px ${badgeColorHex}`,
              }}
              className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
            />
          }
        />
      </div>
    </div>
  );

  const renderEqualizer = (barClass: string) => (
    <div
      className="relative z-10 shrink-0 flex items-end gap-1 h-5 pl-0.5"
      aria-label="Audio Equalizer"
    >
      {Array.from({ length: 4 }).map((_, idx) => (
        <span
          key={idx}
          style={{
            height: isSpeaking ? `${35 + ((idx * 39) % 65)}%` : '35%',
            transition: 'height 140ms ease-in-out',
          }}
          className={`w-1 rounded-xs ${barClass} ${
            isSpeaking ? 'animate-pulse' : 'opacity-65'
          }`}
        />
      ))}
    </div>
  );

  if (template === 'neon') {
    return (
      <div className="p-1.5 sm:p-2 w-full">
        <div
          className={`relative overflow-hidden rounded-lg bg-[#060A0D]/95 border-2 border-[#53FC18] neon-pulse-green text-white transition-all ${
            compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5 sm:px-5 sm:py-3.5 max-w-xl'
          } w-full mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5`}
        >
          {/* Cyber Grid & Scanning Laser VFX */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#53FC18_1px,transparent_1px)] [background-size:12px_12px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#53FC18]/20 to-transparent animate-shimmer"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#53FC18] to-transparent animate-laser-scan"
          />

          {/* Cyber Corner Brackets GFX */}
          <div className="pointer-events-none absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#53FC18]" />
          <div className="pointer-events-none absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#53FC18]" />
          <div className="pointer-events-none absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#53FC18]" />
          <div className="pointer-events-none absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#53FC18]" />

          {/* Left Follower PFP + Kick K Badge */}
          {renderFollowerPfp(
            '#53FC18',
            'border-[#53FC18]',
            <span
              className="text-[9px] font-black text-[#53FC18] leading-none"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              K
            </span>
          )}

          {/* Top Auto-Fit Username + Bottom Auto-Fit "started following" */}
          {renderTopBottomVfxText(
            '#53FC18',
            '0 0 10px rgba(83, 252, 24, 0.65)',
            '#53FC18'
          )}

          {/* Right Audio Waveform GFX */}
          {renderEqualizer('bg-[#53FC18] shadow-[0_0_8px_#53FC18]')}
        </div>
      </div>
    );
  }

  if (template === 'gold') {
    return (
      <div className="p-1.5 sm:p-2 w-full">
        <div
          className={`relative overflow-hidden rounded-lg bg-gradient-to-r from-[#171206]/95 via-[#0B0904]/95 to-[#171206]/95 border-2 border-[#FFD700] neon-pulse-gold text-white ${
            compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5 sm:px-5 sm:py-3.5 max-w-xl'
          } w-full mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent animate-shimmer"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#FFF3B0] to-transparent animate-laser-scan"
          />
          <div className="pointer-events-none absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#FFD700]" />
          <div className="pointer-events-none absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#FFD700]" />
          <div className="pointer-events-none absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#FFD700]" />
          <div className="pointer-events-none absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#FFD700]" />

          {renderFollowerPfp(
            '#FFD700',
            'border-[#FFD700]',
            <Crown className="w-2.5 h-2.5 text-[#FFD700]" />
          )}

          {renderTopBottomVfxText(
            '#FFD700',
            '0 0 10px rgba(255, 215, 0, 0.65)',
            '#FFD700'
          )}

          {renderEqualizer('bg-[#FFD700] shadow-[0_0_8px_#FFD700]')}
        </div>
      </div>
    );
  }

  if (template === 'esports') {
    return (
      <div className="p-1.5 sm:p-2 w-full">
        <div
          className={`relative overflow-hidden rounded-lg bg-[#0A0D16]/95 border-2 border-[#FF0055] neon-pulse-crimson text-white ${
            compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5 sm:px-5 sm:py-3.5 max-w-xl'
          } w-full mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#53FC18]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FF0055]/20 via-transparent to-[#53FC18]/20 animate-shimmer"
          />

          {renderFollowerPfp(
            '#FF0055',
            'border-[#FF0055]',
            <Crosshair className="w-2.5 h-2.5 text-[#53FC18]" />
          )}

          {renderTopBottomVfxText(
            '#53FC18',
            '0 0 10px rgba(255, 0, 85, 0.7)',
            '#FF0055'
          )}

          {renderEqualizer('bg-[#FF0055]')}
        </div>
      </div>
    );
  }

  if (template === 'glass') {
    return (
      <div className="p-1.5 sm:p-2 w-full">
        <div
          className={`relative overflow-hidden rounded-xl backdrop-blur-2xl bg-slate-900/90 border-2 border-sky-400/75 shadow-[0_0_24px_rgba(56,189,248,0.4)] text-white ${
            compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5 sm:px-5 sm:py-3.5 max-w-xl'
          } w-full mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-500/15 via-emerald-400/15 to-fuchsia-500/15 animate-shimmer"
          />

          {renderFollowerPfp(
            '#38BDF8',
            'border-sky-400',
            <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
          )}

          {renderTopBottomVfxText(
            '#38BDF8',
            '0 0 10px rgba(56, 189, 248, 0.65)',
            '#38BDF8'
          )}

          {renderEqualizer('bg-sky-400')}
        </div>
      </div>
    );
  }

  if (template === 'anime') {
    return (
      <div className="p-1.5 sm:p-2 w-full">
        <div
          className={`relative overflow-hidden rounded-lg bg-gradient-to-r from-[#070B19]/95 via-[#130924]/95 to-[#061A23]/95 border-2 border-[#00F0FF] neon-pulse-cyan text-white ${
            compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5 sm:px-5 sm:py-3.5 max-w-xl'
          } w-full mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#00F0FF]/60 to-transparent -rotate-3"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent animate-laser-scan"
          />

          {renderFollowerPfp(
            '#00F0FF',
            'border-[#00F0FF]',
            <Zap className="w-2.5 h-2.5 text-[#00F0FF] fill-[#00F0FF]" />
          )}

          {renderTopBottomVfxText(
            '#00F0FF',
            '0 0 10px rgba(0, 240, 255, 0.7)',
            '#00F0FF'
          )}

          {renderEqualizer('bg-[#00F0FF]')}
        </div>
      </div>
    );
  }

  // 'holo' — Holographic Synthwave VIP Rectangle
  return (
    <div className="p-1.5 sm:p-2 w-full">
      <div
        className={`relative overflow-hidden rounded-lg bg-gradient-to-r from-[#160B28]/95 via-[#0B1026]/95 to-[#1E0B24]/95 border-2 border-fuchsia-400 shadow-[0_0_24px_rgba(232,121,249,0.5)] text-white ${
          compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5 sm:px-5 sm:py-3.5 max-w-xl'
        } w-full mx-auto flex items-center justify-between gap-2.5 sm:gap-3.5`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-400/15 via-fuchsia-400/20 to-amber-300/15 animate-shimmer"
        />

        {renderFollowerPfp(
          '#E879F9',
          'border-fuchsia-400',
          <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
        )}

        {renderTopBottomVfxText(
          '#F0ABFC',
          '0 0 10px rgba(232, 121, 249, 0.7)',
          '#E879F9'
        )}

        {renderEqualizer('bg-fuchsia-400')}
      </div>
    </div>
  );
};
