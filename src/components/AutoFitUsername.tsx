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
}

export const AutoFitUsername: React.FC<AutoFitUsernameProps> = ({
  text,
  mode = 'alert-full',
  colorHex,
  textShadow,
  fontFamily,
  className = '',
  prefixNode,
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
      ? 14
      : mode === 'subtitle-full'
      ? 13
      : 11.5;

  const minFontPx = isSubtitle ? 8.5 : 8;

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

    // Leave 8px safety buffer so text-shadow/glow is never clipped
    const availableWidth = Math.max(40, container.clientWidth - 8);

    let currentSize = maxFontPx;
    inner.style.fontSize = `${currentSize}px`;

    while (inner.scrollWidth > availableWidth && currentSize > minFontPx) {
      currentSize = Math.max(minFontPx, currentSize - 0.5);
      inner.style.fontSize = `${currentSize}px`;
    }

    while (inner.scrollWidth > availableWidth && currentSize > 6.5) {
      currentSize = Math.max(6.5, currentSize - 0.5);
      inner.style.fontSize = `${currentSize}px`;
    }

    setFontSizePx(currentSize);
  };

  useLayoutEffect(() => {
    fitTextToBox();
  }, [text, mode, fontFamily, maxFontPx, minFontPx]);

  useEffect(() => {
    fitTextToBox();

    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as Document & { fonts: FontFaceSet }).fonts.ready
        .then(() => fitTextToBox())
        .catch(() => {});
    }

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      fitTextToBox();
    });
    observer.observe(container);

    return () => {
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
          ...(fontFamily ? { fontFamily } : {}),
        }}
        className={`inline-flex items-center gap-1.5 leading-snug tracking-wide whitespace-nowrap ${
          isSubtitle ? 'font-bold animate-vfx-text' : 'font-black animate-username-vfx'
        }`}
      >
        {prefixNode}
        <span>{text}</span>
      </div>
    </div>
  );
};
