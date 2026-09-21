import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Play, 
  Square, 
  Copy, 
  Check, 
  ExternalLink, 
  Code2, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Plus, 
  Radio, 
  RefreshCw,
  ArrowUpRight,
  Upload,
  FileCode,
  FolderUp,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';
import { HostedWebsite } from '../types';
import { api } from '../services/api';

interface UploadedFileItem {
  name: string;
  size: number;
  content: string;
}

const TEMPLATES = [
  {
    id: 'modern-landing',
    name: 'Futuristic SaaS Landing Page',
    description: 'Glassmorphism dark theme with hero section, live stats, and reactive components.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PocketVPS • Cloud Node</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #080b11;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 40px;
      border-bottom: 1px solid #1a2333;
      background: rgba(14, 19, 29, 0.8);
      backdrop-filter: blur(10px);
    }
    .logo { font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; }
    .nav-links { display: flex; gap: 24px; font-size: 14px; }
    .nav-links a { color: #94a3b8; text-decoration: none; transition: 0.2s; }
    .nav-links a:hover { color: #fff; }
    .hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 20px;
      background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 52px;
      font-weight: 900;
      letter-spacing: -1.5px;
      max-width: 700px;
      line-height: 1.15;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 18px;
      color: #94a3b8;
      max-width: 540px;
      line-height: 1.6;
      margin-bottom: 36px;
    }
    .cta-group { display: flex; gap: 16px; }
    .btn {
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .btn-primary {
      background: #10b981;
      color: #061c14;
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
    }
    .btn-primary:hover { background: #059669; transform: translateY(-2px); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
    .stats-card {
      margin-top: 60px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      padding: 24px 40px;
      border-radius: 20px;
      background: rgba(14, 19, 29, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
    }
    .stat-val { font-size: 28px; font-weight: 800; color: #38bdf8; font-family: monospace; }
    .stat-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
  </style>
</head>
<body>
  <header>
    <div class="logo">⚡ POCKET-VPS</div>
    <div class="nav-links">
      <a href="#features">Architecture</a>
      <a href="#node">ARM64 Core</a>
      <a href="#vpn">VPN Tunnel</a>
    </div>
  </header>
  <main class="hero">
    <div class="badge">● HOSTED ON MOBILE LINUX USERSPACE</div>
    <h1>Run Distributed Web Services on Mobile Hardware</h1>
    <p>This website is served natively by your Android phone over the local network using non-root userspace runtime.</p>
    <div class="cta-group">
      <a href="#" class="btn btn-primary">Live Server Dashboard</a>
      <a href="#" class="btn btn-secondary">Inspect Headers</a>
    </div>
    <div class="stats-card">
      <div><div class="stat-val">200 OK</div><div class="stat-lbl">HTTP Status</div></div>
      <div><div class="stat-val">0.4ms</div><div class="stat-lbl">Internal Latency</div></div>
      <div><div class="stat-val">Active</div><div class="stat-lbl">ARM Userspace</div></div>
    </div>
  </main>
</body>
</html>`
  },
  {
    id: 'portfolio',
    name: 'Developer Portfolio & Terminal',
    description: 'Personal portfolio with project showcase, interactive terminal snippet, and contact form.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Developer Portfolio • PocketVPS</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0e17; color: #e2e8f0; padding: 40px 20px; display: flex; justify-content: center; }
    .wrap { max-width: 650px; width: 100%; }
    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
    .avatar { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #6366f1); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #fff; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    .sub { color: #10b981; font-weight: 600; font-size: 14px; }
    .term { background: #030712; border: 1px solid #1f293d; border-radius: 14px; padding: 20px; font-family: monospace; font-size: 13px; line-height: 1.6; margin-bottom: 24px; color: #a5b4fc; }
    .term span { color: #34d399; }
    .card { background: #111827; border: 1px solid #1f293d; border-radius: 14px; padding: 20px; margin-bottom: 16px; }
    .card h3 { margin: 0 0 8px; font-size: 16px; color: #f8fafc; }
    .card p { margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="avatar">OS</div>
      <div>
        <h1>ALT-OS Developer Node</h1>
        <div class="sub">Self-Hosted Mobile Workstation</div>
      </div>
    </div>
    <div class="term">
      <div><span>$</span> pocketvps status --verbose</div>
      <div>&gt; Device: Android Mobile Node</div>
      <div>&gt; Runtime: Linux userspace daemon</div>
      <div>&gt; Host: Active on port 8080 (200 OK)</div>
    </div>
    <div class="card">
      <h3>🚀 Project ALT-OS</h3>
      <p>Turning consumer mobile hardware into distributed compute clusters and private web nodes.</p>
    </div>
    <div class="card">
      <h3>🔒 WireGuard Tunnel Engine</h3>
      <p>High-speed encrypted mesh overlay running securely inside non-root user sandboxes.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'api-status',
    name: 'Cloud API & Microservice Status Page',
    description: 'System health dashboard with live uptime metrics, latency graphs, and endpoint inspect.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PocketVPS • Systems Status</title>
  <style>
    body { margin: 0; font-family: -apple-system, sans-serif; background: #030712; color: #f9fafb; padding: 40px 20px; display: flex; justify-content: center; }
    .box { max-width: 600px; width: 100%; }
    .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; padding-bottom: 20px; margin-bottom: 30px; }
    .badge { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
    .service { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #111827; border: 1px solid #1f2937; border-radius: 12px; margin-bottom: 12px; font-size: 14px; }
    .name { font-weight: 600; }
    .status { color: #10b981; font-weight: 700; font-family: monospace; }
  </style>
</head>
<body>
  <div class="box">
    <div class="top">
      <h2>PocketVPS Status</h2>
      <div class="badge">● ALL SYSTEMS OPERATIONAL</div>
    </div>
    <div class="service"><span class="name">Web Hosting Gateway (Port 8080)</span><span class="status">100% Operational</span></div>
    <div class="service"><span class="name">SOCKS5 Proxy Tunnel (Port 1080)</span><span class="status">Connected</span></div>
    <div class="service"><span class="name">Interactive Shell WebSocket</span><span class="status">Active</span></div>
  </div>
</body>
</html>`
  }
];

export const WebsitesPage: React.FC = () => {
  const [websites, setWebsites] = useState<HostedWebsite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('default-site');
  const [activeViewMode, setActiveViewMode] = useState<'preview' | 'editor'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [siteHtml, setSiteHtml] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  // Deploy / Upload Modal States
  const [isDeployingModal, setIsDeployingModal] = useState<boolean>(false);
  const [deployTab, setDeployTab] = useState<'upload' | 'template'>('upload');
  const [newSiteName, setNewSiteName] = useState<string>('My Custom Project');
  const [newSitePort, setNewSitePort] = useState<number>(8082);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern-landing');
  
  // Uploaded Files State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchWebsites = async () => {
    try {
      const res = await api.getWebsites();
      setWebsites(res.websites || []);
      if (!selectedSiteId && res.websites && res.websites.length > 0) {
        setSelectedSiteId(res.websites[0].id);
      }
    } catch (e) {}
  };

  const fetchSiteFile = async (siteId: string) => {
    try {
      const res = await api.getWebsiteFile(siteId, 'index.html');
      setSiteHtml(res.content || res.html || '');
    } catch (e) {}
  };

  useEffect(() => {
    fetchWebsites();
    const interval = setInterval(fetchWebsites, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      fetchSiteFile(selectedSiteId);
    }
  }, [selectedSiteId]);

  const activeSite = websites.find(w => w.id === selectedSiteId) || websites[0];

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleStartSite = async (site: HostedWebsite) => {
    try {
      await api.startWebsite(site.id, site.port);
      await fetchWebsites();
      setIframeKey(prev => prev + 1);
    } catch (e: any) {
      alert(`Failed to start: ${e.message}`);
    }
  };

  const handleStopSite = async (site: HostedWebsite) => {
    try {
      await api.stopWebsite(site.id);
      await fetchWebsites();
      setIframeKey(prev => prev + 1);
    } catch (e: any) {
      alert(`Failed to stop: ${e.message}`);
    }
  };

  const handleSaveHtml = async () => {
    if (!activeSite) return;
    setIsSaving(true);
    try {
      await api.saveWebsiteFile(activeSite.id, 'index.html', siteHtml);
      setSaveMessage('✓ Code stored on phone & hosted live!');
      setTimeout(() => setSaveMessage(null), 3000);
      setIframeKey(prev => prev + 1);
    } catch (e: any) {
      alert(`Failed to save: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle files selected from local desktop disk
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const items: UploadedFileItem[] = [];
    let readCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (event) => {
        const text = event.target?.result as string;
        items.push({
          name: file.name,
          size: file.size,
          content: text || ''
        });
        readCount++;
        if (readCount === files.length) {
          setUploadedFiles(items);
          if (items.some(f => f.name.toLowerCase() === 'index.html')) {
            setUploadStatus(`Loaded ${items.length} files (Entrypoint index.html found)`);
          } else {
            setUploadStatus(`Loaded ${items.length} files`);
          }
        }
      };

      reader.readAsText(file);
    }
  };

  // Upload local code file directly into active editor
  const handleImportSingleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSiteHtml(content || '');
      setSaveMessage(`Loaded local file "${file.name}". Click SAVE & HOST to push to phone.`);
    };
    reader.readAsText(file);
  };

  // Upload project files to phone and host on requested port
  const handleUploadAndHost = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please select files from your computer first.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading code files to Android storage...');

    try {
      const siteId = 'site-' + Date.now().toString(36);
      
      // Ensure there is an index.html
      let filesToDeploy = [...uploadedFiles];
      if (!filesToDeploy.some(f => f.name.toLowerCase() === 'index.html')) {
        const firstHtml = filesToDeploy.find(f => f.name.endsWith('.html'));
        if (firstHtml) {
          filesToDeploy.push({
            name: 'index.html',
            size: firstHtml.size,
            content: firstHtml.content
          });
        } else {
          filesToDeploy.push({
            name: 'index.html',
            size: 100,
            content: `<!DOCTYPE html><html><body><h1>${newSiteName}</h1><p>Files uploaded to Android storage:</p><ul>${filesToDeploy.map(f => `<li>${f.name}</li>`).join('')}</ul></body></html>`
          });
        }
      }

      // Send to Android phone
      const res = await api.uploadWebsiteProject({
        id: siteId,
        name: newSiteName,
        port: Number(newSitePort),
        start: true,
        files: filesToDeploy.map(f => ({ name: f.name, content: f.content }))
      });

      setUploadStatus(`✓ Successfully uploaded ${filesToDeploy.length} files! Hosted on port ${newSitePort}`);
      
      setTimeout(async () => {
        setIsDeployingModal(false);
        setUploadedFiles([]);
        setSelectedSiteId(siteId);
        await fetchWebsites();
        setIframeKey(prev => prev + 1);
        setIsUploading(false);
      }, 1000);

    } catch (e: any) {
      alert(`Upload failed: ${e.message}`);
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  // Deploy from template
  const handleCreateFromTemplate = async () => {
    const siteId = 'site-' + Date.now().toString(36);
    const tmpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];
    try {
      await api.deployWebsite(siteId, newSiteName, tmpl.html, Number(newSitePort));
      await api.startWebsite(siteId, Number(newSitePort));
      setIsDeployingModal(false);
      setSelectedSiteId(siteId);
      await fetchWebsites();
      setIframeKey(prev => prev + 1);
    } catch (e: any) {
      alert(`Deployment failed: ${e.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-100">Website Hosting Studio</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
              Android Web Server
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Upload code from desktop to Android phone storage &amp; host live websites directly on mobile hardware
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setDeployTab('upload');
              setIsDeployingModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Upload className="w-4 h-4" />
            <span>UPLOAD CODE &amp; HOST</span>
          </button>

          <button
            onClick={() => {
              setDeployTab('template');
              setIsDeployingModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#090d16] text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>NEW FROM TEMPLATE</span>
          </button>
        </div>
      </div>

      {/* Active Websites Selector & Host URL Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {websites.map((site) => {
          const isSelected = site.id === selectedSiteId;
          return (
            <div
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected 
                  ? 'bg-[#101726] border-emerald-500/40 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20' 
                  : 'bg-[#0e131d] border-[#1a2333] hover:border-[#27354d]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${
                    site.isRunning 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-100">{site.name}</h4>
                    <p className="text-[11px] text-gray-400 font-mono">Port {site.port}</p>
                  </div>
                </div>

                <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  site.isRunning 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-rose-500/10 text-rose-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${site.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  <span>{site.isRunning ? 'Live on Phone' : 'Stopped'}</span>
                </span>
              </div>

              {/* Host URL Display */}
              <div className="mt-4 pt-3 border-t border-[#182030] flex items-center justify-between text-xs font-mono">
                <div className="truncate text-emerald-400 font-semibold">{site.hostUrl}</div>
                <div className="flex items-center space-x-1 text-gray-400">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>{site.requestsCount || 0} reqs</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Studio Workspace: Live Host URL, Controls, In-App Preview Frame / Code Editor */}
      {activeSite && (
        <div className="rounded-2xl bg-[#0e131d] border border-[#1a2333] overflow-hidden shadow-xl">
          {/* Studio Control Header */}
          <div className="px-6 py-4 border-b border-[#182030] flex flex-wrap items-center justify-between gap-4 bg-[#0a0e17]">
            {/* Host URL Link Box */}
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 rounded-lg bg-[#141b29] border border-[#1e2738] flex items-center space-x-2.5">
                <Radio className={`w-3.5 h-3.5 ${activeSite.isRunning ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                <span className="text-xs text-gray-400 font-mono">HOST URL:</span>
                <a
                  href={activeSite.hostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 font-mono hover:underline flex items-center space-x-1"
                >
                  <span>{activeSite.hostUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <button
                onClick={() => handleCopyUrl(activeSite.hostUrl)}
                title="Copy Host URL"
                className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1a2336] text-gray-400 hover:text-gray-200 border border-[#1e2738] text-xs flex items-center space-x-1"
              >
                {copiedUrl === activeSite.hostUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-mono">{copiedUrl === activeSite.hostUrl ? 'COPIED' : 'COPY'}</span>
              </button>

              <a
                href={activeSite.hostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <span>OPEN IN BROWSER TAB</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Viewport Toggles & State Actions */}
            <div className="flex items-center space-x-2.5">
              {/* Preview vs Code Editor Toggle */}
              <div className="bg-[#141b29] p-0.5 rounded-lg border border-[#1e2738] flex items-center">
                <button
                  onClick={() => setActiveViewMode('preview')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    activeViewMode === 'preview'
                      ? 'bg-emerald-500 text-black shadow-sm font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>PREVIEW</span>
                </button>
                <button
                  onClick={() => setActiveViewMode('editor')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    activeViewMode === 'editor'
                      ? 'bg-emerald-500 text-black shadow-sm font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>CODE &amp; UPLOAD</span>
                </button>
              </div>

              {/* Start / Stop Toggle Button */}
              {activeSite.isRunning ? (
                <button
                  onClick={() => handleStopSite(activeSite)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Square className="w-3 h-3 fill-rose-400" />
                  <span>STOP HOSTING</span>
                </button>
              ) : (
                <button
                  onClick={() => handleStartSite(activeSite)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Play className="w-3 h-3 fill-black" />
                  <span>HOST ON ANDROID</span>
                </button>
              )}
            </div>
          </div>

          {/* Body: Preview Frame vs Live Code Editor */}
          {activeViewMode === 'preview' ? (
            <div className="p-6 flex flex-col items-center bg-[#070a10]">
              {/* Responsive Device Viewport Switcher */}
              <div className="mb-4 flex items-center space-x-2 bg-[#101522] px-2 py-1 rounded-xl border border-[#1b2436]">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-all flex items-center space-x-1 text-xs ${
                    previewDevice === 'desktop' ? 'bg-[#1b2436] text-emerald-400 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Desktop (100% Viewport)"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg transition-all flex items-center space-x-1 text-xs ${
                    previewDevice === 'tablet' ? 'bg-[#1b2436] text-emerald-400 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Tablet (768px Viewport)"
                >
                  <Tablet className="w-4 h-4" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-all flex items-center space-x-1 text-xs ${
                    previewDevice === 'mobile' ? 'bg-[#1b2436] text-emerald-400 font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Mobile (375px Viewport)"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              {/* In-App Browser Simulation Frame */}
              <div 
                className={`transition-all duration-300 rounded-2xl overflow-hidden border border-[#1b2436] shadow-2xl bg-white ${
                  previewDevice === 'desktop' ? 'w-full h-[600px]' : previewDevice === 'tablet' ? 'w-[768px] h-[650px]' : 'w-[375px] h-[650px]'
                }`}
              >
                {/* Browser Mock Navigation Bar */}
                <div className="h-9 bg-[#1a2130] border-b border-[#252f45] px-4 flex items-center space-x-3 select-none">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <div className="flex-1 px-3 py-1 bg-[#0f141f] rounded-md text-[11px] text-gray-300 font-mono truncate border border-[#252f45]/50 flex items-center justify-between">
                    <span className="truncate">{activeSite.hostUrl}</span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold ml-2">Android Host</span>
                  </div>
                  <button 
                    onClick={() => setIframeKey(k => k + 1)}
                    className="text-gray-400 hover:text-gray-200 p-1"
                    title="Reload Preview Frame"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Actual Embedded Browser Frame */}
                {activeSite.isRunning ? (
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src={activeSite.hostUrl}
                    title="Website Preview"
                    className="w-full h-[calc(100%-36px)] border-0 bg-white"
                  />
                ) : (
                  <div className="w-full h-[calc(100%-36px)] bg-[#0c1017] flex flex-col items-center justify-center text-center p-6 space-y-4 text-gray-400">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <Radio className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-200">Server Offline on Android</h4>
                      <p className="text-xs text-gray-500 max-w-sm mt-1">
                        Click "HOST ON ANDROID" above to bind port {activeSite.port} and serve this website live.
                      </p>
                    </div>
                    <button
                      onClick={() => handleStartSite(activeSite)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20"
                    >
                      START SERVER NOW
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Code Editor with Local File Import */
            <div className="p-6 space-y-4 bg-[#0a0e17]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#182030]">
                <div>
                  <h4 className="font-bold text-sm text-gray-200 flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>Android File: /apps/web/{activeSite.id}/index.html</span>
                  </h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Code is stored directly on your Android phone's storage partition
                  </p>
                </div>

                <div className="flex items-center space-x-2.5">
                  {saveMessage && (
                    <span className="text-xs text-emerald-400 font-mono font-bold animate-in fade-in">{saveMessage}</span>
                  )}

                  {/* Hidden file input for importing local files */}
                  <input
                    type="file"
                    ref={singleFileRef}
                    onChange={handleImportSingleFile}
                    accept=".html,.htm,.js,.css,.json,.txt"
                    className="hidden"
                  />

                  <button
                    onClick={() => singleFileRef.current?.click()}
                    className="px-3 py-1.5 bg-[#141b29] hover:bg-[#1c2638] text-gray-300 hover:text-white border border-[#1e2738] font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>IMPORT LOCAL FILE</span>
                  </button>

                  <button
                    onClick={handleSaveHtml}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <span>{isSaving ? 'SAVING TO PHONE...' : 'SAVE & HOST ON PHONE'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={siteHtml}
                onChange={(e) => setSiteHtml(e.target.value)}
                className="w-full h-96 p-4 rounded-xl bg-[#060911] border border-[#182030] text-gray-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500/50 resize-y"
                spellCheck="false"
              />
            </div>
          )}
        </div>
      )}

      {/* Deploy / Upload Modal */}
      {isDeployingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0f141f] border border-[#1e2738] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#182030]">
              <div>
                <h3 className="text-lg font-bold text-gray-100">Host Website on Android</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Upload custom code files or choose a pre-built template
                </p>
              </div>
              <button 
                onClick={() => setIsDeployingModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex space-x-2 border-b border-[#182030] pb-2">
              <button
                onClick={() => setDeployTab('upload')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  deployTab === 'upload' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'text-gray-400 hover:text-gray-200 bg-[#121824]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD CODE FROM COMPUTER</span>
              </button>
              <button
                onClick={() => setDeployTab('template')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  deployTab === 'template' 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                    : 'text-gray-400 hover:text-gray-200 bg-[#121824]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>TEMPLATES</span>
              </button>
            </div>

            {/* Common Settings (Name and Port) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Website Name</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d16] border border-[#1e2738] rounded-xl text-xs text-gray-100 font-medium focus:outline-none focus:border-indigo-500/50"
                  placeholder="e.g. My Web App"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Android Port</label>
                <input
                  type="number"
                  value={newSitePort}
                  onChange={(e) => setNewSitePort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0a0d16] border border-[#1e2738] rounded-xl text-xs text-gray-100 font-mono font-bold focus:outline-none focus:border-indigo-500/50"
                  placeholder="8082"
                />
              </div>
            </div>

            {/* Tab 1: Upload Code Files from Computer */}
            {deployTab === 'upload' && (
              <div className="space-y-4">
                {/* Hidden Multi-file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFilesSelected}
                  multiple
                  className="hidden"
                />

                {/* Drop / Select Zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-[#1e2738] hover:border-indigo-500/50 rounded-2xl bg-[#090d16] cursor-pointer flex flex-col items-center justify-center text-center space-y-2.5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-all">
                    <FolderUp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-200">
                      Click to Select Code Files from Computer
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select HTML, CSS, JavaScript, JSON, SVGs, or any assets
                    </p>
                  </div>
                </div>

                {/* Selected Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="p-3 bg-[#0a0e17] rounded-xl border border-[#182030] space-y-2 max-h-40 overflow-y-auto">
                    <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 border-b border-[#182030] pb-1.5">
                      <span>{uploadedFiles.length} files selected:</span>
                      <button 
                        onClick={() => setUploadedFiles([])}
                        className="text-rose-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-mono text-gray-300 truncate max-w-[280px]">
                          {f.name.toLowerCase() === 'index.html' && '🌟 '}
                          {f.name}
                        </span>
                        <span className="font-mono text-gray-500 text-[10px]">{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {uploadStatus && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-mono flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{uploadStatus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Pre-built Templates */}
            {deployTab === 'template' && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTemplate === tmpl.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#090d16] border-[#182030] text-gray-400 hover:border-[#243047]'
                    }`}
                  >
                    <div className="font-bold text-xs text-gray-100">{tmpl.name}</div>
                    <p className="text-[11px] text-gray-500 mt-1">{tmpl.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#182030]">
              <button
                onClick={() => setIsDeployingModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-200"
              >
                CANCEL
              </button>

              {deployTab === 'upload' ? (
                <button
                  onClick={handleUploadAndHost}
                  disabled={isUploading || uploadedFiles.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'TRANSFERRING TO ANDROID...' : 'UPLOAD & HOST ON ANDROID'}</span>
                </button>
              ) : (
                <button
                  onClick={handleCreateFromTemplate}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  DEPLOY &amp; HOST
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
