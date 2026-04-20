'use client';

import { useState, useEffect } from 'react';
import { X, Download, Trash2, Copy, Check, Loader2, AlertCircle, FileX } from 'lucide-react';
import { api } from '../lib/api';

const TEXT_EXTENSIONS = new Set([
  'js','jsx','ts','tsx','mjs','cjs',
  'py','go','rs','java','cpp','c','h','cs','php','rb','swift','kt','scala','r',
  'sh','bash','zsh','ps1','bat','cmd',
  'html','htm','css','scss','less','sass',
  'json','yaml','yml','toml','xml','svg','graphql','gql',
  'md','mdx','txt','log','csv','tsv','sql',
  'env','ini','conf','cfg','editorconfig','gitignore','gitattributes',
  'dockerfile','makefile','lock','prisma','proto',
]);

export function isPreviewable(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const noExt = ['dockerfile', 'makefile', 'procfile', 'readme', 'license', 'changelog'];
  return TEXT_EXTENSIONS.has(ext) || noExt.includes(filename.toLowerCase());
}

function getLanguageClass(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', mjs: 'js',
    py: 'python', go: 'go', rs: 'rust', java: 'java',
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

export default function FilePreview({ projectId, filePath, onClose, onDownload, onDelete }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fileName = filePath?.split('/').pop() || '';

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    setError('');
    setContent('');
    api.files.content(projectId, filePath)
      .then(data => setContent(data.content))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId, filePath]);

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = content.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c] flex-shrink-0">
        <span className="text-white text-sm font-medium truncate flex-1">{fileName}</span>
        <span className="text-[#555] text-xs hidden sm:inline truncate max-w-[200px]">{filePath}</span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!loading && !error && (
            <button
              onClick={copyContent}
              className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c] transition-colors"
              title="複製內容"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
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
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#555]">
            {error.includes('binary') || error.includes('Cannot read') ? (
              <>
                <FileX size={36} className="text-[#424242]" />
                <p className="text-sm">無法預覽此檔案（二進位格式）</p>
                <button
                  onClick={() => onDownload(filePath, fileName)}
                  className="flex items-center gap-1.5 text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-1.5 rounded transition-colors"
                >
                  <Download size={12} />
                  下載檔案
                </button>
              </>
            ) : (
              <>
                <AlertCircle size={36} className="text-red-500/50" />
                <p className="text-sm text-red-400/70">{error}</p>
              </>
            )}
          </div>
        )}

        {!loading && !error && (
          <div className="flex text-sm font-mono">
            {/* Line numbers */}
            <div
              className="select-none text-right pr-4 pl-4 py-4 text-[#424242] border-r border-[#2d2d2d] flex-shrink-0"
              style={{ minWidth: `${String(lines.length).length * 9 + 32}px` }}
            >
              {lines.map((_, i) => (
                <div key={i} className="leading-6 text-xs">{i + 1}</div>
              ))}
            </div>

            {/* Code */}
            <pre className="flex-1 py-4 px-4 text-[#d4d4d4] leading-6 text-xs overflow-x-auto whitespace-pre">
              {content}
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div className="flex items-center gap-4 px-4 py-1.5 bg-[#007acc] text-white text-xs flex-shrink-0">
          <span>{getLanguageClass(fileName)}</span>
          <span>{lines.length} 行</span>
          <span>{content.length.toLocaleString()} 字元</span>
        </div>
      )}
    </div>
  );
}
