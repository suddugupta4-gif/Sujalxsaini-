import type { SfxPresetId, TtsLangCode } from '../types';
import { convertEmojisToSpokenText } from './logic';

export const SFX_PRESET_INFO: {
  id: SfxPresetId;
  name: string;
  tag: string;
  description: string;
}[] = [
  {
    id: 'cyber',
    name: 'Kick Cyber Chime',
    tag: 'Default Neon',
    description: 'Futuristic rising FM synth arpeggio with sub-bass punch',
  },
  {
    id: 'royal',
    name: 'Imperial VIP Fanfare',
    tag: 'Sovereign Gold',
    description: 'Majestic warm brass & crystal harp fifth chord progression',
  },
  {
    id: 'valorant',
    name: 'Radiant Ace Stinger',
    tag: 'Tactical Esports',
    description: 'Sharp metallic lock-on impact with tactical low-end drop',
  },
  {
    id: 'anime',
    name: 'Overdrive Katana Slash',
    tag: 'High Voltage',
    description: 'Rapid hyper-saw power chord with high-tech shimmer sweep',
  },
  {
    id: 'glass',
    name: 'VisionOS Spatial Bell',
    tag: 'Frosted Glass',
    description: 'Pure crystalline sine harmonics with airy spatial decay',
  },
  {
    id: 'arcade',
    name: '16-Bit Level Up Coin',
    tag: 'Retro Synth',
    description: 'Classic square-wave coin cascade and power-up arpeggio',
  },
];

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain = 0.22,
  glideToFreq?: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (glideToFreq) {
    osc.frequency.exponentialRampToValueAtTime(glideToFreq, startTime + duration * 0.85);
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

const PRESET_HANDOVER_MS: Record<SfxPresetId, number> = {
  cyber: 620,
  royal: 660,
  valorant: 560,
  anime: 620,
  glass: 650,
  arcade: 640,
};

export async function playSynthesizedSfx(
  preset: SfxPresetId,
  customSfxUrl?: string,
  muted = false
): Promise<void> {
  if (muted) return;

  if (customSfxUrl && customSfxUrl.trim().length > 0) {
    try {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(customSfxUrl.trim());
        audio.volume = 0.85;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        const safetyTimer = window.setTimeout(finish, 2200);
        audio.onended = () => {
          window.clearTimeout(safetyTimer);
          finish();
        };
        audio.onerror = () => {
          window.clearTimeout(safetyTimer);
          reject(new Error('Custom SFX load error'));
        };
        audio.play().catch((err) => {
          window.clearTimeout(safetyTimer);
          reject(err);
        });
      });
      return;
    } catch {
      // Fallback to Web Audio API preset if custom URL fails
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.02;

  switch (preset) {
    case 'cyber': {
      playNote(ctx, 110, now, 0.35, 'sawtooth', 0.2, 55);
      playNote(ctx, 659.25, now, 0.16, 'triangle', 0.2);
      playNote(ctx, 830.61, now + 0.09, 0.16, 'triangle', 0.22);
      playNote(ctx, 987.77, now + 0.18, 0.18, 'triangle', 0.24);
      playNote(ctx, 1318.51, now + 0.27, 0.55, 'sine', 0.28);
      playNote(ctx, 659.25, now + 0.27, 0.55, 'sawtooth', 0.09);
      break;
    }
    case 'royal': {
      const notes = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        playNote(ctx, f, now + idx * 0.07, 0.65, 'triangle', 0.18);
        playNote(ctx, f * 1.5, now + idx * 0.07 + 0.02, 0.45, 'sine', 0.08);
      });
      break;
    }
    case 'valorant': {
      playNote(ctx, 140, now, 0.45, 'sawtooth', 0.28, 42);
      playNote(ctx, 587.33, now, 0.12, 'square', 0.16);
      playNote(ctx, 880, now + 0.1, 0.14, 'square', 0.18);
      playNote(ctx, 1174.66, now + 0.2, 0.5, 'sawtooth', 0.22);
      playNote(ctx, 1760, now + 0.2, 0.45, 'sine', 0.15);
      break;
    }
    case 'anime': {
      playNote(ctx, 320, now, 0.18, 'sawtooth', 0.22, 1680);
      playNote(ctx, 440, now + 0.14, 0.12, 'sawtooth', 0.2);
      playNote(ctx, 554.37, now + 0.22, 0.12, 'sawtooth', 0.2);
      playNote(ctx, 659.25, now + 0.3, 0.5, 'sawtooth', 0.24);
      playNote(ctx, 1318.51, now + 0.3, 0.55, 'triangle', 0.2);
      break;
    }
    case 'glass': {
      playNote(ctx, 783.99, now, 0.65, 'sine', 0.22);
      playNote(ctx, 1174.66, now + 0.12, 0.7, 'sine', 0.24);
      playNote(ctx, 1567.98, now + 0.24, 0.85, 'sine', 0.2);
      playNote(ctx, 2349.32, now + 0.24, 0.6, 'sine', 0.08);
      break;
    }
    case 'arcade': {
      const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      seq.forEach((f, i) => {
        const start = now + i * 0.075;
        const dur = i === seq.length - 1 ? 0.45 : 0.09;
        playNote(ctx, f, start, dur, 'square', 0.16);
      });
      break;
    }
  }

  const waitMs = PRESET_HANDOVER_MS[preset] || 620;
  await new Promise<void>((resolve) => window.setTimeout(resolve, waitMs));
}

