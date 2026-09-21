import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FileText, 
  ArrowLeft, 
  Plus, 
  FolderPlus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FileItem } from '../types';
import { api } from '../services/api';

export const FilesPage: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // File viewing / editing
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // File Upload to Android
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Modal states
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listFiles(path);
      setCurrentPath(res.path || path);
      setFiles(res.files || []);
    } catch (e: any) {
      setError(`Failed to read directory: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    await uploadFileList(Array.from(selected));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFileList = async (fileList: File[]) => {
    setIsUploading(true);
    setUploadMessage(`Uploading ${fileList.length} file(s) to Android...`);
    try {
      let uploaded = 0;
      for (const file of fileList) {
        const text = await readFileAsText(file);
        const targetPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        await api.writeFile(targetPath, text);
        uploaded++;
        setUploadMessage(`Uploaded (${uploaded}/${fileList.length}): ${file.name}`);
      }
      setUploadMessage(`✓ Successfully stored ${fileList.length} file(s) on Android storage!`);
      setTimeout(() => setUploadMessage(null), 4000);
      await loadDirectory(currentPath);
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
      setUploadMessage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (e) => reject(new Error('Failed to read file on desktop'));
      reader.readAsText(file);
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFileList(Array.from(e.dataTransfer.files));
    }
  };

  useEffect(() => {
    loadDirectory('/');
  }, []);

  const handleOpenItem = async (item: FileItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      try {
        setIsLoading(true);
        const res = await api.readFile(item.path);
        setSelectedFile(item);
        setFileContent(res.content);
      } catch (e: any) {
        setError(`Failed to open file: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await api.writeFile(selectedFile.path, fileContent);
      alert('File saved successfully!');
    } catch (e: any) {
      alert(`Save error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await api.deletePath(item.path);
      await loadDirectory(currentPath);
      if (selectedFile?.path === item.path) {
        setSelectedFile(null);
      }
    } catch (e: any) {
      alert(`Delete error: ${e.message}`);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      const target = currentPath === '/' ? `/${newFileName.trim()}` : `${currentPath}/${newFileName.trim()}`;
      await api.writeFile(target, '');
      setShowNewFileModal(false);
      setNewFileName('');
      await loadDirectory(currentPath);
    } catch (e: any) {
      alert(`Failed to create file: ${e.message}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const target = currentPath === '/' ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`;
      await api.createDirectory(target);
      setShowNewFolderModal(false);
      setNewFolderName('');
      await loadDirectory(currentPath);
    } catch (e: any) {
      alert(`Failed to create folder: ${e.message}`);
    }
  };

  const handleGoUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.length === 0 ? '/' : '/' + parts.join('/');
    loadDirectory(parent);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ms: number) => {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString() + ' ' + new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-8 space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Folder className="w-6 h-6 text-amber-400" />
            <span>File Explorer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Physical Android Sandbox Storage (/home, /apps, /server, /storage)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            title="Upload code or files from computer to current Android directory"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading...' : 'Upload to Phone'}</span>
          </button>

          <button
            onClick={() => setShowNewFileModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0e1422] hover:bg-[#141b2c] border border-white/[0.08] text-slate-200 text-xs font-medium rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New File</span>
          </button>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0e1422] hover:bg-[#141b2c] border border-white/[0.08] text-slate-200 text-xs font-medium rounded-xl transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-2 bg-[#0e1422] hover:bg-[#141b2c] border border-white/[0.08] text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Path Breadcrumbs Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e131d] border border-[#1a2333] rounded-xl text-xs font-mono">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleGoUp}
            disabled={currentPath === '/'}
            className="p-1 rounded hover:bg-[#182030] text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-500">Android Path:</span>
          <span className="text-emerald-400 font-bold">{currentPath}</span>
        </div>
        <div className="text-[11px] text-gray-500 hidden sm:block">
          Tip: Drag &amp; drop code files anywhere below to store on phone
        </div>
      </div>

      {/* Upload Status Banner */}
      {uploadMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Files Table with Drag and Drop Support */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-[#0e131d] border transition-all rounded-2xl overflow-hidden shadow-sm relative ${
          isDragging ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/10' : 'border-[#1a2333]'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-20 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-emerald-400 rounded-2xl">
            <Upload className="w-10 h-10 text-emerald-400 animate-bounce mb-2" />
            <p className="text-sm font-bold text-white">Drop code files to store into {currentPath}</p>
          </div>
        )}
        <table className="w-full text-left text-xs">
          <thead className="bg-[#121824] border-b border-[#1a2333] text-gray-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4 w-28">Size</th>
              <th className="py-3 px-4 w-44">Last Modified</th>
              <th className="py-3 px-4 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#161c28]">
            {files.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500 font-mono">
                  {isLoading ? 'Reading directory from Android...' : 'Directory is empty.'}
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr
                  key={file.path}
                  onClick={() => handleOpenItem(file)}
                  className="hover:bg-[#131926] cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 flex items-center space-x-3 text-gray-200 font-medium">
                    {file.isDirectory ? (
                      <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    )}
                    <span className="truncate group-hover:text-emerald-400 transition-colors">
                      {file.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 font-mono">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                    {formatDate(file.lastModified)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => handleDeleteItem(e, file)}
                      className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* In-browser File Editor Drawer / Modal */}
      {selectedFile && (
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-gray-100 font-mono">{selectedFile.path}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveFile}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'SAVING...' : 'SAVE'}</span>
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#1a2233]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-80 bg-[#080b12] border border-[#182030] rounded-xl p-4 font-mono text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-emerald-500/50 terminal-scroll"
            spellCheck={false}
          />
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f141f] border border-[#1e2738] rounded-xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="font-bold text-sm text-gray-100">Create New File</h4>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. script.sh, test.py"
              autoFocus
              className="w-full px-3 py-2 bg-[#141b29] border border-[#1e2738] rounded-lg text-xs text-gray-100 font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f141f] border border-[#1e2738] rounded-xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="font-bold text-sm text-gray-100">Create New Directory</h4>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. configs, mydata"
              autoFocus
              className="w-full px-3 py-2 bg-[#141b29] border border-[#1e2738] rounded-lg text-xs text-gray-100 font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
