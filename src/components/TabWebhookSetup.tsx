import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Zap,
  Terminal,
  Server,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { AppSettings, SetupChecklist } from '../types';

interface TabWebhookSetupProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onClearLogs: () => Promise<void>;
}

export const TabWebhookSetup: React.FC<TabWebhookSetupProps> = ({
  settings,
  onUpdateSettings,
  onClearLogs,
}) => {
  const [simUsername, setSimUsername] = useState('AaravSniper_IN');
  const [simStatus, setSimStatus] = useState<string>('');
  const [isSendingSim, setIsSendingSim] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedHealth, setCopiedHealth] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(
    settings.webhookLogs[0]?.id || null
  );

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://sujalx-kick.onrender.com';
  const webhookUrl = `${origin}/api/webhook/kick`;
  const healthUrl = `${origin}/api/health`;

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Kick-Event-Type: channel.followed" \\
  -d '{"event":"channel.followed","channel":{"slug":"sujalxsaini"},"follower":{"username":"${
    simUsername || 'KickVIP_Tester'
  }","verified":true}}'`;

  const toggleChecklist = (key: keyof SetupChecklist) => {
    onUpdateSettings({
      setupChecklist: {
        ...settings.setupChecklist,
        [key]: !settings.setupChecklist[key],
      },
    });
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
    } catch {
      // ignore
    }
    setCopiedWebhookUrl(true);
    onUpdateSettings({
      setupChecklist: {
        ...settings.setupChecklist,
        webhookStep1UrlCopied: true,
      },
    });
    setTimeout(() => setCopiedWebhookUrl(false), 2200);
  };

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
    } catch {
      // ignore
    }
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2200);
  };

  const handleCopyHealth = async () => {
    try {
      await navigator.clipboard.writeText(healthUrl);
    } catch {
      // ignore
    }
    setCopiedHealth(true);
    setTimeout(() => setCopiedHealth(false), 2200);
  };

  const handleSendRealKickWebhookPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = simUsername.trim() || 'KickVIP_Follower';
    setIsSendingSim(true);
    setSimStatus('');

    try {
      const response = await fetch('/api/webhook/kick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Kick-Event-Type': 'channel.followed',
          'X-SujalX-Simulated': 'true',
        },
        body: JSON.stringify({
          event: 'channel.followed',
          channel: {
            id: 948201,
            slug: 'sujalxsaini',
            url: 'https://kick.com/sujalxsaini',
          },
          follower: {
            username: cleanUser,
            slug: cleanUser.toLowerCase().replace(/[^a-z0-9_]/g, ''),
            verified: true,
          },
          created_at: new Date().toISOString(),
        }),
      });
      const data = await response.json();
      if (response.ok && data.received) {
        setSimStatus(
          `200 OK — Webhook processed for "${cleanUser}"! New Follower Count: ${data.followerCount}`
        );
      } else {
        setSimStatus('Webhook returned an unexpected status.');
      }
    } catch {
      setSimStatus('Network error sending simulated webhook.');
    } finally {
      setIsSendingSim(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Auto-Generated Webhook Callback URL */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
              01. Auto-Generated Kick Webhook Callback Endpoint
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Official Kick Webhook Listener for kick.com/sujalxsaini
            </h2>
          </div>

          <button
            type="button"
            onClick={() => toggleChecklist('webhookStep1UrlCopied')}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            {settings.setupChecklist.webhookStep1UrlCopied ? (
              <CheckSquare className="w-4 h-4 text-[#53FC18]" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>Step 1 Complete</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            readOnly
            aria-label="Kick Webhook Callback URL"
            value={webhookUrl}
            className="flex-1 rounded-lg bg-[#070A0F] border border-[#53FC18]/50 px-4 py-3 text-sm font-mono text-[#53FC18] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-5 py-3 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedWebhookUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedWebhookUrl ? 'Webhook URL Copied!' : 'Copy Webhook URL'}</span>
          </button>
        </div>
      </section>

      {/* Step 2 & Step 3 Split: Kick Developer Portal Wizard + Built-in Webhook Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Step 2: Kick Developer Portal Setup */}
        <section className="lg:col-span-6 rounded-xl bg-[#0D131C] border border-slate-800 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
                  02. Kick Developer Portal Configuration
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Connect kick.com/sujalxsaini in 60 Seconds
                </h3>
              </div>
              <a
                href="https://kick.com/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#53FC18]/15 hover:bg-[#53FC18]/25 border border-[#53FC18]/50 text-[#53FC18] text-xs font-bold px-3.5 py-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Kick Developer Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="rounded-lg bg-[#080B11] border border-slate-800/80 p-3 flex items-start gap-3">
                <span className="font-mono font-bold text-[#53FC18]">01.</span>
                <div>
                  Log in to <strong className="text-white">kick.com/sujalxsaini</strong>, open{' '}
                  <code className="text-[#53FC18] font-mono">kick.com/settings/developer</code>, and click{' '}
                  <strong className="text-white">&ldquo;Create New App&rdquo;</strong> (Name it{' '}
                  <code className="text-white font-mono">SujalX Overlay Studio</code>).
                </div>
              </li>
              <li className="rounded-lg bg-[#080B11] border border-slate-800/80 p-3 flex items-start gap-3">
                <span className="font-mono font-bold text-[#53FC18]">02.</span>
                <div>
                  Toggle on <strong className="text-white">&ldquo;Enable Webhooks&rdquo;</strong> in your app settings.
                </div>
              </li>
              <li className="rounded-lg bg-[#080B11] border border-slate-800/80 p-3 flex items-start gap-3">
                <span className="font-mono font-bold text-[#53FC18]">03.</span>
                <div>
                  Paste your copied callback URL (<code className="text-[#53FC18] font-mono">{webhookUrl}</code>) into the{' '}
                  <strong className="text-white">Webhook Callback URL</strong> field.
                </div>
              </li>
              <li className="rounded-lg bg-[#080B11] border border-slate-800/80 p-3 flex items-start gap-3">
                <span className="font-mono font-bold text-[#53FC18]">04.</span>
                <div>
                  Under <strong className="text-white">Event Subscriptions</strong>, check{' '}
                  <code className="text-[#53FC18] font-mono font-bold">channel.followed</code> and click{' '}
                  <strong className="text-white">Save App</strong>.
                </div>
              </li>
            </ol>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => toggleChecklist('webhookStep2AppCreated')}
              className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              {settings.setupChecklist.webhookStep2AppCreated ? (
                <CheckSquare className="w-4 h-4 text-[#53FC18]" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Created Kick Developer App</span>
            </button>
            <button
              type="button"
              onClick={() => toggleChecklist('webhookStep3SubscribedFollowed')}
              className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              {settings.setupChecklist.webhookStep3SubscribedFollowed ? (
                <CheckSquare className="w-4 h-4 text-[#53FC18]" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Subscribed to channel.followed</span>
            </button>
          </div>
        </section>

        {/* Step 3: Built-in Webhook Simulator & cURL Tester */}
        <section className="lg:col-span-6 rounded-xl bg-[#0D131C] border border-slate-800 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
                03. End-to-End Webhook Simulator & Terminal cURL Tester
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Test POST /api/webhook/kick Pipeline Live
              </h3>
            </div>

            <form onSubmit={handleSendRealKickWebhookPost} className="space-y-3">
              <label
                htmlFor="sim-webhook-username"
                className="block text-xs font-medium text-slate-300"
              >
                Simulated New Follower Username (Triggers POST /api/webhook/kick + OBS Alert + +1 Count)
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="sim-webhook-username"
                  type="text"
                  value={simUsername}
                  onChange={(e) => setSimUsername(e.target.value)}
                  placeholder="Enter follower username"
                  className="flex-1 rounded-lg bg-[#070A0F] border border-slate-700 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#53FC18]"
                />
                <button
                  type="submit"
                  disabled={isSendingSim}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs px-4 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {isSendingSim
                      ? 'Sending Webhook...'
                      : 'Send Simulated Kick Webhook (channel.followed)'}
                  </span>
                </button>
              </div>
              {simStatus && (
                <div
                  role="status"
                  className="rounded-lg bg-[#53FC18]/10 border border-[#53FC18]/40 px-3.5 py-2 text-xs font-mono text-[#53FC18]"
                >
                  {simStatus}
                </div>
              )}
            </form>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Pre-Filled Terminal cURL Command
                </span>
                <button
                  type="button"
                  onClick={handleCopyCurl}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#53FC18] hover:underline cursor-pointer"
                >
                  {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCurl ? 'cURL Copied!' : 'Copy cURL Command'}</span>
                </button>
              </div>
              <pre className="rounded-lg bg-[#06080D] border border-slate-800 p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {curlCommand}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* Step 4: Live Webhook Traffic Inspector (Real-Time Terminal) */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#53FC18]" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
                04. Real-Time Webhook Traffic Inspector
              </div>
              <h3 className="text-lg font-bold text-white">
                Incoming POST /api/webhook/kick Requests ({settings.webhookLogs.length})
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 px-3 py-1.5 border border-slate-700 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Webhook Logs</span>
          </button>
        </div>

        {settings.webhookLogs.length === 0 ? (
          <div className="rounded-lg bg-[#070A0F] border border-slate-800 p-8 text-center">
            <p className="text-sm text-slate-300 font-medium">
              No webhook events logged in this session yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click &ldquo;Send Simulated Kick Webhook (channel.followed)&rdquo; above to inspect a live payload!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {settings.webhookLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="rounded-lg bg-[#070A0F] border border-slate-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      <span className="text-[#53FC18] font-bold">
                        {log.status} OK
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300">{log.eventType}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-semibold">
                        <span className="text-[#53FC18] font-bold">{log.username}</span>{' '}
                        <span className="text-white">started following</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 tabular-nums">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-4 bg-[#05070B] grid grid-cols-1 lg:grid-cols-2 gap-4 text-[11px] font-mono">
                      <div>
                        <div className="text-slate-400 mb-1 uppercase">
                          Request Headers
                        </div>
                        <pre className="text-slate-300 overflow-x-auto bg-[#080C12] p-3 rounded border border-slate-800">
                          {JSON.stringify(log.headers, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-400 mb-1 uppercase">
                          JSON Webhook Payload
                        </div>
                        <pre className="text-[#53FC18] overflow-x-auto bg-[#080C12] p-3 rounded border border-slate-800">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 5: Zero-to-Live Render.com (onrender.com) Hosting Guide */}
      <section className="rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-[#53FC18]" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
                05. Zero-to-Live Render.com (onrender.com) Production Deployment
              </div>
              <h3 className="text-lg font-bold text-white">
                Deploy Unified Express + Vite Web Service & 24/7 Keep-Alive
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleChecklist('webhookStep5RenderDeployed')}
            className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            {settings.setupChecklist.webhookStep5RenderDeployed ? (
              <CheckSquare className="w-4 h-4 text-[#53FC18]" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>Deployed on Render.com</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-1.5">
            <div className="font-mono text-[#53FC18] font-bold">
              01. Render Build Command
            </div>
            <code className="block bg-[#05070B] border border-slate-800 rounded px-3 py-2 font-mono text-white">
              npm install --include=dev &amp;&amp; npm run build
            </code>
            <p className="text-slate-400">
              Installs TypeScript/Vite build tools and compiles the React 19 frontend into /dist.
            </p>
          </div>

          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-1.5">
            <div className="font-mono text-[#53FC18] font-bold">
              02. Render Start Command
            </div>
            <code className="block bg-[#05070B] border border-slate-800 rounded px-3 py-2 font-mono text-white">
              NODE_ENV=production npx tsx server.ts
            </code>
            <p className="text-slate-400">
              Or <code className="text-[#53FC18] font-mono">npm start</code> — runs unified server.ts serving SSE, Webhooks, TTS &amp; /?obs= overlays.
            </p>
          </div>

          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#53FC18] font-bold">
                03. 24/7 Keep-Alive Health URL
              </span>
              <button
                type="button"
                onClick={handleCopyHealth}
                className="text-[#53FC18] hover:underline font-mono cursor-pointer"
              >
                {copiedHealth ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <code className="block bg-[#05070B] border border-slate-800 rounded px-3 py-2 font-mono text-[#53FC18] truncate">
              {healthUrl}
            </code>
            <p className="text-slate-400">
              Add to UptimeRobot (5m interval) so Render never spins down mid-stream.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
