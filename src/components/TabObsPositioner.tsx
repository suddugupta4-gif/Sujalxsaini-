import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BellRing,
  Crosshair,
  Flame,
  Monitor,
  Move,
  RotateCcw,
  Target,
  Zap,
} from 'lucide-react';
import type {
  AlertEventType,
  AppSettings,
  ObsClientCounts,
  ObsElementKey,
  ObsElementPosition,
  ObsLayoutSettings,
} from '../types';
import {
  clampObsElementPosition,
  cmToPx,
  normalizeObsLayout,
  nudgeObsElementPosition,
  pxToCm,
} from '../utils/logic';

interface TabObsPositionerProps {
  settings: AppSettings;
  obsCounts: ObsClientCounts;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onFireTestAlert: (
    customUsername?: string,
    eventOptions?: {
      eventType?: AlertEventType;
      amount?: number;
      subMessage?: string;
    }
  ) => Promise<void>;
}

const ELEMENT_META: {
  key: ObsElementKey;
  label: string;
  obsQuery: string;
  accentHex: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'alerts',
    label: 'Follow Alert Box',
    obsQuery: '?obs=alerts',
    accentHex: '#53FC18',
    description: 'Follower card + PFP + TTS popup overlay',
    icon: <BellRing className="w-4 h-4" />,
  },
  {
    key: 'textAlerts',
    label: 'Kicks & Subs Alert',
    obsQuery: '?obs=text-alerts',
    accentHex: '#FBBF24',
    description: 'Floating Kicks Send, Sub Gift & Sub Buy overlay',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    key: 'counter',
    label: 'Follower Goal Bar',
    obsQuery: '?obs=counter',
    accentHex: '#38BDF8',
    description: 'Live Follower Goal progress bar widget',
    icon: <Target className="w-4 h-4" />,
  },
];

const STEP_OPTIONS_CM = [0.2, 0.5, 1, 2, 5];

// Reference 1920x1080 OBS stream canvas in centimeters at 96 DPI (~50.8 x 28.575 cm)
const REF_WIDTH_PX = 1920;
const REF_HEIGHT_PX = 1080;

