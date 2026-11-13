import React from 'react';
import { motion } from 'motion/react';
import type { AlertEventType, FontFamilyName, TextAlertStyle } from '../types';

interface TextOnlyAlertProps {
  eventType: Exclude<AlertEventType, 'follow'>;
  username: string;
  amount?: number;
  subMessage?: string;
  font: FontFamilyName;
  stylePreset: TextAlertStyle;
  compact?: boolean;
}

export const TextOnlyAlert: React.FC<TextOnlyAlertProps> = ({
  eventType,
  username,
  amount,
  subMessage,
  font,
  stylePreset,
  compact = false,
}) => {
  const cleanUser = (username || 'KickVIP').trim() || 'KickVIP';
  const fontFamilyStr = `'${font}', sans-serif`;

  const resolvedAmount =
    eventType === 'kicks'
      ? Math.max(1, Math.round(amount || 100))
      : Math.max(1, Math.round(amount || 1));

  const actionLine =
    eventType === 'kicks'
      ? `SENT ${resolvedAmount.toLocaleString()} KICKS`
      : eventType === 'sub-gift'
        ? `GIFTED ${resolvedAmount.toLocaleString()} ${resolvedAmount === 1 ? 'SUB' : 'SUBS'}`
        : resolvedAmount > 1
          ? `SUBSCRIBED (${resolvedAmount} MONTHS)`
          : 'SUBSCRIBED';

  const palette =
    stylePreset === 'gold-impact'
      ? {
          userColor: '#FFF7D6',
          amountColor: '#FFD700',
          userShadow:
            '0 4px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,215,0,0.65)',
          amountShadow:
            '0 6px 18px rgba(0,0,0,0.98), 0 0 32px rgba(255,195,0,0.95)',
          enterClass: 'animate-kinetic-pop',
          amountClass: 'animate-amount-float',
        }
      : stylePreset === 'cyber-drop'
        ? {
            userColor: '#E0FCFF',
            amountColor: '#00F0FF',
            userShadow:
              '0 4px 14px rgba(0,0,0,0.95), 0 0 22px rgba(0,240,255,0.65)',
            amountShadow:
              '0 6px 18px rgba(0,0,0,0.98), 0 0 32px rgba(0,240,255,0.95)',
            enterClass: 'animate-cyber-drop',
            amountClass: 'animate-amount-float',
          }
        : stylePreset === 'glitch-pulse'
          ? {
              userColor: '#FFFFFF',
              amountColor: '#FF2E93',
              userShadow:
                '0 4px 14px rgba(0,0,0,0.95), -2px 0 rgba(0,240,255,0.8), 2px 0 rgba(255,0,122,0.8)',
              amountShadow:
                '0 6px 18px rgba(0,0,0,0.98), 0 0 30px rgba(255,46,147,0.92)',
              enterClass: 'animate-kinetic-pop',
              amountClass: 'animate-glitch-text',
            }
          : {
              userColor: '#FFFFFF',
              amountColor: '#53FC18',
              userShadow:
                '0 4px 16px rgba(0,0,0,0.95), 0 0 22px rgba(83,252,24,0.6)',
              amountShadow:
                '0 6px 20px rgba(0,0,0,0.98), 0 0 32px rgba(83,252,24,0.95)',
              enterClass: 'animate-kinetic-pop',
              amountClass: 'animate-amount-float',
            };

  return (
    <motion.div
      data-testid="text-only-obs-alert"
      initial={{ opacity: 0, scale: 0.82, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -22 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{ fontFamily: fontFamilyStr }}
      className="w-full max-w-4xl bg-transparent border-0 shadow-none text-center select-none pointer-events-none px-4 py-2"
    >
      {/* Line 1: Sender / Gifter / Subscriber Username */}
      <div
        className={`${palette.enterClass} font-black tracking-wide leading-tight break-words ${
          compact ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-6xl'
        }`}
        style={{
          color: palette.userColor,
          textShadow: palette.userShadow,
          WebkitTextStroke: '1px rgba(0,0,0,0.65)',
        }}
      >
        {cleanUser}
      </div>

      {/* Line 2: Kinetic Amount + Event Action */}
      <div
        className={`${palette.amountClass} font-black uppercase tracking-wider leading-tight mt-1 ${
          compact ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-5xl'
        }`}
        style={{
          color: palette.amountColor,
          textShadow: palette.amountShadow,
          WebkitTextStroke: '1.2px rgba(0,0,0,0.75)',
        }}
      >
        {actionLine}
      </div>

      {/* Optional clean floating message if sender included a note */}
      {subMessage && subMessage.trim().length > 0 && (
        <div
          className={`mt-2 font-bold text-white/95 max-w-2xl mx-auto leading-snug ${
            compact ? 'text-xs sm:text-sm' : 'text-base sm:text-xl'
          }`}
          style={{
            textShadow: '0 2px 10px rgba(0,0,0,0.98), 0 0 12px rgba(0,0,0,0.85)',
          }}
        >
          “{subMessage.trim()}”
        </div>
      )}
    </motion.div>
  );
};
