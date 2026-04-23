'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, FolderPlus, RefreshCw,
  Code2, CloudUpload, CheckCircle, AlertCircle,
  Loader2, Download, Trash2, Copy, Check, FolderDown, FolderUp, CheckSquare, Square
} from 'lucide-react';
import { api } from '../../../lib/api';
import FileTree from '../../../components/FileTree';
import FilePreview, { isPreviewable } from '../../../components/FilePreview';

async function readAllEntries(reader) {
  const all = [];
  while (true) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

async function traverseEntry(entry, prefix = '') {
  const files = [];
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    files.push({ file, path: prefix + file.name });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllEntries(reader);
    for (const child of entries) {
      const sub = await traverseEntry(child, prefix + entry.name + '/');
      files.push(...sub);
    }
  }
  return files;
}

function flattenTree(nodes) {
  const result = [];
  for (const node of nodes) {
    result.push(node.path);
    if (node.type === 'directory' && node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [previewPath, setPreviewPath] = useState('');
  const [status, setStatus] = useState(null);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [copied, setCopied] = useState(false);
  const [multiSelected, setMultiSelected] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const dropRef = useRef(null);
  const dragCounter = useRef(0);
  const anchorRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [proj, tree] = await Promise.all([
        api.projects.get(id),
        api.files.list(id),
      ]);
      setProject(proj);
      setFiles(tree);
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('Not found')) {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3500);
  };

  const uploadFileItems = async (fileItems) => {
    if (!fileItems.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      fileItems.forEach(({ file, path }) => {
        formData.append('files', file);
        formData.append('paths', path);
      });
      const result = await api.files.upload(id, formData);
      showStatus('success', `成功上傳 ${result.uploaded.length} 個檔案${result.errors.length ? `，${result.errors.length} 個失敗` : ''}`);
      await loadData();
    } catch (err) {
      showStatus('error', '上傳失敗：' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const items = e.dataTransfer.items;
    if (!items) return;
    // Must collect all entries synchronously before any await,
    // because DataTransfer is invalidated after the event loop yields.
    const entries = Array.from(items)
      .filter(item => item.kind === 'file')
      .map(item => item.webkitGetAsEntry())
      .filter(Boolean);
    const fileItems = [];
    for (const entry of entries) {
      fileItems.push(...await traverseEntry(entry));
    }
    await uploadFileItems(fileItems);
  };

  const handleFileInput = async (e) => {
    const inputFiles = e.target.files;
    if (!inputFiles?.length) return;
    const fileItems = Array.from(inputFiles).map(f => ({
      file: f,
      path: f.webkitRelativePath || f.name,
    }));
    await uploadFileItems(fileItems);
    e.target.value = '';
  };

  const handleDownload = async (filePath, fileName) => {
    try {
      const blob = await api.files.download(id, filePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || filePath.split('/').pop();
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showStatus('error', '下載失敗：' + err.message);
    }
  };

  const handleMove = async (from, to) => {
    try {
      await api.files.move(id, from, to);
      if (selectedPath === from) setSelectedPath('');
      if (previewPath === from) setPreviewPath('');
      showStatus('success', `已移動：${from.split('/').pop()}`);
      await loadData();
    } catch (err) {
      showStatus('error', '移動失敗：' + err.message);
    }
  };

  const handleDelete = async (filePath, isDir) => {
    const label = isDir ? '資料夾' : '檔案';
    if (!confirm(`確定刪除${label}「${filePath}」？`)) return;
    try {
      await api.files.delete(id, filePath);
      if (selectedPath === filePath) setSelectedPath('');
      if (previewPath === filePath) setPreviewPath('');
      showStatus('success', `已刪除${label}`);
      await loadData();
    } catch (err) {
      showStatus('error', '刪除失敗：' + err.message);
    }
  };

  const saveToLocalFolder = async (filePath, fileName) => {
    if (!window.showDirectoryPicker) {
      alert('此功能需要 Chrome 或 Edge 瀏覽器（版本 86 以上）');
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const blob = await api.files.download(id, filePath);
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      showStatus('success', `已儲存至本機：${fileName}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showStatus('error', '儲存失敗：' + err.message);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolder.trim()) return;
    try {
      await api.files.mkdir(id, newFolder.trim());
      setNewFolder('');
      setShowNewFolder(false);
      await loadData();
    } catch (err) {
      showStatus('error', '建立失敗：' + err.message);
    }
  };

  const handleToggleSelect = (path) => {
    anchorRef.current = path;
    setMultiSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleShiftSelect = (path) => {
    const flat = flattenTree(files);
    const anchor = anchorRef.current;
    if (!anchor || !flat.includes(anchor)) {
      handleToggleSelect(path);
      return;
    }
    const a = flat.indexOf(anchor);
    const b = flat.indexOf(path);
    const [start, end] = a < b ? [a, b] : [b, a];
    const range = flat.slice(start, end + 1);
    setMultiSelected(prev => {
      const next = new Set(prev);
      range.forEach(p => next.add(p));
      return next;
    });
  };

  const handleMultiDownload = async () => {
    try {
      const blob = await api.files.downloadZip(id, [...multiSelected]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || id}-selection.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setMultiSelected(new Set());
      setSelectionMode(false);
    } catch (err) {
      showStatus('error', '下載失敗：' + err.message);
    }
  };

  const copyPath = () => {
    navigator.clipboard.writeText(selectedPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e]">
        <Loader2 size={24} className="animate-spin text-[#0e639c]" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      {/* Top bar */}
      <div className="h-11 bg-[#323233] border-b border-[#1e1e1e] flex items-center px-3 gap-2 flex-shrink-0">
        <Link href="/" className="text-[#858585] hover:text-white transition-colors p-1">
          <ArrowLeft size={16} />
        </Link>
        <Code2 size={16} className="text-[#0e639c]" />
        <span className="text-white font-medium text-sm">{project?.name || id}</span>
        {project?.description && (
          <span className="text-[#555] text-xs hidden sm:inline">{project.description}</span>
        )}
        <div className="flex-1" />

        {status && (
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
            status.type === 'success'
              ? 'bg-green-900/40 text-green-400'
              : 'bg-red-900/40 text-red-400'
          }`}>
            {status.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {status.message}
          </div>
        )}
        {uploading && (
          <div className="flex items-center gap-1.5 text-xs text-[#858585]">
            <Loader2 size={12} className="animate-spin" />
            上傳中...
          </div>
        )}
        <button
          onClick={loadData}
          className="text-[#858585] hover:text-white transition-colors p-1 rounded"
          title="重新整理"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 bg-[#252526] border-r border-[#1e1e1e] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 flex items-center justify-between border-b border-[#3c3c3c]">
            <span className="text-[#bbb] text-xs font-semibold uppercase tracking-wider">檔案總管</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  const next = !selectionMode;
                  setSelectionMode(next);
                  if (!next) setMultiSelected(new Set());
                }}
                className={`p-1 transition-colors rounded hover:bg-[#3c3c3c] ${selectionMode ? 'text-[#0e639c]' : 'text-[#858585] hover:text-white'}`}
                title={selectionMode ? '退出多選模式' : '多選模式'}
              >
                {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
              <button
                onClick={() => setShowNewFolder(v => !v)}
                className="p-1 text-[#858585] hover:text-white transition-colors rounded hover:bg-[#3c3c3c]"
                title="新增資料夾"
              >
                <FolderPlus size={14} />
              </button>
              <label
                className="p-1 text-[#858585] hover:text-white transition-colors rounded hover:bg-[#3c3c3c] cursor-pointer"
                title="上傳檔案"
              >
                <Upload size={14} />
                <input type="file" multiple className="hidden" onChange={handleFileInput} />
              </label>
              <label
                className="p-1 text-[#858585] hover:text-white transition-colors rounded hover:bg-[#3c3c3c] cursor-pointer"
                title="上傳資料夾"
              >
                <FolderUp size={14} />
                <input type="file" webkitdirectory="" className="hidden" onChange={handleFileInput} />
              </label>
            </div>
          </div>

          {selectionMode && (
            <div className="px-2 py-1.5 border-b border-[#3c3c3c] flex items-center gap-1.5 bg-[#1e1e1e]/60">
              <span className="text-xs text-[#858585] flex-1">
                {multiSelected.size > 0 ? `已選 ${multiSelected.size} 個` : '點選項目以選取'}
              </span>
              {multiSelected.size > 0 && (
                <button
                  onClick={handleMultiDownload}
                  className="flex items-center gap-1 text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white px-2 py-1 rounded transition-colors"
                >
                  <Download size={11} />
                  ZIP
                </button>
              )}
              <button
                onClick={() => { setMultiSelected(new Set()); setSelectionMode(false); }}
                className="text-xs text-[#555] hover:text-[#858585] transition-colors"
              >
                清除
              </button>
            </div>
          )}

          {showNewFolder && (
            <div className="px-2 py-1.5 border-b border-[#3c3c3c] flex gap-1">
              <input
                type="text"
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolder(''); }
                }}
                className="flex-1 bg-[#3c3c3c] text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0e639c]"
                placeholder="資料夾名稱"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="text-[#0e639c] hover:text-white text-xs px-1 transition-colors"
              >
                確認
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <FileTree
              files={files}
              projectId={id}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={setPreviewPath}
              onMove={handleMove}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              multiSelected={multiSelected}
              onToggleSelect={handleToggleSelect}
              onShiftSelect={handleShiftSelect}
              onMultiDownload={handleMultiDownload}
              selectionMode={selectionMode}
              onClearSelection={() => { setMultiSelected(new Set()); setSelectionMode(false); }}
            />
          </div>

          {/* Upload button bottom */}
          <div className="p-2 border-t border-[#3c3c3c] flex gap-1.5">
            <label className="flex items-center justify-center gap-1.5 flex-1 py-1.5 text-xs text-[#858585] hover:text-white border border-[#3c3c3c] hover:border-[#555] rounded cursor-pointer transition-colors">
              <Upload size={12} />
              上傳檔案
              <input type="file" multiple className="hidden" onChange={handleFileInput} />
            </label>
            <label className="flex items-center justify-center gap-1.5 flex-1 py-1.5 text-xs text-[#858585] hover:text-white border border-[#3c3c3c] hover:border-[#555] rounded cursor-pointer transition-colors">
              <FolderUp size={12} />
              上傳資料夾
              <input type="file" webkitdirectory="" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
        </div>

        {/* Main area */}
        <div
          ref={dropRef}
          className={`flex-1 relative flex flex-col transition-colors ${dragOver ? 'bg-[#0e639c]/10' : 'bg-[#1e1e1e]'}`}
          onDragEnter={e => {
            e.preventDefault();
            if (e.dataTransfer.types.includes('application/x-codestore-internal')) return;
            dragCounter.current++;
            setDragOver(true);
          }}
          onDragOver={e => e.preventDefault()}
          onDragLeave={e => {
            e.preventDefault();
            dragCounter.current--;
            if (dragCounter.current <= 0) {
              dragCounter.current = 0;
              setDragOver(false);
            }
          }}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 border-2 border-dashed border-[#0e639c] pointer-events-none z-10 flex flex-col items-center justify-center gap-2">
              <CloudUpload size={48} className="text-[#0e639c]" />
              <p className="text-[#0e639c] text-lg font-medium">放開以上傳</p>
              <p className="text-[#0e639c]/60 text-sm">支援多層資料夾、ZIP 檔案</p>
            </div>
          )}

          {previewPath ? (
            /* File preview panel */
            <FilePreview
              projectId={id}
              filePath={previewPath}
              onClose={() => setPreviewPath('')}
              onDownload={handleDownload}
              onDelete={(filePath, isDir) => {
                handleDelete(filePath, isDir);
                setPreviewPath('');
              }}
            />
          ) : selectedPath ? (
            /* Selected file info panel */
            <div className="p-6 max-w-lg">
              <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4">
                <p className="text-[#858585] text-xs mb-1.5">已選擇檔案</p>
                <div className="flex items-center gap-2 bg-[#1e1e1e] rounded px-3 py-2 mb-4">
                  <code className="text-[#9cdcfe] text-sm flex-1 break-all">{selectedPath}</code>
                  <button
                    onClick={copyPath}
                    className="text-[#858585] hover:text-white transition-colors flex-shrink-0"
                    title="複製路徑"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {isPreviewable(selectedPath.split('/').pop()) && (
                    <button
                      onClick={() => setPreviewPath(selectedPath)}
                      className="flex items-center gap-1.5 text-sm bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-2 rounded transition-colors"
                    >
                      預覽內容
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(selectedPath, selectedPath.split('/').pop())}
                    className="flex items-center gap-1.5 text-sm bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white px-3 py-2 rounded transition-colors"
                  >
                    <Download size={14} />
                    下載
                  </button>
                  <button
                    onClick={() => saveToLocalFolder(selectedPath, selectedPath.split('/').pop())}
                    className="flex items-center gap-1.5 text-sm bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white px-3 py-2 rounded transition-colors"
                    title="選擇本機資料夾，直接儲存過去（如 VS Code 工作區）"
                  >
                    <FolderDown size={14} />
                    儲存到資料夾
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPath, false)}
                    className="flex items-center gap-1.5 text-sm bg-transparent hover:bg-red-900/40 text-red-400 border border-red-900/50 hover:border-red-600 px-3 py-2 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                    刪除
                  </button>
                  <button
                    onClick={() => setSelectedPath('')}
                    className="ml-auto text-sm text-[#555] hover:text-[#858585] px-2 transition-colors"
                  >
                    取消選取
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state / drop hint */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <CloudUpload size={56} className="text-[#3c3c3c] mb-4" />
              <p className="text-[#555] text-base mb-1">拖拉檔案或資料夾到這裡上傳</p>
              <p className="text-[#424242] text-sm mb-6">支援單檔、多檔、多層資料夾、ZIP 檔案</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 bg-[#0e639c] hover:bg-[#1177bb] text-white px-4 py-2.5 rounded text-sm cursor-pointer transition-colors">
                  <Upload size={15} />
                  選擇檔案
                  <input type="file" multiple className="hidden" onChange={handleFileInput} />
                </label>
                <label className="flex items-center gap-2 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] px-4 py-2.5 rounded text-sm cursor-pointer transition-colors border border-[#3c3c3c] hover:border-[#555]">
                  <FolderUp size={15} />
                  選擇資料夾
                  <input type="file" webkitdirectory="" className="hidden" onChange={handleFileInput} />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
