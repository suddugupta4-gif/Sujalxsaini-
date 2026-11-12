import type { SfxPresetId, TtsLangCode } from '../types';

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

export async function playSynthesizedSfx(
  preset: SfxPresetId,
  customSfxUrl?: string,
  muted = false
): Promise<void> {
  if (muted) return;

  if (customSfxUrl && customSfxUrl.trim().length > 0) {
    try {
      const audio = new Audio(customSfxUrl.trim());
      audio.volume = 0.85;
      await audio.play();
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
      // Rising cyberpunk neon arpeggio (E5 -> G#5 -> B5 -> E6) + sub punch
      playNote(ctx, 110, now, 0.35, 'sawtooth', 0.2, 55);
      playNote(ctx, 659.25, now, 0.16, 'triangle', 0.2);
      playNote(ctx, 830.61, now + 0.09, 0.16, 'triangle', 0.22);
      playNote(ctx, 987.77, now + 0.18, 0.18, 'triangle', 0.24);
      playNote(ctx, 1318.51, now + 0.27, 0.55, 'sine', 0.28);
      playNote(ctx, 659.25, now + 0.27, 0.55, 'sawtooth', 0.09);
      break;
    }
    case 'royal': {
      // Imperial sovereign brass/harp chord fanfare (C4 - G4 - C5 - E5 - G5)
      const notes = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        playNote(ctx, f, now + idx * 0.07, 0.65, 'triangle', 0.18);
        playNote(ctx, f * 1.5, now + idx * 0.07 + 0.02, 0.45, 'sine', 0.08);
      });
      break;
    }
    case 'valorant': {
      // Tactical sharp stinger: sub impact + metallic high lock-on
      playNote(ctx, 140, now, 0.45, 'sawtooth', 0.28, 42);
      playNote(ctx, 587.33, now, 0.12, 'square', 0.16);
      playNote(ctx, 880, now + 0.1, 0.14, 'square', 0.18);
      playNote(ctx, 1174.66, now + 0.2, 0.5, 'sawtooth', 0.22);
      playNote(ctx, 1760, now + 0.2, 0.45, 'sine', 0.15);
      break;
    }
    case 'anime': {
      // Katana slash sweep + high-energy power triad
      playNote(ctx, 320, now, 0.18, 'sawtooth', 0.22, 1680);
      playNote(ctx, 440, now + 0.14, 0.12, 'sawtooth', 0.2);
      playNote(ctx, 554.37, now + 0.22, 0.12, 'sawtooth', 0.2);
      playNote(ctx, 659.25, now + 0.3, 0.5, 'sawtooth', 0.24);
      playNote(ctx, 1318.51, now + 0.3, 0.55, 'triangle', 0.2);
      break;
    }
    case 'glass': {
      // Spatial frosted glass bell harmonics
      playNote(ctx, 783.99, now, 0.65, 'sine', 0.22);
      playNote(ctx, 1174.66, now + 0.12, 0.7, 'sine', 0.24);
      playNote(ctx, 1567.98, now + 0.24, 0.85, 'sine', 0.2);
      playNote(ctx, 2349.32, now + 0.24, 0.6, 'sine', 0.08);
      break;
    }
    case 'arcade': {
      // Classic 16-bit coin & level-up cascade
      const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      seq.forEach((f, i) => {
        const start = now + i * 0.075;
        const dur = i === seq.length - 1 ? 0.45 : 0.09;
        playNote(ctx, f, start, dur, 'square', 0.16);
      });
      break;
    }
  }
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
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
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
  const {
    text,
    lang,
    mode,
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    muted = false,
    onStart,
    onEnd,
  } = options;

  if (muted || !text.trim()) {
    onEnd?.();
    return;
  }

  stopActiveSpeech();

  const tryBrowserSpeech = (): Promise<void> =>
    new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onStart?.();
        setTimeout(() => {
          onEnd?.();
          resolve();
        }, 2800);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = Math.min(2, Math.max(0.5, rate));
        utterance.pitch = Math.min(2, Math.max(0.5, pitch));
        utterance.volume = Math.min(1, Math.max(0, volume));

        const voices = window.speechSynthesis.getVoices();
        const matchedVoice =
          voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(lang.split('-')[0].toLowerCase()));
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
        // Safety timeout so equalizer always finishes cleanly
        setTimeout(finish, Math.max(3200, text.length * 85));
      } catch {
        onStart?.();
        setTimeout(() => {
          onEnd?.();
          resolve();
        }, 2800);
      }
    });

  if (mode === 'browser') {
    await tryBrowserSpeech();
    return;
  }

  // Stream mode: HTML5 <audio> via /api/tts proxy (works in OBS Browser Sources without system TTS voices)
  return new Promise((resolve) => {
    const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
    const audio = new Audio(url);
    currentAudioElement = audio;
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.playbackRate = Math.min(2, Math.max(0.5, rate));

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onEnd?.();
      resolve();
    };

    audio.onplay = () => {
      onStart?.();
    };
    audio.onended = finish;
    audio.onerror = () => {
      if (settled) return;
      settled = true;
      tryBrowserSpeech().then(resolve);
    };

    audio.play().catch(() => {
      if (settled) return;
      settled = true;
      tryBrowserSpeech().then(resolve);
    });

    setTimeout(finish, Math.max(4000, text.length * 95));
  });
}
