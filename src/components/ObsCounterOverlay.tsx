import React, { useEffect, useState } from 'react';
import type { AppSettings } from '../types';
import { parseObsQueryOverrides } from '../utils/logic';
import { CounterCardRenderer } from './CounterCardTemplates';

export const ObsCounterOverlay: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
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
    };
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/events?client=obs-counter');

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'STATE_INIT') {
          setSettings(parsed.data.settings);
        } else if (parsed.type === 'SETTINGS_UPDATED') {
          setSettings(parsed.data);
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  }, []);

  const overrides = parseObsQueryOverrides(window.location.search, settings || undefined);
  const count = settings?.followerCount ?? 1250;
  const goal = overrides.goal || settings?.followerGoal || 1500;
  const hasUrlGoalOverride = new URLSearchParams(window.location.search).has('goal');
  const goalTitle =
    !hasUrlGoalOverride && settings?.goalTitle
      ? settings.goalTitle
      : `ROAD TO ${goal.toLocaleString()} FOLLOWERS`;
  const recentFollowers = settings?.recentFollowers ?? [];

  return (
    <main
      data-testid="obs-counter-canvas"
      className="w-screen h-screen overflow-hidden bg-transparent flex items-center justify-center p-2 sm:p-4 select-none"
    >
      <CounterCardRenderer
        template={overrides.counterTemplate}
        font={overrides.font}
        count={count}
        goal={goal}
        goalTitle={goalTitle}
        showGoal={overrides.showGoal}
        recentFollowers={recentFollowers}
        customAvatarUrl={settings?.customAvatarUrl}
      />
    </main>
  );
};
