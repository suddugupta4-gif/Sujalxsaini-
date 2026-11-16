import React, { useEffect, useState } from 'react';
import type { AppSettings } from '../types';
import {
  formatObsTransformStyle,
  normalizeObsLayout,
  parseObsQueryOverrides,
} from '../utils/logic';
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
    fetch('/api/state')
      .then((r) => r.json())
      .then((json) => {
        if (json?.settings) setSettings(json.settings);
      })
      .catch(() => {});

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

    const pollTimer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const json = await res.json();
        if (json?.settings) setSettings(json.settings);
      } catch {
        // ignore transient poll error
      }
    }, 5000);

    return () => {
      es.close();
      window.clearInterval(pollTimer);
    };
  }, []);

  const overrides = parseObsQueryOverrides(window.location.search, settings || undefined);
  const matchedGoalItem = overrides.goalId
    ? (settings?.goalLinkHistory || []).find((item) => item.id === overrides.goalId)
    : undefined;

  const count = settings?.followerCount ?? 463;
  const goal = matchedGoalItem
    ? matchedGoalItem.goal
    : settings
      ? settings.followerGoal
      : overrides.goal;
  const goalTitle = matchedGoalItem
    ? matchedGoalItem.goalTitle
    : settings?.goalTitle || `ROAD TO ${goal.toLocaleString()} FOLLOWERS`;
  const template = matchedGoalItem
    ? matchedGoalItem.template
    : settings
      ? settings.activeCounterTemplate
      : overrides.counterTemplate;
  const font = matchedGoalItem
    ? matchedGoalItem.font
    : settings
      ? settings.counterFont || settings.selectedFont
      : overrides.font;
  const showGoal = matchedGoalItem
    ? matchedGoalItem.showGoal
    : settings
      ? (settings.showGoalOnCounter ?? true)
      : overrides.showGoal;
  const recentFollowers = settings?.recentFollowers ?? [];
  const showRecentFollower = settings?.showRecentFollowerOnCounter ?? false;
  const counterPos = normalizeObsLayout(settings?.obsLayout).counter;
  const transformStyle = formatObsTransformStyle(counterPos);

  return (
    <main
      data-testid="obs-counter-canvas"
      className="w-screen h-screen overflow-hidden bg-transparent flex items-center justify-center p-2 sm:p-4 select-none"
    >
      <div
        data-testid="obs-counter-positioned"
        data-x-cm={String(counterPos.xCm)}
        data-y-cm={String(counterPos.yCm)}
        data-scale={String(counterPos.scale)}
        style={{
          ...transformStyle,
          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="w-full flex justify-center"
      >
        <CounterCardRenderer
          template={template}
          font={font}
          count={count}
          goal={goal}
          goalTitle={goalTitle}
          showGoal={showGoal}
          showRecentFollower={showRecentFollower}
          recentFollowers={recentFollowers}
          customAvatarUrl={settings?.customAvatarUrl}
        />
      </div>
    </main>
  );
};
