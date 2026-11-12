import React, { useState } from 'react';
import {
  Megaphone,
  RotateCcw,
  Volume2,
  Search,
  Users,
  Send,
} from 'lucide-react';
import type { AppSettings, TtsLangCode } from '../types';
import {
  TTS_LANGUAGES,
  generateGamerAvatarDataUri,
  getFollowerAvatarUrl,
} from '../utils/logic';
import { speakAlertTts } from '../utils/soundEngine';

interface TabVipToolsFeedProps {
  settings: AppSettings;
  onReplayAlert: (username: string) => Promise<void>;
}

const QUICK_MEGAPHONE_LINES = [
  'Welcome everyone to the sujalxsaini VIP stream! Drop a follow and lock in!',
  'Shoutout to the newest legends joining the sujalxsaini squad on Kick!',
  'We are pushing toward our 1.5K follower milestone right now! Let us go!',
  'सुजल भाई की स्ट्रीम में आप सभी का स्वागत है, फॉलो बटन दबा दो!',
];

export const TabVipToolsFeed: React.FC<TabVipToolsFeedProps> = ({
  settings,
  onReplayAlert,
}) => {
  const [megaphoneText, setMegaphoneText] = useState(
    'Welcome to the official sujalxsaini VIP stream on Kick! Smash that follow button!'
  );
  const [megaphoneLang, setMegaphoneLang] = useState<TtsLangCode>(
    settings.ttsSettings.lang
  );
  const [announceStatus, setAnnounceStatus] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const filteredFollowers = settings.recentFollowers.filter((f) =>
    f.username.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  const handleBroadcastMegaphone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!megaphoneText.trim()) {
      setAnnounceStatus('Please enter a message to announce on stream.');
      return;
    }

    try {
      const res = await fetch('/api/tts-announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: megaphoneText.trim(),
          lang: megaphoneLang,
        }),
      });
      if (res.ok) {
        setAnnounceStatus('Live VIP TTS Announcement broadcast to OBS!');
        speakAlertTts({
          text: megaphoneText.trim(),
          lang: megaphoneLang,
          mode: settings.ttsSettings.mode,
          rate: settings.ttsSettings.rate,
          pitch: settings.ttsSettings.pitch,
          volume: settings.ttsSettings.volume,
          muted: settings.alertsMuted,
        });
        setTimeout(() => setAnnounceStatus(''), 3500);
      }
    } catch {
      setAnnounceStatus('Failed to send announcement.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Live VIP TTS Megaphone */}
      <section className="lg:col-span-5 rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Megaphone className="w-5 h-5 text-[#53FC18]" />
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
              Live On-Stream Voice Caster
            </div>
            <h2 className="text-lg font-bold text-white">
              VIP Stream TTS Megaphone
            </h2>
          </div>
        </div>

        <form onSubmit={handleBroadcastMegaphone} className="space-y-4">
          <div>
            <label
              htmlFor="megaphone-lang"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Megaphone Voice Accent
            </label>
            <select
              id="megaphone-lang"
              value={megaphoneLang}
              onChange={(e) => setMegaphoneLang(e.target.value as TtsLangCode)}
              className="w-full rounded-lg bg-[#070A0F] border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#53FC18]"
            >
              {TTS_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="megaphone-textarea"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Custom Spoken Message for OBS Stream
            </label>
            <textarea
              id="megaphone-textarea"
              rows={3}
              value={megaphoneText}
              onChange={(e) => setMegaphoneText(e.target.value)}
              placeholder="Type any message to speak live on stream..."
              className="w-full rounded-lg bg-[#070A0F] border border-slate-700 p-3 text-xs text-white focus:outline-none focus:border-[#53FC18]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-slate-400">
              One-Click Stream Hype Presets:
            </div>
            <div className="space-y-1.5">
              {QUICK_MEGAPHONE_LINES.map((line, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMegaphoneText(line)}
                  className="w-full text-left rounded-lg bg-[#080B11] hover:bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-300 truncate cursor-pointer"
                >
                  &ldquo;{line}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-xs py-3 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Speak Live on OBS Stream Now</span>
          </button>

          {announceStatus && (
            <p
              role="status"
              className="text-xs font-mono text-[#53FC18] text-center"
            >
              {announceStatus}
            </p>
          )}
        </form>
      </section>

      {/* Recent Followers Activity Feed with 1-Click Replay Alert */}
      <section className="lg:col-span-7 rounded-xl bg-[#0D131C] border border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#53FC18]" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#53FC18]">
                Live Activity Feed · kick.com/sujalxsaini
              </div>
              <h2 className="text-lg font-bold text-white">
                Recent Followers History ({settings.recentFollowers.length})
              </h2>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search recent followers"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter followers..."
              className="rounded-lg bg-[#070A0F] border border-slate-700 pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#53FC18]"
            />
          </div>
        </div>

        {filteredFollowers.length === 0 ? (
          <div className="rounded-lg bg-[#080B11] border border-slate-800 p-8 text-center text-xs text-slate-400">
            No matching followers found. Fire a test alert or simulate a Kick webhook to populate the feed.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#080B11] overflow-hidden">
            {filteredFollowers.map((item) => {
              const pfpSrc = getFollowerAvatarUrl(
                item.username,
                item.avatarUrl || settings.customAvatarUrl,
                '#53FC18'
              );
              const fallbackSrc = generateGamerAvatarDataUri(
                item.username,
                '#53FC18'
              );
              return (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={pfpSrc}
                      alt={`${item.username} PFP`}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== fallbackSrc) {
                          target.src = fallbackSrc;
                        }
                      }}
                      className="w-9 h-9 rounded-lg border border-[#53FC18]/60 bg-[#060A0F] object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        <span className="text-[#53FC18]">{item.username}</span>{' '}
                        <span className="text-white font-semibold">
                          started following
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        <span>{item.source}</span>
                        <span>·</span>
                        <span>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setReplayingId(item.id);
                      await onReplayAlert(item.username);
                      setTimeout(() => setReplayingId(null), 1200);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#53FC18] text-xs font-semibold px-3.5 py-2 border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {replayingId === item.id ? (
                      <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {replayingId === item.id ? 'Replaying...' : 'Replay Alert'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
