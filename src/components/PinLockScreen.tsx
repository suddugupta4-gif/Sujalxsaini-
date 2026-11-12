import React, { useState } from 'react';
import { Lock, ShieldCheck, ExternalLink, KeyRound } from 'lucide-react';
import { validatePin } from '../utils/logic';

interface PinLockScreenProps {
  expectedPin: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  expectedPin,
  onUnlock,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setError('Please enter your 4-digit VIP PIN code (Default: 1234).');
      return;
    }
    if (validatePin(pinInput, expectedPin)) {
      setError('');
      onUnlock();
    } else {
      setError('Invalid VIP PIN code. Default PIN for sujalxsaini is 1234.');
    }
  };

  const handleQuickDigit = (digit: string) => {
    setError('');
    const next = (pinInput + digit).slice(0, 6);
    setPinInput(next);
    if (validatePin(next, expectedPin)) {
      onUnlock();
    }
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-[#0D121B] border border-slate-800 p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#53FC18]/15 border border-[#53FC18] flex items-center justify-center">
              <span
                className="text-2xl font-black text-[#53FC18]"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                K
              </span>
            </div>
            <div>
              <h1
                className="text-lg font-extrabold tracking-wide text-white"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                SujalX Kick Studio
              </h1>
              <p className="text-xs text-slate-400">
                Private Streamer Console · kick.com/sujalxsaini
              </p>
            </div>
          </div>
          <Lock className="w-5 h-5 text-[#53FC18]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="vip-pin-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Enter Private VIP Access PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="vip-pin-input"
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => {
                  setError('');
                  setPinInput(e.target.value);
                }}
                placeholder="Enter 4-digit PIN (1234)"
                className="w-full rounded-lg bg-[#070A0F] border border-slate-700 pl-10 pr-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-[#53FC18] focus:outline-none focus:border-[#53FC18]"
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-rose-400 mt-2 font-medium">
                {error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleQuickDigit(digit)}
                className="py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 font-mono text-sm font-bold text-slate-200 transition-colors cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                setError('');
              }}
              className="py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleQuickDigit('0')}
              className="py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 font-mono text-sm font-bold text-slate-200 transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                setPinInput('1234');
                onUnlock();
              }}
              className="py-2.5 rounded-lg bg-[#53FC18]/15 hover:bg-[#53FC18]/25 border border-[#53FC18]/40 text-xs font-bold text-[#53FC18] transition-colors cursor-pointer"
            >
              Auto 1234
            </button>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#53FC18] hover:bg-[#45d912] text-slate-950 font-bold text-sm py-3 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock SujalX Studio</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>OBS ?obs= links bypass PIN lock automatically</span>
          <a
            href="https://kick.com/sujalxsaini"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#53FC18] hover:underline"
          >
            <span>kick.com/sujalxsaini</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
