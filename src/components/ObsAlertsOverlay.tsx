import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Trophy } from 'lucide-react';
import type {
  AppSettings,
  CustomTtsPayload,
  FollowAlertPayload,
} from '../types';
import { parseObsQueryOverrides, formatTtsMessage } from '../utils/logic';
import {
  playSynthesizedSfx,
  playMilestoneFanfare,
  speakAlertTts,
  stopActiveSpeech,
} from '../utils/soundEngine';
import { AlertCardRenderer } from './AlertCardTemplates';

export const ObsAlertsOverlay: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeAlert, setActiveAlert] = useState<FollowAlertPayload | null>(null);
  const [activeMegaphone, setActiveMegaphone] = useState<CustomTtsPayload | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<{
    followerCount: number;
    followerGoal: number;
    goalTitle: string;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const queueRef = useRef<FollowAlertPayload[]>([]);
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const settingsRef = useRef<AppSettings | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const activeAlertRef = useRef<FollowAlertPayload | null>(null);
  const seenAlertIdsRef = useRef<Set<string>>(new Set());

  const queryOverrides = parseObsQueryOverrides(window.location.search, settings || undefined);

  useEffect(() => {
    activeAlertRef.current = activeAlert;
  }, [activeAlert]);

  useEffect(() => {
    // Enforce 100% transparent background for OBS Studio Browser Source
    const prevBodyBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;
    document.body.classList.remove('bg-[#080B10]');
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';

    return () => {
      document.body.style.background = prevBodyBg;
      document.documentElement.style.background = prevHtmlBg;
      stopActiveSpeech();
    };
  }, []);

  const triggerConfettiBurst = (isMilestone = false) => {
    try {
      if (isMilestone) {
        confetti({
          particleCount: 110,
          spread: 100,
          origin: { y: 0.55 },
          colors: ['#53FC18', '#FFD700', '#00F0FF', '#FF0055'],
        });
      } else {
        confetti({
          particleCount: 55,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#53FC18', '#FFD700', '#00F0FF'],
        });
      }
    } catch {
      // Ignore confetti errors in headless environments
    }
  };

  const processNextInQueue = async () => {
    if (processingRef.current) return;
    // Allow queued alerts unless explicitly paused, and never block real kick-webhook alerts silently if queue was paused before reload
    if (pausedRef.current) return;
    const nextAlert = queueRef.current.shift();
    if (!nextAlert) return;

    processingRef.current = true;
    seenAlertIdsRef.current.add(nextAlert.id);
    setActiveAlert(nextAlert);
    triggerConfettiBurst(false);

    const currentSettings = settingsRef.current;
    const overrides = parseObsQueryOverrides(window.location.search, currentSettings || undefined);
    const sfxToPlay = nextAlert.sfxPreset || overrides.sfx;
    const durationSec = nextAlert.duration || overrides.duration || 7;
    const ttsAllowed = nextAlert.ttsEnabled ?? overrides.ttsEnabled;
    const ttsVoice = nextAlert.ttsLang || overrides.voice;
    const isMuted = mutedRef.current || Boolean(currentSettings?.alertsMuted);

    if (clearTimerRef.current) {
      window.clearTimeout(clearTimerRef.current);
    }

    clearTimerRef.current = window.setTimeout(() => {
      setIsSpeaking(false);
      setActiveAlert(null);
      processingRef.current = false;
      setTimeout(() => {
        processNextInQueue();
      }, 350);
    }, durationSec * 1000);

    try {
      await playSynthesizedSfx(sfxToPlay, currentSettings?.customSfxUrl, isMuted);
    } catch {
      // Ignore SFX errors in autoplay-restricted contexts
    }

    if (ttsAllowed && !isMuted) {
      const msg =
        nextAlert.ttsMessage ||
        formatTtsMessage(
          currentSettings?.ttsSettings.messageTemplate ||
            '{username} started following',
          nextAlert.username,
          currentSettings?.channelName || 'sujalxsaini'
        );

      setTimeout(() => {
        speakAlertTts({
          text: msg,
          lang: ttsVoice,
          mode: currentSettings?.ttsSettings.mode || 'stream',
          rate: overrides.rate || currentSettings?.ttsSettings.rate || 1.0,
          pitch: currentSettings?.ttsSettings.pitch || 1.0,
          volume: overrides.volume ?? currentSettings?.ttsSettings.volume ?? 1.0,
          muted: isMuted,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }, 420);
    }
  };

  const enqueueAndPlayAlert = (payload: FollowAlertPayload) => {
    if (seenAlertIdsRef.current.has(payload.id)) return;
    seenAlertIdsRef.current.add(payload.id);

    // If only the initial demo card is showing, preempt it immediately for a real alert!
    if (activeAlertRef.current?.id.startsWith('init-')) {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
      processingRef.current = false;
      setActiveAlert(null);
    }

    queueRef.current.push(payload);
    processNextInQueue();
  };

  const initialShownRef = useRef(false);

  useEffect(() => {
    if (queryOverrides.previewMode && !activeAlert) {
      const demoAlert: FollowAlertPayload = {
        id: 'preview-demo',
        username: 'RohanGamingIN',
        timestamp: new Date().toISOString(),
        source: 'test',
        followerCount: 463,
        template: queryOverrides.alertTemplate,
        font: queryOverrides.font,
        sfxPreset: queryOverrides.sfx,
        duration: queryOverrides.duration,
        ttsEnabled: queryOverrides.ttsEnabled,
        ttsLang: queryOverrides.voice,
        ttsMessage: 'RohanGamingIN started following',
      };
      setActiveAlert(demoAlert);
      setIsSpeaking(true);
    }
  }, [queryOverrides.previewMode]);

  useEffect(() => {
    const es = new EventSource('/api/events?client=obs-alerts');

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, data } = parsed;

        if (type === 'STATE_INIT') {
          settingsRef.current = data.settings;
          pausedRef.current = Boolean(data.settings?.alertsPaused);
          mutedRef.current = Boolean(data.settings?.alertsMuted);
          setSettings(data.settings);

          // Mark existing followers as seen so only future follows trigger alerts
          (data.settings?.recentFollowers || []).forEach((rf: { id?: string }) => {
            if (rf.id) seenAlertIdsRef.current.add(rf.id);
          });

          // Automatically show the latest follower alert on initial OBS connect so the box & text are immediately visible
          if (!initialShownRef.current && !queryOverrides.previewMode) {
            initialShownRef.current = true;
            const latestFollower = data.settings?.recentFollowers?.[0];
            const latestUser = latestFollower?.username || 'RohanGamingIN';
            const overrides = parseObsQueryOverrides(
              window.location.search,
              data.settings
            );
            const initAlert: FollowAlertPayload = {
              id: `init-${Date.now()}`,
              username: latestUser,
              avatarUrl: latestFollower?.avatarUrl || data.settings?.customAvatarUrl,
              timestamp: new Date().toISOString(),
              source: 'test',
              followerCount: data.settings?.followerCount || 463,
              template: overrides.alertTemplate,
              font: overrides.font,
              sfxPreset: overrides.sfx,
              duration: overrides.duration || 7,
              ttsEnabled: false,
              ttsLang: overrides.voice,
              ttsMessage: `${latestUser} started following`,
            };
            queueRef.current.push(initAlert);
            processNextInQueue();
          }
        } else if (type === 'SETTINGS_UPDATED') {
          settingsRef.current = data;
          pausedRef.current = Boolean(data?.alertsPaused);
          mutedRef.current = Boolean(data?.alertsMuted);
          setSettings(data);
          if (!pausedRef.current) {
            processNextInQueue();
          }
        } else if (type === 'FOLLOW_ALERT') {
          enqueueAndPlayAlert(data as FollowAlertPayload);
        } else if (type === 'CUSTOM_TTS_ANNOUNCE') {
          const payload = data as CustomTtsPayload;
          setActiveMegaphone(payload);
          const isMuted = mutedRef.current || Boolean(settingsRef.current?.alertsMuted);
          speakAlertTts({
            text: payload.text,
            lang: payload.lang,
            mode: settingsRef.current?.ttsSettings.mode || 'stream',
            rate: payload.rate,
            pitch: payload.pitch,
            volume: payload.volume,
            muted: isMuted,
            onStart: () => setIsSpeaking(true),
            onEnd: () => {
              setIsSpeaking(false);
              setTimeout(() => setActiveMegaphone(null), 1200);
            },
          });
        } else if (type === 'MILESTONE_REACHED') {
          setMilestoneBanner(data);
          triggerConfettiBurst(true);
          playMilestoneFanfare(mutedRef.current);
          setTimeout(() => {
            setMilestoneBanner(null);
          }, 8000);
        } else if (type === 'QUEUE_CONTROL') {
          pausedRef.current = Boolean(data.alertsPaused);
          mutedRef.current = Boolean(data.alertsMuted);
          if (data.action === 'skip') {
            stopActiveSpeech();
            if (clearTimerRef.current) {
              window.clearTimeout(clearTimerRef.current);
            }
            setIsSpeaking(false);
            setActiveAlert(null);
            processingRef.current = false;
            setTimeout(() => processNextInQueue(), 250);
          } else if (data.action === 'resume' || !pausedRef.current) {
            processNextInQueue();
          }
        }
      } catch {
        // Ignore malformed SSE packets
      }
    };

    // Fallback poll every 4 seconds so even if SSE briefly disconnects, real Kick follows never get missed
    const pollTimer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const json = await res.json();
        const latestSettings = json?.settings as AppSettings | undefined;
        if (!latestSettings) return;
        settingsRef.current = latestSettings;
        pausedRef.current = Boolean(latestSettings.alertsPaused);
        mutedRef.current = Boolean(latestSettings.alertsMuted);

        const latestFollower = latestSettings.recentFollowers?.[0];
        if (
          latestFollower &&
          latestFollower.id &&
          !seenAlertIdsRef.current.has(latestFollower.id) &&
          Date.now() - new Date(latestFollower.timestamp).getTime() < 30_000
        ) {
          const overrides = parseObsQueryOverrides(
            window.location.search,
            latestSettings
          );
          enqueueAndPlayAlert({
            id: latestFollower.id,
            username: latestFollower.username,
            avatarUrl: latestFollower.avatarUrl || latestSettings.customAvatarUrl,
            timestamp: latestFollower.timestamp,
            source: latestFollower.source,
            followerCount: latestSettings.followerCount,
            template: overrides.alertTemplate,
            font: overrides.font,
            sfxPreset: overrides.sfx,
            duration: overrides.duration,
            ttsEnabled: overrides.ttsEnabled,
            ttsLang: overrides.voice,
            ttsMessage: formatTtsMessage(
              latestSettings.ttsSettings.messageTemplate,
              latestFollower.username,
              latestSettings.channelName
            ),
          });
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 4000);

    return () => {
      es.close();
      window.clearInterval(pollTimer);
    };
  }, []);

  const resolvedTemplate = activeAlert?.template || queryOverrides.alertTemplate;
  const resolvedFont = activeAlert?.font || queryOverrides.font;
  const resolvedMessage =
    activeAlert?.ttsMessage ||
    formatTtsMessage(
      settings?.ttsSettings.messageTemplate ||
        '{username} started following',
      activeAlert?.username || 'KickVIP',
      settings?.channelName || 'sujalxsaini'
    );

  return (
    <main
      data-testid="obs-alerts-canvas"
      className="w-screen h-screen overflow-hidden bg-transparent flex flex-col items-center justify-center p-2 sm:p-6 select-none"
    >
      <AnimatePresence mode="wait">
        {milestoneBanner && (
          <motion.div
            key="milestone-banner"
            initial={{ opacity: 0, scale: 0.8, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            className="mb-6 rounded-2xl bg-gradient-to-r from-[#171204]/95 via-[#09150B]/95 to-[#171204]/95 border-2 border-[#FFD700] px-8 py-5 text-center shadow-[0_0_50px_rgba(255,215,0,0.6)] max-w-2xl w-full"
          >
            <div className="flex items-center justify-center gap-3 text-[#FFD700] text-xs font-bold tracking-[0.28em] uppercase mb-1">
              <Trophy className="w-4 h-4" />
              <span>MILESTONE GOAL ACHIEVED</span>
              <Trophy className="w-4 h-4" />
            </div>
            <div
              className="text-3xl font-black text-white tracking-wide"
              style={{ fontFamily: `'${resolvedFont}', sans-serif` }}
            >
              {milestoneBanner.goalTitle}
            </div>
            <div className="text-sm font-mono text-[#53FC18] mt-1 tabular-nums">
              {milestoneBanner.followerCount.toLocaleString()} /{' '}
              {milestoneBanner.followerGoal.toLocaleString()} FOLLOWERS GOAL UNLOCKED!
            </div>
          </motion.div>
        )}

        {activeAlert && (
          <motion.div
            key={activeAlert.id}
            initial={{ opacity: 1, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="w-full flex justify-center"
          >
            <AlertCardRenderer
              template={resolvedTemplate}
              font={resolvedFont}
              username={activeAlert.username}
              avatarUrl={activeAlert.avatarUrl || settings?.customAvatarUrl}
              ttsMessage={resolvedMessage}
              isSpeaking={isSpeaking}
            />
          </motion.div>
        )}

        {!activeAlert && activeMegaphone && (
          <motion.div
            key={activeMegaphone.id}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            className="rounded-2xl bg-[#070B0E]/95 border-2 border-[#53FC18] neon-pulse-green p-6 max-w-xl w-full text-white"
          >
            <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-[#53FC18] mb-2">
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>SUJALXSAINI LIVE VIP ANNOUNCEMENT</span>
            </div>
            <p
              className="text-2xl font-bold text-white"
              style={{ fontFamily: `'${resolvedFont}', sans-serif` }}
            >
              {activeMegaphone.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
