'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Trash2, Copy, Check, Loader2, AlertCircle, FileX, ExternalLink, Maximize2, Minimize2, Eye, FileCode } from 'lucide-react';
import { marked } from 'marked';
import { api } from '../lib/api';

const TEXT_EXTENSIONS = new Set([
  'js','jsx','ts','tsx','mjs','cjs',
  'py','go','rs','java','jsp','cpp','c','h','cs','php','rb','swift','kt','scala','r',
  'lua','dart','ex','exs','elm','hs','clj','erl','fs','fsx','groovy','jl','nim',
  'pl','rkt','sql','zig',
  'sh','bash','zsh','ps1','bat','cmd',
  'html','htm','css','scss','less','sass','vue','svelte','astro',
  'json','yaml','yml','toml','xml','graphql','gql',
  'md','mdx','txt','log','csv','tsv',
  'env','ini','conf','cfg','editorconfig','gitignore','gitattributes',
  'dockerfile','makefile','lock','prisma','proto',
]);

const IMAGE_EXTENSIONS = new Set([
  'png','jpg','jpeg','gif','svg','webp','ico','bmp','tiff','tif','heic','avif','apng',
]);

const MD_EXTENSIONS = new Set(['md', 'mdx']);
const PDF_EXTENSIONS = new Set(['pdf']);

const OFFICE_EXTENSIONS = new Set([
  'doc','docx','xls','xlsx','ppt','pptx',
  'odt','ods','odp','rtf','pages','numbers','key',
]);

const ARCHIVE_EXTENSIONS = new Set([
  'zip','rar','7z','tar','gz','xz','bz2','tgz','iso','dmg',
]);

export function isPreviewable(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const noExt = ['dockerfile', 'makefile', 'procfile', 'readme', 'license', 'changelog'];
  return (
    TEXT_EXTENSIONS.has(ext) ||
    IMAGE_EXTENSIONS.has(ext) ||
    PDF_EXTENSIONS.has(ext) ||
    MD_EXTENSIONS.has(ext) ||
    OFFICE_EXTENSIONS.has(ext) ||
    noExt.includes(filename.toLowerCase())
  );
}

function getLanguageClass(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', mjs: 'js',
    jsp: 'java', py: 'python', go: 'go', rs: 'rust', java: 'java',
    cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', rb: 'ruby',
    swift: 'swift', kt: 'kotlin',
    sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell', bat: 'batch',
    html: 'html', htm: 'html', css: 'css', scss: 'scss',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
    md: 'markdown', mdx: 'markdown', sql: 'sql', graphql: 'graphql',
    svg: 'xml',
  };
  return map[ext] || 'plaintext';
}

function getFileTypeCategory(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (MD_EXTENSIONS.has(ext)) return 'markdown';
  if (OFFICE_EXTENSIONS.has(ext)) return 'office';
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'archive';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'text';
}

function HumanFileType(filename) {
  const cat = getFileTypeCategory(filename);
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    text: '文字檔', image: '圖片', pdf: 'PDF 文件',
    markdown: 'Markdown', office: `${(ext || '').toUpperCase()} 文件`, archive: '壓縮檔',
  };
  return map[cat] || '檔案';
}

