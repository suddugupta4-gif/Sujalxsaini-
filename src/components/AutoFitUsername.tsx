import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { computeAdaptiveUsernameFontSize } from '../utils/logic';

interface AutoFitUsernameProps {
  text: string;
  mode?: 'alert-full' | 'alert-compact' | 'counter-recent' | 'subtitle-full' | 'subtitle-compact';
  colorHex: string;
  textShadow: string;
  fontFamily?: string;
  className?: string;
  prefixNode?: React.ReactNode;
  sharp?: boolean;
}

export const AutoFitUsername: React.FC<AutoFitUsernameProps> = ({
  text,
  mode = 'alert-full',
  colorHex,
  textShadow,
  fontFamily,
  className = '',
  prefixNode,
  sharp = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const isSubtitle = mode === 'subtitle-full' || mode === 'subtitle-compact';

  const maxFontPx =
    mode === 'alert-full'
      ? 21
      : mode === 'alert-compact'
      ? 16
      : mode === 'counter-recent'
      ? 21
      : mode === 'subtitle-full'
      ? 14
      : 13.5;

  const minFontPx = mode === 'counter-recent' ? 12 : isSubtitle ? 10 : 8;
  const hardFloorPx = mode === 'counter-recent' ? 10 : 6.5;

  const initialGuess = isSubtitle
    ? maxFontPx
    : computeAdaptiveUsernameFontSize(
        text,
        mode === 'alert-full' || mode === 'alert-compact' || mode === 'counter-recent'
          ? mode
          : 'alert-full'
      );

  const [fontSizePx, setFontSizePx] = useState<number>(initialGuess);

  const fitTextToBox = () => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    // Leave 6px safety buffer so text-shadow is never clipped
    const availableWidth = Math.max(40, container.clientWidth - 6);

    let currentSize = maxFontPx;
    inner.style.fontSize = `${currentSize}px`;

    while (inner.scrollWidth > availableWidth && currentSize > minFontPx) {
      currentSize = Math.max(minFontPx, currentSize - 0.5);
      inner.style.fontSize = `${currentSize}px`;
    }

    while (inner.scrollWidth > availableWidth && currentSize > hardFloorPx) {
      currentSize = Math.max(hardFloorPx, currentSize - 0.5);
      inner.style.fontSize = `${currentSize}px`;
    }

    setFontSizePx((prev) => (prev === currentSize ? prev : currentSize));
  };

  useLayoutEffect(() => {
    fitTextToBox();
  }, [text, mode, fontFamily, maxFontPx, minFontPx]);

  useEffect(() => {
    let isCancelled = false;
    let rafId: number | null = null;

    const scheduleFit = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (!isCancelled) {
          fitTextToBox();
        }
      });
    };

    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as Document & { fonts: FontFaceSet }).fonts.ready
        .then(() => {
          if (!isCancelled) scheduleFit();
        })
        .catch(() => {});
    }

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return () => {
        isCancelled = true;
        if (rafId !== null) window.cancelAnimationFrame(rafId);
      };
    }

    const observer = new ResizeObserver(() => {
      scheduleFit();
    });
    observer.observe(container);

    return () => {
      isCancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      observer.disconnect();
    };
  }, [text, mode, fontFamily]);

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 flex items-center ${className}`}
    >
      <div
        ref={innerRef}
        style={{
          fontSize: `${fontSizePx}px`,
          color: colorHex,
          textShadow,
          WebkitFontSmoothing: 'antialiased',
          ...(fontFamily ? { fontFamily } : {}),
        }}
        className={`inline-flex items-center gap-1.5 leading-tight whitespace-nowrap ${
          sharp
            ? isSubtitle
              ? 'font-bold tracking-normal'
              : 'font-extrabold tracking-normal'
            : isSubtitle
              ? 'font-bold tracking-wide animate-vfx-text'
              : 'font-black tracking-wide animate-username-vfx'
        }`}
      >
        {prefixNode}
        <span>{text}</span>
      </div>
    </div>
  );
};
