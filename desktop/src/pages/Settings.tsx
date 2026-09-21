import React, { useState } from 'react';
import { Globe, Wifi, Unlink, CheckCircle2 } from 'lucide-react';
import { ConnectionMode } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  onDisconnect: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  connectionMode,
  setConnectionMode,
  onDisconnect
}) => {
  const [relayUrl, setRelayUrl] = useState<string>('ws://localhost:4000/ws');
  const [phoneUrl, setPhoneUrl] = useState<string>(api.getBaseUrl());
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSaveSettings = () => {
    api.setConnection(phoneUrl, api.getToken(), connectionMode, api.getSessionId());
    setSavedMessage('Settings saved successfully.');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100">Settings</h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          Connection Modes &amp; Device Pairing Configuration
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Connection Mode Selection */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-5">
        <h3 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
          Connection Architecture Mode
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setConnectionMode('direct')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              connectionMode === 'direct'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-gray-100'
                : 'bg-[#121824] border-[#1e2738] text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Wifi className={`w-5 h-5 ${connectionMode === 'direct' ? 'text-emerald-400' : 'text-gray-500'}`} />
              <div>
                <h4 className="font-bold text-sm">MODE 1 — LOCAL/LAN DEMO</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Direct connection between PC and phone over same Wi-Fi network.
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setConnectionMode('relay')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              connectionMode === 'relay'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-gray-100'
                : 'bg-[#121824] border-[#1e2738] text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Globe className={`w-5 h-5 ${connectionMode === 'relay' ? 'text-emerald-400' : 'text-gray-500'}`} />
              <div>
                <h4 className="font-bold text-sm">MODE 2 — RELAY</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Persistent outbound WebSocket through Node.js relay server.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* URL Inputs */}
        <div className="space-y-4 pt-4 border-t border-[#182030]">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
              Active Control Server URL (Mode 1 LAN)
            </label>
            <input
              type="text"
              value={phoneUrl}
              onChange={(e) => setPhoneUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#121824] border border-[#1e2738] rounded-lg text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
              Relay Server WebSocket URL (Mode 2)
            </label>
            <input
              type="text"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#121824] border border-[#1e2738] rounded-lg text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20"
          >
            SAVE CONFIGURATION
          </button>
        </div>
      </div>

      {/* Disconnect & Reset Section */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
        <h3 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
          Active Device Session
        </h3>
        <p className="text-xs text-gray-400">
          Terminate the current authenticated pairing session. You will need to scan a new QR code to reconnect.
        </p>

        <button
          onClick={onDisconnect}
          className="flex items-center space-x-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg transition-all"
        >
          <Unlink className="w-3.5 h-3.5" />
          <span>DISCONNECT CURRENT DEVICE</span>
        </button>
      </div>

    </div>
  );
};