export default function FilePreview({ projectId, filePath, onClose, onDownload, onDelete }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [rawUrl, setRawUrl] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('rendered');

  const blobUrlRef = useRef(null);

  const fileName = filePath?.split('/').pop() || '';
  const category = fileName ? getFileTypeCategory(fileName) : 'text';

  // Revoke previous blob URL on cleanup or filePath change
  const revokeBlob = () => {
    if (blobUrlRef.current) {
      console.log('[preview] revoking blob URL');
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    setError('');
    setContent('');
    setRawUrl('');
    revokeBlob();

    const cat = getFileTypeCategory(filePath);
    console.log(`[preview] loading: file=${filePath} cat=${cat}`);

    if (cat === 'text' || cat === 'markdown') {
      api.files.content(projectId, filePath)
        .then(data => {
          if (cat === 'markdown') {
            setRawUrl(marked.parse(data.content, { breaks: true, gfm: true }));
          }
          setContent(data.content);
          console.log(`[preview] ${cat} loaded: lines=${data.content.split('\n').length} chars=${data.content.length}`);
        })
        .catch(err => {
          console.error(`[preview] ${cat} failed:`, err.message);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    } else if (cat === 'image' || cat === 'pdf') {
      api.files.rawBlob(projectId, filePath)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setRawUrl(url);
          console.log(`[preview] ${cat} blob ready: url=${url.substring(0, 50)}...`);
        })
        .catch(err => {
          console.error(`[preview] ${cat} blob failed:`, err.message);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    } else if (cat === 'office') {
      // Try Office Online Viewer via public raw URL (requires ngrok paid or visited once)
      const publicUrl = api.files.rawUrl(projectId, filePath);
      setRawUrl(publicUrl);
      console.log(`[preview] office publicUrl: ${publicUrl.substring(0, 80)}...`);
      setLoading(false);
    } else {
      console.log(`[preview] ${cat}: no preview, showing download`);
      setLoading(false);
    }

    return () => revokeBlob();
  }, [projectId, filePath]);

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = content.split('\n');
  const isText = category === 'text';
  const isMarkdown = category === 'markdown';

  return (
    <div className={`flex flex-col bg-[#1e1e1e] ${fullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c] flex-shrink-0">
        <span className="text-white text-sm font-medium truncate flex-1">{fileName}</span>
        <span className="text-[#555] text-xs hidden sm:inline truncate max-w-[200px]">{filePath}</span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!loading && !error && (isText || isMarkdown) && (
            <button
              onClick={copyContent}
              className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
              title="複製內容"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          )}
          {isMarkdown && !loading && !error && (
            <button
              onClick={() => setViewMode(v => v === 'rendered' ? 'source' : 'rendered')}
              className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
              title={viewMode === 'rendered' ? '顯示原始碼' : '顯示渲染'}
            >
              {viewMode === 'rendered' ? <FileCode size={14} /> : <Eye size={14} />}
            </button>
          )}
          {(category === 'image' || category === 'pdf') && (
            <button
              onClick={() => setFullscreen(f => !f)}
              className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
              title={fullscreen ? '退出全螢幕' : '全螢幕'}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {(category === 'pdf') && (
            <button
              onClick={() => window.open(rawUrl, '_blank')}
              className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
              title="在新分頁開啟"
            >
              <ExternalLink size={14} />
            </button>
          )}
          <button
            onClick={() => onDownload(filePath, fileName)}
            className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
            title="下載"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => onDelete(filePath, false)}
            className="p-1.5 text-[#858585] hover:text-red-400 rounded hover:bg-[#3c3c3c] transition-colors"
            title="刪除"
          >
            <Trash2 size={14} />
          </button>
          <div className="w-px h-4 bg-[#3c3c3c] mx-0.5" />
          <button
            onClick={onClose}
            className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
            title="關閉預覽"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2 text-[#555]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">載入中...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#555] p-8">
            <AlertCircle size={36} className="text-red-500/50" />
            <p className="text-sm text-red-400/70">{error}</p>
            <button
              onClick={() => onDownload(filePath, fileName)}
              className="flex items-center gap-1.5 text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-1.5 rounded transition-colors"
            >
              <Download size={12} />
              下載檔案
            </button>
          </div>
        )}

        {!loading && !error && isText && (
          <div className="flex text-sm font-mono">
            <div
              className="select-none text-right pr-4 pl-4 py-4 text-[#424242] border-r border-[#2d2d2d] flex-shrink-0"
              style={{ minWidth: `${String(lines.length).length * 9 + 32}px` }}
            >
              {lines.map((_, i) => (
                <div key={i} className="leading-6 text-xs">{i + 1}</div>
              ))}
            </div>
            <pre className="flex-1 py-4 px-4 text-[#d4d4d4] leading-6 text-xs overflow-x-auto whitespace-pre">
              {content}
            </pre>
          </div>
        )}

        {!loading && !error && isMarkdown && viewMode === 'rendered' && (
          <div
            className="markdown-body py-6 px-8 max-w-4xl mx-auto text-[#d4d4d4] text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: rawUrl }}
          />
        )}

        {!loading && !error && isMarkdown && viewMode === 'source' && (
          <div className="flex text-sm font-mono">
            <div
              className="select-none text-right pr-4 pl-4 py-4 text-[#424242] border-r border-[#2d2d2d] flex-shrink-0"
              style={{ minWidth: `${String(lines.length).length * 9 + 32}px` }}
            >
              {lines.map((_, i) => (
                <div key={i} className="leading-6 text-xs">{i + 1}</div>
              ))}
            </div>
            <pre className="flex-1 py-4 px-4 text-[#d4d4d4] leading-6 text-xs overflow-x-auto whitespace-pre">
              {content}
            </pre>
          </div>
        )}

        {!loading && category === 'image' && rawUrl && (
          <div className="flex items-center justify-center h-full bg-[#0d0d0d] p-4">
            <img
              src={rawUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain rounded shadow-lg"
              style={{ imageRendering: 'auto' }}
            />
          </div>
        )}

        {!loading && category === 'pdf' && rawUrl && (
          <iframe
            src={rawUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        )}

        {!loading && category === 'archive' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[#555] p-8">
            <FileX size={48} className="text-[#3c3c3c]" />
            <div className="text-center">
              <p className="text-[#cccccc] text-sm mb-1">{fileName}</p>
              <p className="text-[#555] text-xs">壓縮檔 — 無法直接預覽</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onDownload(filePath, fileName)}
                className="flex items-center gap-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white px-4 py-2 rounded text-sm transition-colors"
              >
                <Download size={15} />
                下載檔案
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] px-4 py-2 rounded text-sm transition-colors border border-[#3c3c3c]"
              >
                關閉
              </button>
            </div>
          </div>
        )}

        {!loading && category === 'office' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[#555] p-8">
            <FileX size={48} className="text-[#3c3c3c]" />
            <div className="text-center">
              <p className="text-[#cccccc] text-sm mb-1">{fileName}</p>
              <p className="text-[#555] text-xs">{HumanFileType(fileName)} — 無法直接預覽</p>
              <p className="text-[#424242] text-xs mt-1">Office 線上檢視器需 ngrok 付費版才能運作</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onDownload(filePath, fileName)}
                className="flex items-center gap-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white px-4 py-2 rounded text-sm transition-colors"
              >
                <Download size={15} />
                下載檔案
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] px-4 py-2 rounded text-sm transition-colors border border-[#3c3c3c]"
              >
                關閉
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (isText || isMarkdown) && (
        <div className="flex items-center gap-4 px-4 py-1.5 bg-[#007acc] text-white text-xs flex-shrink-0">
          <span>{isMarkdown ? `Markdown (${viewMode === 'rendered' ? '渲染' : '原始碼'})` : getLanguageClass(fileName)}</span>
          <span>{lines.length} 行</span>
          <span>{content.length.toLocaleString()} 字元</span>
        </div>
      )}
      {!loading && category === 'image' && rawUrl && (
        <div className="flex items-center gap-4 px-4 py-1.5 bg-[#007acc] text-white text-xs flex-shrink-0">
          <span>圖片預覽</span>
          <span>{fileName}</span>
        </div>
      )}
      {!loading && category === 'pdf' && rawUrl && (
        <div className="flex items-center gap-4 px-4 py-1.5 bg-[#007acc] text-white text-xs flex-shrink-0">
          <span>PDF 預覽</span>
          <span>{fileName}</span>
        </div>
      )}
    </div>
  );
}