export function playMilestoneFanfare(muted = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.02;
  const fanfare = [
    { f: 523.25, t: 0, d: 0.15 },
    { f: 523.25, t: 0.16, d: 0.15 },
    { f: 523.25, t: 0.32, d: 0.15 },
    { f: 659.25, t: 0.48, d: 0.38 },
    { f: 587.33, t: 0.88, d: 0.32 },
    { f: 659.25, t: 1.22, d: 0.28 },
    { f: 783.99, t: 1.52, d: 0.75 },
    { f: 1046.5, t: 1.52, d: 0.75 },
  ];
  fanfare.forEach((n) => {
    playNote(ctx, n.f, now + n.t, n.d, 'triangle', 0.22);
    playNote(ctx, n.f * 0.5, now + n.t, n.d, 'sawtooth', 0.09);
  });
}

let currentAudioElement: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;

export function stopActiveSpeech(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.src = '';
    } catch {
      // ignore
    }
    currentAudioElement = null;
  }
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {
      // ignore
    }
    currentBlobUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

function speakViaBrowserSpeech(options: {
  text: string;
  lang: TtsLangCode;
  rate: number;
  pitch: number;
  volume: number;
  onStart?: () => void;
  onEnd?: () => void;
}): Promise<void> {
  const { text, lang, rate, pitch, volume, onStart, onEnd } = options;
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onStart?.();
      setTimeout(() => {
        onEnd?.();
        resolve();
      }, 2600);
      return;
    }

    try {
      const bcpLang =
        lang === 'pro-uk-gent'
          ? 'en-GB'
          : lang === 'pro-aussie-chill'
            ? 'en-AU'
            : lang.startsWith('pro-')
              ? 'en-US'
              : lang;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcpLang;
      utterance.rate = Math.min(2, Math.max(0.5, rate));
      utterance.pitch = Math.min(2, Math.max(0.5, pitch));
      utterance.volume = Math.min(1, Math.max(0, volume));

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === bcpLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(bcpLang.split('-')[0].toLowerCase()));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        onEnd?.();
        resolve();
      };

      utterance.onstart = () => onStart?.();
      utterance.onend = finish;
      utterance.onerror = finish;

      onStart?.();
      window.speechSynthesis.speak(utterance);
      setTimeout(finish, Math.max(3000, text.length * 85));
    } catch {
      onStart?.();
      setTimeout(() => {
        onEnd?.();
        resolve();
      }, 2600);
    }
  });
}

