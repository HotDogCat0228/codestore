'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Rocket, Upload, CloudUpload, CheckCircle, AlertCircle,
  Loader2, X, FileArchive, FolderOpen, Bookmark, BookmarkPlus, Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function DeployPage() {
  const [targetPath, setTargetPath] = useState('');
  const [file, setFile] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);

  // Saved directories (stored on server, shared across all devices)
  const [savedDirs, setSavedDirs] = useState([]);

  useEffect(() => {
    api.deployDirs.list()
      .then(dirs => setSavedDirs(Array.isArray(dirs) ? dirs : []))
      .catch(() => {});
  }, []);

  const addSavedDir = async () => {
    const dir = targetPath.trim();
    if (!dir) return;
    const updated = [dir, ...savedDirs.filter(d => d !== dir)];
    setSavedDirs(updated);
    try { await api.deployDirs.save(updated); } catch {}
  };

  const removeSavedDir = async (dir) => {
    const updated = savedDirs.filter(d => d !== dir);
    setSavedDirs(updated);
    try { await api.deployDirs.save(updated); } catch {}
  };

  const selectSavedDir = (dir) => {
    setTargetPath(dir);
  };

  const showStatus = useCallback((type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  }, []);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length > 0) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    dragCounter.current = 0;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length > 0) {
      const f = droppedFiles[0];
      if (!f.name.toLowerCase().endsWith('.zip')) {
        showStatus('error', '只接受 .zip 檔案');
        return;
      }
      setFile(f);
      setResult(null);
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeploy = async () => {
    if (!targetPath.trim()) {
      showStatus('error', '請輸入目標資料夾路徑');
      return;
    }
    if (!file) {
      showStatus('error', '請選擇 ZIP 檔案');
      return;
    }

    setDeploying(true);
    setResult(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetPath', targetPath.trim());
      const res = await api.deploy(formData);
      setResult(res);
      if (res.errors?.length > 0) {
        showStatus('error', `部署完成但有 ${res.errors.length} 個錯誤`);
      } else {
        showStatus('success', `成功部署 ${res.extracted?.length || 0} 個檔案`);
      }
    } catch (err) {
      showStatus('error', '部署失敗：' + err.message);
    } finally {
      setDeploying(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e]">
      {/* Top bar */}
      <div className="h-11 bg-[#323233] flex items-center px-4 gap-3 flex-shrink-0 border-b border-[#3c3c3c] select-none">
        <Link
          href="/"
          className="text-[#858585] hover:text-white transition-colors p-0.5 -ml-1"
          title="回專案列表"
        >
          <ArrowLeft size={17} />
        </Link>
        <Rocket size={17} className="text-[#0e639c]" />
        <span className="text-sm text-white font-medium tracking-wide">部署</span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status badge */}
        {status && (
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded ${
              status.type === 'success'
                ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                : 'bg-red-900/40 text-red-400 border border-red-700/50'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {status.message}
          </div>
        )}

        {/* Deploying indicator */}
        {deploying && (
          <div className="flex items-center gap-1.5 text-xs text-[#0e639c]">
            <Loader2 size={14} className="animate-spin" />
            部署中...
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Target directory input */}
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#cccccc] font-medium flex items-center gap-1.5">
                <FolderOpen size={14} className="text-[#dcb67a]" />
                目標資料夾
              </label>
              <button
                onClick={addSavedDir}
                disabled={!targetPath.trim()}
                className="flex items-center gap-1 text-xs text-[#858585] hover:text-[#dcb67a] disabled:text-[#3c3c3c] disabled:cursor-not-allowed transition-colors px-2 py-0.5 rounded hover:bg-[#3c3c3c]"
                title="儲存此目錄"
              >
                <BookmarkPlus size={12} />
                儲存目錄
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetPath}
                onChange={e => setTargetPath(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) addSavedDir();
                }}
                placeholder="例如：ELS/project-name 或相對路徑"
                className="flex-1 bg-[#3c3c3c] border border-[#555] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0e639c] placeholder:text-[#555]"
                disabled={deploying}
              />
            </div>
            <p className="text-[#555] text-xs mt-2">
              輸入相對於 DEPLOY_BASE_PATH 的資料夾路徑，Ctrl+Enter 快速儲存。
            </p>

            {/* Saved directories */}
            {savedDirs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#3c3c3c]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Bookmark size={12} className="text-[#dcb67a]" />
                  <span className="text-xs text-[#858585]">已儲存目錄</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {savedDirs.map((dir) => (
                    <div
                      key={dir}
                      className={`group flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                        targetPath === dir
                          ? 'bg-[#0e639c]/30 text-white border border-[#0e639c]'
                          : 'bg-[#2d2d2d] text-[#cccccc] border border-[#3c3c3c] hover:border-[#555]'
                      }`}
                    >
                      <button
                        onClick={() => selectSavedDir(dir)}
                        className="flex items-center gap-1 max-w-[220px] truncate"
                        title={dir}
                      >
                        <FolderOpen size={11} className="text-[#dcb67a] flex-shrink-0" />
                        <span className="truncate">{dir}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSavedDir(dir); }}
                        className="text-[#555] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-0.5"
                        title="移除"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ZIP drop zone */}
          <div
            className={`bg-[#252526] border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-[#0e639c] bg-[#1a3a4e]'
                : file
                  ? 'border-[#3c3c3c]'
                  : 'border-[#424242] hover:border-[#555]'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {file ? (
              /* File selected */
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileArchive size={32} className="text-[#dcb67a]" />
                  <div className="text-left">
                    <p className="text-white text-sm font-medium truncate max-w-[300px]">
                      {file.name}
                    </p>
                    <p className="text-[#858585] text-xs">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  disabled={deploying}
                  className="text-[#858585] hover:text-red-400 transition-colors p-1 disabled:opacity-30"
                  title="移除檔案"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              /* Empty state */
              <div className="space-y-2">
                <CloudUpload size={40} className="mx-auto text-[#555]" />
                <p className="text-[#858585] text-sm">拖拉 ZIP 檔案到這裡，或點擊選擇</p>
                <p className="text-[#424242] text-xs">僅接受 .zip 格式，最大 100MB</p>
                <label
                  className={`inline-block mt-3 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-[#cccccc] px-4 py-2 rounded text-sm cursor-pointer transition-colors border border-[#555] ${
                    deploying ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload size={14} className="inline mr-1.5 -mt-0.5" />
                  選擇 ZIP 檔案
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={deploying}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Deploy button */}
          <button
            onClick={handleDeploy}
            disabled={deploying || !file || !targetPath.trim()}
            className="flex items-center justify-center gap-2 w-full bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#2d5a7a] disabled:text-[#666] text-white px-6 py-3 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            {deploying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                部署中...
              </>
            ) : (
              <>
                <Rocket size={16} />
                部署
              </>
            )}
          </button>

          {/* Results panel */}
          {result && (
            <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
              <h3 className="text-sm text-white font-medium mb-3">部署結果</h3>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-green-400 text-sm">
                  <CheckCircle size={14} />
                  成功 {result.extracted?.length || 0} 個檔案
                </div>
                {result.errors?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    失敗 {result.errors.length} 個
                  </div>
                )}
              </div>

              {/* Extracted file list */}
              {result.extracted?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-[#858585] text-xs cursor-pointer hover:text-[#cccccc]">
                    已解壓縮檔案（{result.extracted.length}）
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto bg-[#1e1e1e] rounded p-2 text-xs font-mono">
                    {result.extracted.map((p, i) => (
                      <div key={i} className="text-[#6a9955] py-0.5">{p}</div>
                    ))}
                  </div>
                </details>
              )}

              {/* Error list */}
              {result.errors?.length > 0 && (
                <details className="mt-2" open>
                  <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
                    錯誤詳情（{result.errors.length}）
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto bg-[#1e1e1e] rounded p-2 text-xs">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-red-400 py-0.5">
                        <span className="text-[#858585]">{e.name}</span>
                        {' — '}
                        <span>{e.error}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
