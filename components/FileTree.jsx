'use client';

import { useState, useRef } from 'react';
import {
  ChevronRight, ChevronDown,
  Folder, FolderOpen,
  FileText, FileCode, FileImage, File,
  Download, Trash2, Eye, Check, FolderArchive
} from 'lucide-react';
import { isPreviewable } from './FilePreview';

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'swift'];
  const textExts = ['md', 'txt', 'json', 'yaml', 'yml', 'toml', 'xml', 'csv', 'env', 'sh', 'bat'];
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];
  if (codeExts.includes(ext)) return <FileCode size={14} className="flex-shrink-0 text-[#9cdcfe]" />;
  if (textExts.includes(ext)) return <FileText size={14} className="flex-shrink-0 text-[#cccccc]" />;
  if (imageExts.includes(ext)) return <FileImage size={14} className="flex-shrink-0 text-[#dcb67a]" />;
  return <File size={14} className="flex-shrink-0 text-[#858585]" />;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Drag state shared across the whole tree (module-level refs via context trick)
// We pass drag state down as props to avoid prop-drilling pain with useState
function TreeNode({
  node, depth, projectId,
  onDelete, onDownload, onPreview, onSelect,
  selectedPath,
  multiSelected, onToggleSelect, selectionMode,
  draggingPath, dragOverPath,
  onDragStart, onDragEnd, onDragEnterDir, onDragLeaveDir, onDropDir,
}) {
  const isDir = node.type === 'directory';
  const isSelected = selectedPath === node.path;
  const isDragOver = isDir && dragOverPath === node.path;
  const isBeingDragged = draggingPath === node.path;
  const isMultiSelected = multiSelected.has(node.path);

  // Expand automatically when dragged over
  const [expanded, setExpanded] = useState(depth < 1);
  const expandTimer = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDir) return;
    e.dataTransfer.dropEffect = 'move';
    onDragEnterDir(node.path);
    // Auto-expand after 600ms
    if (!expanded) {
      clearTimeout(expandTimer.current);
      expandTimer.current = setTimeout(() => setExpanded(true), 600);
    }
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    clearTimeout(expandTimer.current);
    // Only fire if leaving this specific element entirely
    if (e.currentTarget.contains(e.relatedTarget)) return;
    onDragLeaveDir(node.path);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(expandTimer.current);
    if (!isDir) return;
    onDropDir(node.path);
  };

  return (
    <div>
      <div
        draggable
        onDragStart={e => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = isDir ? 'move' : 'copyMove';
          // Mark as internal so main drop zone ignores it
          e.dataTransfer.setData('application/x-codestore-internal', node.path);
          // For files: set DownloadURL so Chrome allows dragging to desktop/Explorer
          if (!isDir) {
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
            const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
            const url = `${apiUrl}/api/projects/${projectId}/download?path=${encodeURIComponent(node.path)}&_key=${encodeURIComponent(apiKey)}`;
            e.dataTransfer.setData('DownloadURL', `application/octet-stream:${node.name}:${url}`);
          }
          onDragStart(node.path);
        }}
        onDragEnd={e => { e.stopPropagation(); onDragEnd(); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={e => {
          if (selectionMode || e.ctrlKey || e.metaKey) {
            onToggleSelect(node.path);
          } else if (isDir) {
            setExpanded(v => !v);
          } else {
            onSelect(node.path);
          }
        }}
        className={[
          'flex items-center gap-1 py-0.5 pr-1 rounded cursor-pointer group select-none transition-colors',
          isBeingDragged ? 'opacity-40' : '',
          isDragOver
            ? 'bg-[#094771] outline outline-1 outline-[#0e639c]'
            : isMultiSelected
            ? 'bg-[#0e639c]/20 outline outline-1 outline-[#0e639c]/50'
            : isSelected
            ? 'bg-[#094771] hover:bg-[#094771]'
            : 'hover:bg-[#2a2d2e]',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(node.path); }}
          className={`flex-shrink-0 rounded flex items-center justify-center w-3.5 h-3.5 border transition-all ${
            isMultiSelected
              ? 'bg-[#0e639c] border-[#0e639c] opacity-100'
              : selectionMode
              ? 'border-[#555] opacity-100'
              : 'border-[#555] opacity-0 group-hover:opacity-60'
          }`}
          title="選取"
        >
          {isMultiSelected && <Check size={10} className="text-white" />}
        </button>

        {isDir ? (
          <>
            <span className="text-[#858585] flex-shrink-0">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            {expanded
              ? <FolderOpen size={14} className={`flex-shrink-0 ${isDragOver ? 'text-white' : 'text-[#dcb67a]'}`} />
              : <Folder size={14} className={`flex-shrink-0 ${isDragOver ? 'text-white' : 'text-[#dcb67a]'}`} />
            }
          </>
        ) : (
          <>
            <span className="w-[14px] flex-shrink-0" />
            {getFileIcon(node.name)}
          </>
        )}

        <span className="text-sm text-[#cccccc] truncate flex-1 ml-1">{node.name}</span>

        {!isDir && (
          <span className="text-[#555] text-xs flex-shrink-0 hidden group-hover:inline">
            {formatSize(node.size)}
          </span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 ml-1">
          {!isDir && isPreviewable(node.name) && (
            <button
              onClick={e => { e.stopPropagation(); onPreview(node.path); }}
              className="p-0.5 text-[#858585] hover:text-[#9cdcfe] rounded hover:bg-[#3c3c3c]"
              title="預覽"
            >
              <Eye size={12} />
            </button>
          )}
          {!isDir && (
            <button
              onClick={e => { e.stopPropagation(); onDownload(node.path, node.name); }}
              className="p-0.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c]"
              title="下載"
            >
              <Download size={12} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(node.path, isDir); }}
            className="p-0.5 text-[#858585] hover:text-red-400 rounded hover:bg-[#3c3c3c]"
            title="刪除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isDir && expanded && node.children?.map(child => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          projectId={projectId}
          onDelete={onDelete}
          onDownload={onDownload}
          onPreview={onPreview}
          onSelect={onSelect}
          selectedPath={selectedPath}
          multiSelected={multiSelected}
          onToggleSelect={onToggleSelect}
          selectionMode={selectionMode}
          draggingPath={draggingPath}
          dragOverPath={dragOverPath}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragEnterDir={onDragEnterDir}
          onDragLeaveDir={onDragLeaveDir}
          onDropDir={onDropDir}
        />
      ))}
    </div>
  );
}

