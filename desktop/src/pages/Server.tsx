import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCw, Server as ServerIcon, Terminal, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface ServerProps {
  serverOnline: boolean;
  onRefreshMetrics: () => void;
}

export const ServerPage: React.FC<ServerProps> = ({
  serverOnline,
  onRefreshMetrics
}) => {
  const [logs, setLogs] = useState<string>('Loading logs from Android device...');
  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await api.getServerLogs();
      setLogs(res.logs || 'No server logs available yet.');
    } catch (e: any) {
      setLogs('Waiting for connection to phone to read logs...');
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setIsOperating(true);
    setActionMessage(null);
    try {
      const res = await api.startServer();
      setActionMessage(res.message || 'Server started successfully.');
      onRefreshMetrics();
      await fetchLogs();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleStop = async () => {
    setIsOperating(true);
    setActionMessage(null);
    try {
      const res = await api.stopServer();
      setActionMessage(res.message || 'Server stopped.');
      onRefreshMetrics();
      await fetchLogs();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleRestart = async () => {
    setIsOperating(true);
    setActionMessage(null);
    try {
      const res = await api.restartServer();
      setActionMessage(res.message || 'Server restarted.');
      onRefreshMetrics();
      await fetchLogs();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100">Server Management</h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          Linux Userspace Lifecycle &amp; Process Environment
        </p>
      </div>

      {/* Control Card */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#141b29] border border-[#1f283d] flex items-center justify-center text-emerald-400">
              <ServerIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-gray-100">my-server</h3>
                <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                  serverOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span>{serverOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Runtime: <span className="text-gray-300 font-mono">Linux userspace</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={handleStart}
              disabled={isOperating || serverOnline}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>START</span>
            </button>
            <button
              onClick={handleStop}
              disabled={isOperating || !serverOnline}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" />
              <span>STOP</span>
            </button>
            <button
              onClick={handleRestart}
              disabled={isOperating}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-[#161d2c] hover:bg-[#1e273b] disabled:opacity-40 border border-[#243047] text-gray-300 text-xs font-bold rounded-lg transition-all"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
              <span>RESTART</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* Live Server Logs Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-gray-500" />
            <span>Live Server Logs (/logs/server.log)</span>
          </span>
          <button
            onClick={fetchLogs}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="rounded-xl bg-[#080b12] border border-[#161c28] p-4 font-mono text-xs text-gray-300 h-80 overflow-y-auto terminal-scroll">
          <pre className="whitespace-pre-wrap leading-relaxed">{logs}</pre>
        </div>
      </div>

    </div>
  );
};
