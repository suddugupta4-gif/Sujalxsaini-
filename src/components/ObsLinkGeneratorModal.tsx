import React, { useState } from 'react';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Monitor,
  Code2,
  Sparkles,
} from 'lucide-react';
import { OBS_CUSTOM_CSS } from '../utils/logic';

interface ObsLinkGeneratorPanelProps {
  mode: 'alerts' | 'counter';
  generatedUrl: string;
  templateName: string;
  activeConnections: number;
  onLinkCopied?: () => void;
}

export const ObsLinkGeneratorPanel: React.FC<ObsLinkGeneratorPanelProps> = ({
  mode,
  generatedUrl,
  templateName,
  activeConnections,
  onLinkCopied,
}) => {
  const [showUrl, setShowUrl] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);

  const recommendedWidth = mode === 'alerts' ? 850 : 600;
  const recommendedHeight = mode === 'alerts' ? 250 : 260;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
    } catch {
      // Fallback copy
    }
    setCopiedUrl(true);
    onLinkCopied?.();
    setTimeout(() => setCopiedUrl(false), 2200);
  };

  const handleCopyCss = async () => {
    try {
      await navigator.clipboard.writeText(OBS_CUSTOM_CSS);
    } catch {
      // Fallback copy
    }
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2200);
  };

  return (
    <section
      aria-label={`OBS Link Generator for ${templateName}`}
      className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
            Zero-CSS Auto-Transparent OBS Browser Source Generator
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">
            {mode === 'alerts'
              ? `Follower Alert + Animated TTS Link (${templateName})`
              : `Live Follower Counter & Animated Goal Link (${templateName})`}
          </h3>
        </div>

        {/* Live OBS Connection Status Badge */}
        <div
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold border whitespace-nowrap shrink-0 ${
            activeConnections > 0
              ? 'bg-[#53FC18]/10 border-[#53FC18]/40 text-[#53FC18]'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          {activeConnections > 0
            ? `🟢 Connected in OBS (${activeConnections} active)`
            : '⚪ Waiting for OBS Browser Source (0 active)'}
        </div>
      </div>

      {/* Auto-Transparent Notice */}
      <div className="rounded-lg bg-[#53FC18]/10 border border-[#53FC18]/35 px-4 py-2.5 flex items-center gap-2.5 text-xs text-slate-200">
        <Sparkles className="w-4 h-4 text-[#53FC18] shrink-0" />
        <span>
          <strong className="text-[#53FC18]">No Custom CSS Required!</strong> Just paste this link into OBS Studio Browser Source — the background is 100% transparent and the VFX box is pre-sized automatically.
        </span>
      </div>

      {/* Generated OBS URL Input Box with Privacy Blur Toggle */}
      <div className="space-y-2">
        <label
          htmlFor={`obs-url-input-${mode}`}
          className="block text-xs font-medium text-slate-300"
        >
          Generated Root Query-Param OBS URL (Paste directly into OBS Browser Source URL field)
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              id={`obs-url-input-${mode}`}
              type="text"
              readOnly
              value={generatedUrl}
              className={`w-full rounded-lg bg-[#070A0F] border border-slate-800 px-3.5 py-2.5 pr-10 text-xs font-mono text-[#53FC18] focus:outline-none focus:border-[#53FC18] transition-all ${
                showUrl ? '' : 'blur-[5px] select-none'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowUrl((prev) => !prev)}
              aria-label={showUrl ? 'Hide OBS URL' : 'Reveal OBS URL'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-4 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? 'Copied for OBS!' : 'Copy Link for OBS'}</span>
          </button>

          <a
            href={
              mode === 'alerts' ? `${generatedUrl}&preview=1` : generatedUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs px-4 py-2.5 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-4 h-4 text-[#53FC18]" />
            <span>Test Overlay in New Tab</span>
          </a>
        </div>
      </div>

      {/* Recommended OBS Browser Source Settings & Optional GPU Animation Custom CSS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        <div className="rounded-lg bg-[#080B11] border border-slate-800/90 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-[#53FC18] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">
                Recommended OBS Dimensions
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Check &ldquo;Control audio via OBS&rdquo; in Browser Source
              </div>
            </div>
          </div>
          <div className="text-right font-mono tabular-nums">
            <span className="text-sm font-bold text-[#53FC18]">
              {recommendedWidth} × {recommendedHeight}
            </span>
            <div className="text-[11px] text-slate-400">Width × Height (px)</div>
          </div>
        </div>

        <div className="rounded-lg bg-[#080B11] border border-slate-800/90 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Code2 className="w-4 h-4 text-[#53FC18] shrink-0" />
              <span>Optional: 60FPS GPU Animation Boost CSS for OBS</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCss}
              className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedCss ? 'CSS Copied!' : 'Copy Optional CSS'}
            </button>
          </div>
          <code className="block text-[11px] font-mono text-slate-300 truncate bg-[#05070B] px-2.5 py-1.5 rounded border border-slate-800">
            {OBS_CUSTOM_CSS}
          </code>
          <p className="text-[11px] text-slate-400">
            <strong className="text-slate-200">How to add in OBS (Optional):</strong> Double-click your Browser Source in OBS &rarr; Scroll to the <strong className="text-white">&ldquo;Custom CSS&rdquo;</strong> field &rarr; Paste this snippet for hardware-accelerated 60FPS animations &rarr; Click OK.
          </p>
        </div>
      </div>
    </section>
  );
};