export default function FileTree({
  files, projectId, onDelete, onDownload, onPreview, onMove, selectedPath, onSelect,
  multiSelected, onToggleSelect, onMultiDownload, onClearSelection, selectionMode,
}) {
  const [draggingPath, setDraggingPath] = useState(null);
  const [dragOverPath, setDragOverPath] = useState(null); // null = root zone

  const handleDragStart = (path) => setDraggingPath(path);

  const handleDragEnd = () => {
    setDraggingPath(null);
    setDragOverPath(null);
  };

  const handleDragEnterDir = (path) => {
    if (path === draggingPath) return;
    if (path.startsWith(draggingPath + '/')) return;
    setDragOverPath(path);
  };

  const handleDragLeaveDir = (path) => {
    setDragOverPath(prev => prev === path ? null : prev);
  };

  const handleDropDir = (targetDir) => {
    if (!draggingPath) return;
    if (targetDir === draggingPath) return;
    if (targetDir.startsWith(draggingPath + '/')) return;
    onMove(draggingPath, targetDir);
    handleDragEnd();
  };

  // Root-level drop zone
  const handleRootDragOver = (e) => {
    if (!draggingPath) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPath('__root__');
  };

  const handleRootDrop = (e) => {
    e.preventDefault();
    if (!draggingPath) return;
    onMove(draggingPath, '');
    handleDragEnd();
  };

  const sharedProps = {
    projectId,
    onDelete, onDownload, onPreview, onSelect, selectedPath,
    multiSelected, onToggleSelect, selectionMode,
    draggingPath, dragOverPath,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragEnterDir: handleDragEnterDir,
    onDragLeaveDir: handleDragLeaveDir,
    onDropDir: handleDropDir,
  };

  if (!files || files.length === 0) {
    return (
      <div className="text-[#555] text-xs text-center py-10 px-4">
        尚無檔案<br />
        <span className="text-[#424242]">拖拉檔案到右側區域上傳</span>
      </div>
    );
  }

  return (
    <div className="py-1 flex flex-col h-full">
      <div className="flex-1">
        {files.map(node => (
          <TreeNode key={node.path} node={node} depth={0} {...sharedProps} />
        ))}
      </div>

      {/* Multi-select action bar */}
      {multiSelected.size > 0 && (
        <div className="mx-2 mb-1 mt-1 px-2 py-1.5 bg-[#094771] rounded flex items-center gap-2">
          <span className="text-xs text-[#9cdcfe] flex-1">已選 {multiSelected.size} 個</span>
          <button
            onClick={onMultiDownload}
            className="flex items-center gap-1 text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white px-2 py-1 rounded transition-colors"
            title="打包下載 ZIP"
          >
            <FolderArchive size={12} />
            下載 ZIP
          </button>
          <button
            onClick={onClearSelection}
            className="text-xs text-[#9cdcfe]/70 hover:text-white transition-colors"
          >
            清除
          </button>
        </div>
      )}

      {/* Root drop zone — shown only while dragging */}
      {draggingPath && (
        <div
          onDragOver={handleRootDragOver}
          onDragLeave={() => setDragOverPath(null)}
          onDrop={handleRootDrop}
          className={[
            'mx-2 mb-2 mt-1 rounded border border-dashed text-xs text-center py-2 transition-colors',
            dragOverPath === '__root__'
              ? 'border-[#0e639c] bg-[#094771]/40 text-[#9cdcfe]'
              : 'border-[#3c3c3c] text-[#424242]',
          ].join(' ')}
        >
          拖到這裡移至根目錄
        </div>
      )}

      {/* Drag hint */}
      {draggingPath && (
        <div className="px-3 pb-2 text-[#424242] text-xs text-center">
          拖到資料夾上方即可移動
        </div>
      )}
    </div>
  );
}