export interface PreparedTtsHandle {
  playNow: (callbacks?: { onStart?: () => void; onEnd?: () => void }) => Promise<void>;
}

/**
 * Pre-fetches and decodes the TTS audio into a ready-to-play Blob URL BEFORE the
 * visual alert renders, so animation + TTS voice fire at the EXACT same millisecond (0ms delay).
 */
export async function prepareTtsAudio(options: {
  text: string;
  lang: TtsLangCode;
  mode: 'stream' | 'browser';
  rate?: number;
  pitch?: number;
  volume?: number;
  muted?: boolean;
}): Promise<PreparedTtsHandle> {
  const {
    text,
    lang,
    mode,
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    muted = false,
  } = options;

  const rawText = text.trim();
  const spokenText = convertEmojisToSpokenText(rawText) || rawText;

  if (muted || !spokenText) {
    return {
      playNow: async (cb) => {
        cb?.onEnd?.();
      },
    };
  }

  if (mode === 'browser') {
    // Warm up browser voices list synchronously so speak() fires instantaneously
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // ignore
      }
    }
    return {
      playNow: (cb) => {
        stopActiveSpeech();
        return speakViaBrowserSpeech({
          text: spokenText,
          lang,
          rate,
          pitch,
          volume,
          onStart: cb?.onStart,
          onEnd: cb?.onEnd,
        });
      },
    };
  }

  const ttsUrl = `/api/tts?text=${encodeURIComponent(spokenText)}&lang=${encodeURIComponent(lang)}`;
  let preloadedBlobUrl: string | null = null;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1800);
    const resp = await fetch(ttsUrl, { signal: controller.signal });
    window.clearTimeout(timer);
    if (resp.ok) {
      const blob = await resp.blob();
      if (blob.size > 200) {
        preloadedBlobUrl = URL.createObjectURL(blob);
      }
    }
  } catch {
    // Fallback to direct URL if preload raced past 1800ms
  }

  return {
    playNow: (cb) =>
      new Promise((resolve) => {
        stopActiveSpeech();
        const src = preloadedBlobUrl || ttsUrl;
        if (preloadedBlobUrl) {
          currentBlobUrl = preloadedBlobUrl;
        }
        const audio = new Audio(src);
        currentAudioElement = audio;
        audio.preload = 'auto';
        audio.volume = Math.min(1, Math.max(0, volume));
        audio.playbackRate = Math.min(2, Math.max(0.5, rate));

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          cb?.onEnd?.();
          resolve();
        };

        audio.onplay = () => {
          cb?.onStart?.();
        };
        audio.onended = finish;
        audio.onerror = () => {
          if (settled) return;
          settled = true;
          speakViaBrowserSpeech({
            text: spokenText,
            lang,
            rate,
            pitch,
            volume,
            onStart: cb?.onStart,
            onEnd: cb?.onEnd,
          }).then(resolve);
        };

        cb?.onStart?.();
        audio.play().catch(() => {
          if (settled) return;
          settled = true;
          speakViaBrowserSpeech({
            text: spokenText,
            lang,
            rate,
            pitch,
            volume,
            onStart: cb?.onStart,
            onEnd: cb?.onEnd,
          }).then(resolve);
        });

        setTimeout(
          finish,
          Math.max(5500, Math.round((spokenText.length * 115) / Math.max(0.5, rate)))
        );
      }),
  };
}

export async function speakAlertTts(options: {
  text: string;
  lang: TtsLangCode;
  mode: 'stream' | 'browser';
  rate?: number;
  pitch?: number;
  volume?: number;
  muted?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}): Promise<void> {
  const prepared = await prepareTtsAudio(options);
  await prepared.playNow({
    onStart: options.onStart,
    onEnd: options.onEnd,
  });
}