export const TabObsPositioner: React.FC<TabObsPositionerProps> = ({
  settings,
  obsCounts,
  onUpdateSettings,
  onFireTestAlert,
}) => {
  const [selectedKey, setSelectedKey] = useState<ObsElementKey>('counter');
  const [stepCm, setStepCm] = useState<number>(1);
  const [draftLayout, setDraftLayout] = useState<ObsLayoutSettings>(() =>
    normalizeObsLayout(settings.obsLayout)
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    key: ObsElementKey;
    startClientX: number;
    startClientY: number;
    startPos: ObsElementPosition;
    stageWidth: number;
    stageHeight: number;
    lastSyncAt: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setDraftLayout(normalizeObsLayout(settings.obsLayout));
    }
  }, [settings.obsLayout, isDragging]);

  const activePos = draftLayout[selectedKey];
  const activeMeta =
    ELEMENT_META.find((m) => m.key === selectedKey) || ELEMENT_META[0];

  const commitLayoutUpdate = async (
    nextLayout: ObsLayoutSettings,
    feedback?: string
  ) => {
    setDraftLayout(nextLayout);
    await onUpdateSettings({ obsLayout: nextLayout });
    if (feedback) {
      setStatusMessage(feedback);
    }
  };

  const updateSingleElement = async (
    key: ObsElementKey,
    nextPos: ObsElementPosition,
    feedback?: string
  ) => {
    const clamped = clampObsElementPosition(nextPos);
    const nextLayout: ObsLayoutSettings = {
      ...draftLayout,
      [key]: clamped,
    };
    await commitLayoutUpdate(nextLayout, feedback);
  };

  const handleNudge = async (dxCm: number, dyCm: number) => {
    const nextPos = nudgeObsElementPosition(activePos, dxCm, dyCm);
    const direction =
      dxCm < 0
        ? `${Math.abs(dxCm)} cm left`
        : dxCm > 0
          ? `${dxCm} cm right`
          : dyCm < 0
            ? `${Math.abs(dyCm)} cm up`
            : `${dyCm} cm down`;
    await updateSingleElement(
      selectedKey,
      nextPos,
      `Moved ${activeMeta.label} ${direction} (${nextPos.xCm} cm, ${nextPos.yCm} cm)`
    );
  };

  const handleResetElement = async () => {
    await updateSingleElement(
      selectedKey,
      { xCm: 0, yCm: 0, scale: 1 },
      `Centered ${activeMeta.label} back to 0 cm, 0 cm`
    );
  };

  const handleResetAll = async () => {
    const centered: ObsLayoutSettings = {
      alerts: { xCm: 0, yCm: 0, scale: 1 },
      textAlerts: { xCm: 0, yCm: 0, scale: 1 },
      counter: { xCm: 0, yCm: 0, scale: 1 },
    };
    await commitLayoutUpdate(centered, 'Reset all OBS elements to center (0 cm, 0 cm)');
  };

  const handleStagePointerDown = (
    key: ObsElementKey,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedKey(key);

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStateRef.current = {
      key,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPos: draftLayout[key],
      stageWidth: rect.width,
      stageHeight: rect.height,
      lastSyncAt: 0,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const deltaStageX = e.clientX - drag.startClientX;
    const deltaStageY = e.clientY - drag.startClientY;

    // Convert stage CSS pixel delta into 1920x1080 OBS reference pixel delta, then to cm
    const obsDeltaXPx = (deltaStageX / drag.stageWidth) * REF_WIDTH_PX;
    const obsDeltaYPx = (deltaStageY / drag.stageHeight) * REF_HEIGHT_PX;

    const nextPos = clampObsElementPosition({
      xCm: drag.startPos.xCm + pxToCm(obsDeltaXPx),
      yCm: drag.startPos.yCm + pxToCm(obsDeltaYPx),
      scale: drag.startPos.scale,
    });

    const nextLayout: ObsLayoutSettings = {
      ...draftLayout,
      [drag.key]: nextPos,
    };
    setDraftLayout(nextLayout);

    const now = Date.now();
    if (now - drag.lastSyncAt >= 150) {
      drag.lastSyncAt = now;
      void onUpdateSettings({ obsLayout: nextLayout });
    }
  };

  const handleStagePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    dragStateRef.current = null;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore if capture was already released
    }

    const finalPos = draftLayout[drag.key];
    await onUpdateSettings({ obsLayout: draftLayout });
    const meta = ELEMENT_META.find((m) => m.key === drag.key) || activeMeta;
    setStatusMessage(
      `Synced ${meta.label} to OBS at X: ${finalPos.xCm} cm, Y: ${finalPos.yCm} cm`
    );
  };

  const handleTestOnObs = async () => {
    if (selectedKey === 'alerts') {
      await onFireTestAlert('SujalVIP_Legend', { eventType: 'follow' });
      setStatusMessage(
        `Sent Follow Alert to OBS at X: ${activePos.xCm} cm, Y: ${activePos.yCm} cm`
      );
    } else if (selectedKey === 'textAlerts') {
      await onFireTestAlert('KaranClutchX', {
        eventType: 'kicks',
        amount: 500,
        subMessage: 'Position test!',
      });
      setStatusMessage(
        `Sent Kicks Alert to OBS at X: ${activePos.xCm} cm, Y: ${activePos.yCm} cm`
      );
    } else {
      await onUpdateSettings({ obsLayout: draftLayout });
      setStatusMessage(
        `Follower Goal Bar synced live to OBS at X: ${activePos.xCm} cm, Y: ${activePos.yCm} cm`
      );
    }
  };

  const getStagePercentPosition = (pos: ObsElementPosition) => {
    const xPx = cmToPx(pos.xCm);
    const yPx = cmToPx(pos.yCm);
    const leftPct = 50 + (xPx / REF_WIDTH_PX) * 100;
    const topPct = 50 + (yPx / REF_HEIGHT_PX) * 100;
    return {
      left: `${Math.min(94, Math.max(6, leftPct))}%`,
      top: `${Math.min(92, Math.max(8, topPct))}%`,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header & Element Selector Row */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
              Live OBS Stage Positioner · Centimeter Precision
            </div>
            <h2 className="text-xl font-bold text-white">
              Move Overlays on OBS Directly from the Website
            </h2>
            <p className="text-xs text-slate-400">
              Drag any overlay on the stream canvas or nudge it by centimeters — your live OBS Browser Sources move immediately without changing any links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 tabular-nums">
            <span>
              OBS Alerts:{' '}
              <strong className="text-[#53FC18]">{obsCounts.alerts}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              OBS Counter:{' '}
              <strong className="text-[#53FC18]">{obsCounts.counter}</strong>
            </span>
          </div>
        </div>

        {/* Element Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ELEMENT_META.map((item) => {
            const isSelected = selectedKey === item.key;
            const pos = draftLayout[item.key];
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`select-obs-element-${item.key}`}
                onClick={() => setSelectedKey(item.key)}
                className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#08120B] border-[#53FC18] text-white'
                    : 'bg-[#080C12] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-bold whitespace-nowrap">
                    <span style={{ color: item.accentHex }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
                    {pos.xCm >= 0 ? `+${pos.xCm}` : pos.xCm}cm, {pos.yCm >= 0 ? `+${pos.yCm}` : pos.yCm}cm
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split: 16:9 Interactive Stream Canvas + Centimeter Precision Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: 16:9 Interactive Drag Stage */}
        <section className="lg:col-span-7 rounded-xl bg-[#0D131C] border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Move className="w-4 h-4 text-[#53FC18]" />
              <span>16:9 OBS Stream Preview Stage (Drag Any Element)</span>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              1920 × 1080 Canvas · 1 cm = 37.8 px
            </span>
          </div>

          <div
            ref={stageRef}
            data-testid="obs-drag-stage"
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            className="relative w-full aspect-video rounded-lg bg-[#05080E] border border-slate-700 overflow-hidden select-none touch-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '7.45% 13.23%', // ~3.78cm major grid on 1920x1080
            }}
          >
            {/* Center Crosshair Guides */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-slate-700/60"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-700/60"
            />
            <span className="pointer-events-none absolute left-2 top-2 text-[10px] font-mono text-slate-500">
              OBS 16:9 STREAM FRAME
            </span>

            {/* Draggable Follow Alert Box */}
            {(() => {
              const pos = draftLayout.alerts;
              const stylePos = getStagePercentPosition(pos);
              const isSelected = selectedKey === 'alerts';
              return (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Drag Follow Alert Box on OBS canvas"
                  data-testid="stage-handle-alerts"
                  onPointerDown={(e) => handleStagePointerDown('alerts', e)}
                  style={{
                    left: stylePos.left,
                    top: stylePos.top,
                    transform: `translate(-50%, -50%) scale(${Math.max(0.65, Math.min(1.25, pos.scale * 0.85))})`,
                  }}
                  className={`absolute rounded-lg px-3 py-2 border cursor-grab active:cursor-grabbing transition-shadow whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#07150C] border-[#53FC18] text-white z-20 shadow-[0_0_20px_rgba(83,252,24,0.35)]'
                      : 'bg-[#081014]/90 border-slate-600 text-slate-300 z-10 hover:border-[#53FC18]/70'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <BellRing className="w-3.5 h-3.5 text-[#53FC18]" />
                    <span>Follow Alert</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#53FC18] tabular-nums">
                    {pos.xCm}cm, {pos.yCm}cm
                  </div>
                </div>
              );
            })()}

            {/* Draggable Kicks & Subs Text Alert */}
            {(() => {
              const pos = draftLayout.textAlerts;
              const stylePos = getStagePercentPosition(pos);
              const isSelected = selectedKey === 'textAlerts';
              return (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Drag Kicks and Subs Alert on OBS canvas"
                  data-testid="stage-handle-textAlerts"
                  onPointerDown={(e) => handleStagePointerDown('textAlerts', e)}
                  style={{
                    left: stylePos.left,
                    top: stylePos.top,
                    transform: `translate(-50%, -50%) scale(${Math.max(0.65, Math.min(1.25, pos.scale * 0.85))})`,
                  }}
                  className={`absolute rounded-lg px-3 py-2 border cursor-grab active:cursor-grabbing transition-shadow whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#171104] border-amber-400 text-white z-20 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                      : 'bg-[#110D05]/90 border-slate-600 text-slate-300 z-10 hover:border-amber-400/70'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kicks &amp; Subs</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-300 tabular-nums">
                    {pos.xCm}cm, {pos.yCm}cm
                  </div>
                </div>
              );
            })()}

            {/* Draggable Follower Goal Bar */}
            {(() => {
              const pos = draftLayout.counter;
              const stylePos = getStagePercentPosition(pos);
              const isSelected = selectedKey === 'counter';
              return (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Drag Follower Goal Bar on OBS canvas"
                  data-testid="stage-handle-counter"
                  onPointerDown={(e) => handleStagePointerDown('counter', e)}
                  style={{
                    left: stylePos.left,
                    top: stylePos.top,
                    transform: `translate(-50%, -50%) scale(${Math.max(0.65, Math.min(1.25, pos.scale * 0.85))})`,
                  }}
                  className={`absolute rounded-lg px-3.5 py-2 border cursor-grab active:cursor-grabbing transition-shadow whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#05121A] border-sky-400 text-white z-20 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                      : 'bg-[#08101A]/90 border-slate-600 text-slate-300 z-10 hover:border-sky-400/70'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Target className="w-3.5 h-3.5 text-sky-400" />
                    <span>Follower Goal Bar</span>
                  </div>
                  <div className="text-[10px] font-mono text-sky-300 tabular-nums">
                    {pos.xCm}cm, {pos.yCm}cm
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="rounded-lg bg-[#080B11] border border-slate-800 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-300">
            <Monitor className="w-4 h-4 text-[#53FC18] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">OBS Tip:</strong> To move overlays anywhere across your entire screen from this website, set your OBS Browser Source size to <strong className="text-[#53FC18] font-mono">1920 × 1080</strong>. Your existing permanent OBS links sync live automatically.
            </span>
          </div>
        </section>

        {/* Right: Centimeter Precision Nudge & Exact Coordinate Controls */}
        <section className="lg:col-span-5 rounded-xl bg-[#0D131C] border border-slate-800 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
                  Moving: {activeMeta.label}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Source route: {activeMeta.obsQuery}
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {cmToPx(activePos.xCm)} px, {cmToPx(activePos.yCm)} px
              </span>
            </div>

            {/* Step Size in Centimeters */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Move Step Size (Centimeters)
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {STEP_OPTIONS_CM.map((val) => (
                  <button
                    key={val}
                    type="button"
                    data-testid={`step-cm-${val}`}
                    onClick={() => setStepCm(val)}
                    className={`rounded-lg py-2 px-2 text-xs font-mono font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      stepCm === val
                        ? 'bg-[#53FC18] text-slate-950 border-[#53FC18]'
                        : 'bg-[#080B11] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {val} cm
                  </button>
                ))}
              </div>
            </div>

            {/* Directional Nudge Pad */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Quick Centimeter Move Pad ({stepCm} cm per click)
              </div>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <div />
                <button
                  type="button"
                  data-testid="nudge-up-btn"
                  onClick={() => handleNudge(0, -stepCm)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#080C12] hover:bg-slate-800 border border-slate-700 hover:border-[#53FC18] text-xs font-semibold text-white py-2.5 px-3 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Up</span>
                </button>
                <div />

                <button
                  type="button"
                  data-testid="nudge-left-btn"
                  onClick={() => handleNudge(-stepCm, 0)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#080C12] hover:bg-slate-800 border border-slate-700 hover:border-[#53FC18] text-xs font-semibold text-white py-2.5 px-3 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Left</span>
                </button>

                <button
                  type="button"
                  data-testid="nudge-center-btn"
                  onClick={handleResetElement}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono font-bold text-[#53FC18] py-2.5 px-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>0 cm</span>
                </button>

                <button
                  type="button"
                  data-testid="nudge-right-btn"
                  onClick={() => handleNudge(stepCm, 0)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#080C12] hover:bg-slate-800 border border-slate-700 hover:border-[#53FC18] text-xs font-semibold text-white py-2.5 px-3 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Right</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#53FC18]" />
                </button>

                <div />
                <button
                  type="button"
                  data-testid="nudge-down-btn"
                  onClick={() => handleNudge(0, stepCm)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#080C12] hover:bg-slate-800 border border-slate-700 hover:border-[#53FC18] text-xs font-semibold text-white py-2.5 px-3 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Down</span>
                </button>
                <div />
              </div>
            </div>

            {/* Exact Centimeter Sliders & Inputs */}
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="obs-pos-x-cm" className="font-semibold text-slate-300">
                    Left / Right Offset (cm)
                  </label>
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <input
                      id="obs-pos-x-cm"
                      type="number"
                      step={0.1}
                      min={-25}
                      max={25}
                      data-testid="input-x-cm"
                      value={activePos.xCm}
                      onChange={(e) =>
                        updateSingleElement(selectedKey, {
                          ...activePos,
                          xCm: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 rounded bg-[#070A0F] border border-slate-700 px-2 py-1 text-xs text-right text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
                    />
                    <span className="text-slate-400">cm</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Horizontal Position Slider in Centimeters"
                  min={-25}
                  max={25}
                  step={0.2}
                  value={activePos.xCm}
                  onChange={(e) =>
                    updateSingleElement(selectedKey, {
                      ...activePos,
                      xCm: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#53FC18] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="obs-pos-y-cm" className="font-semibold text-slate-300">
                    Up / Down Offset (cm)
                  </label>
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <input
                      id="obs-pos-y-cm"
                      type="number"
                      step={0.1}
                      min={-15}
                      max={15}
                      data-testid="input-y-cm"
                      value={activePos.yCm}
                      onChange={(e) =>
                        updateSingleElement(selectedKey, {
                          ...activePos,
                          yCm: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 rounded bg-[#070A0F] border border-slate-700 px-2 py-1 text-xs text-right text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
                    />
                    <span className="text-slate-400">cm</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Vertical Position Slider in Centimeters"
                  min={-15}
                  max={15}
                  step={0.2}
                  value={activePos.yCm}
                  onChange={(e) =>
                    updateSingleElement(selectedKey, {
                      ...activePos,
                      yCm: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#53FC18] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="obs-scale-range" className="font-semibold text-slate-300">
                    Element Scale Size
                  </label>
                  <span className="font-mono font-bold text-[#53FC18] tabular-nums">
                    {Math.round(activePos.scale * 100)}%
                  </span>
                </div>
                <input
                  id="obs-scale-range"
                  type="range"
                  min={0.5}
                  max={1.8}
                  step={0.05}
                  value={activePos.scale}
                  onChange={(e) =>
                    updateSingleElement(selectedKey, {
                      ...activePos,
                      scale: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#53FC18] cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="test-obs-position-btn"
                onClick={handleTestOnObs}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs py-2.5 px-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Test Position on OBS</span>
              </button>

              <button
                type="button"
                data-testid="reset-all-obs-positions-btn"
                onClick={handleResetAll}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2.5 px-3.5 border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>

            {statusMessage && (
              <p
                role="status"
                className="text-xs font-mono text-[#53FC18] text-center"
              >
                {statusMessage}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
