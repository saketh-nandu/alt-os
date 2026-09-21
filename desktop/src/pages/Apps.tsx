import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Download, 
  FileCode2, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Code
} from 'lucide-react';
import { FastApiStatus } from '../types';
import { api } from '../services/api';

interface AppsPageProps {
  serverOnline?: boolean;
}

export const AppsPage: React.FC<AppsPageProps> = () => {
  const [fastApiStatus, setFastApiStatus] = useState<FastApiStatus>({
    running: false,
    port: 8000,
    pid: -1,
    appPath: '/apps/demo-api',
    endpoint: '/api/status'
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Live API Tester State
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<{
    status: number;
    statusText: string;
    responseTimeMs: number;
    data: any;
    url: string;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const status = await api.getFastApiStatus();
      setFastApiStatus(status);
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await api.installFastApi();
      setActionMessage({ text: res.message || 'FastAPI dependencies installed in /apps/demo-api' });
      await fetchStatus();
    } catch (e: any) {
      setActionMessage({ text: `Install failed: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApp = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await api.createFastApiApp();
      setActionMessage({ text: res.message || 'Created /apps/demo-api/main.py and requirements.txt' });
      await fetchStatus();
    } catch (e: any) {
      setActionMessage({ text: `Create failed: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await api.startFastApi();
      setFastApiStatus(res);
      setActionMessage({ text: `FastAPI started on port 8000 (PID: ${res.pid})` });
    } catch (e: any) {
      setActionMessage({ text: `Start failed: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await api.stopFastApi();
      setActionMessage({ text: res.message || 'FastAPI service stopped' });
      await fetchStatus();
    } catch (e: any) {
      setActionMessage({ text: `Stop failed: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiError(null);
    setApiResponse(null);

    try {
      const result = await api.testFastApiEndpoint();
      setApiResponse(result);
    } catch (e: any) {
      setApiError(`HTTP Request Failed: ${e.message}. If testing on local network, ensure the phone port 8000 is accessible.`);
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100">Application Management</h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          Native Services &amp; Python ASGI Applications
        </p>
      </div>

      {/* FastAPI Service Management Card */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-xl font-bold text-gray-100">FastAPI Service</h3>
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  fastApiStatus.running 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${fastApiStatus.running ? 'bg-emerald-400 pulse-emerald' : 'bg-rose-400'}`}></span>
                  <span>{fastApiStatus.running ? 'RUNNING' : 'STOPPED'}</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                Port: <span className="text-emerald-400 font-bold">8000</span> • PID: <span className="text-indigo-400 font-bold">{fastApiStatus.running && fastApiStatus.pid > 0 ? fastApiStatus.pid : '—'}</span> • Dir: <span className="text-gray-300">/apps/demo-api</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStatus}
              title="Refresh status"
              className="p-2 rounded-lg bg-[#141b29] hover:bg-[#1a2436] text-gray-400 border border-[#1f283d] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step-by-Step Action Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <button
            onClick={handleInstall}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-3 bg-[#131926] hover:bg-[#182133] border border-[#1e2738] rounded-xl text-xs font-semibold text-gray-200 transition-all space-y-1 group"
          >
            <Download className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
            <span>1. INSTALL</span>
            <span className="text-[10px] text-gray-500 font-normal">dependencies</span>
          </button>

          <button
            onClick={handleCreateApp}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-3 bg-[#131926] hover:bg-[#182133] border border-[#1e2738] rounded-xl text-xs font-semibold text-gray-200 transition-all space-y-1 group"
          >
            <FileCode2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
            <span>2. CREATE APP</span>
            <span className="text-[10px] text-gray-500 font-normal">main.py</span>
          </button>

          <button
            onClick={handleStart}
            disabled={isLoading || fastApiStatus.running}
            className="flex flex-col items-center justify-center p-3 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 transition-all space-y-1"
          >
            <Play className="w-4 h-4 fill-emerald-400" />
            <span>3. START</span>
            <span className="text-[10px] text-emerald-500/70 font-normal">port 8000</span>
          </button>

          <button
            onClick={handleStop}
            disabled={isLoading || !fastApiStatus.running}
            className="flex flex-col items-center justify-center p-3 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 transition-all space-y-1"
          >
            <Square className="w-4 h-4 fill-rose-400" />
            <span>4. STOP</span>
            <span className="text-[10px] text-rose-500/70 font-normal">kill process</span>
          </button>
        </div>

        {actionMessage && (
          <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
            actionMessage.isError 
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {actionMessage.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* REAL API DEMO SECTION */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Real API Verification
            </span>
            <h3 className="text-lg font-bold text-gray-100 mt-0.5">
              Live FastAPI Endpoint Test (GET /api/status)
            </h3>
            <p className="text-xs text-gray-400">
              Desktop executes a real HTTP request directly to the FastAPI server process on the Android phone.
            </p>
          </div>

          <button
            onClick={handleTestApi}
            disabled={isTestingApi}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTestingApi ? 'REQUESTING...' : 'SEND HTTP REQUEST'}</span>
          </button>
        </div>

        {/* API Response Display */}
        {apiResponse && (
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#182030] space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182030] pb-2 text-xs">
              <div className="flex items-center space-x-3">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {apiResponse.status} {apiResponse.statusText}
                </span>
                <span className="text-gray-400 truncate max-w-xs">{apiResponse.url}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>Roundtrip:</span>
                <span className="text-emerald-400 font-bold">{apiResponse.responseTimeMs} ms</span>
              </div>
            </div>

            {/* JSON Output */}
            <div className="text-xs text-emerald-300 overflow-x-auto">
              <pre>{JSON.stringify(apiResponse.data, null, 2)}</pre>
            </div>
          </div>
        )}

        {apiError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Request Failed</p>
              <p className="mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {!apiResponse && !apiError && (
          <div className="p-8 rounded-xl bg-[#080b12] border border-[#182030] text-center text-xs text-gray-500 font-mono">
            Click &quot;SEND HTTP REQUEST&quot; above to trigger actual HTTP request to Android port 8000.
          </div>
        )}
      </div>

      {/* Code Preview Section */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <Code className="w-4 h-4 text-indigo-400" />
          <span>Deployed Code (/apps/demo-api/main.py)</span>
        </div>
        <div className="rounded-xl bg-[#050810] border border-[#141a29] p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
          <pre>{`from fastapi import FastAPI
import uvicorn
import os, platform, time

app = FastAPI(title="ALT-OS Demo API")

@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "device": "android",
        "runtime": "alt-os",
        "system": platform.system(),
        "machine": platform.machine(),
        "pid": os.getpid(),
        "timestamp": time.time()
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)`}</pre>
        </div>
      </div>
    </div>
  );
};
