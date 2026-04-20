'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderOpen, Plus, Trash2, Code2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import CreateProjectModal from '../components/CreateProjectModal';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setServerError(false);
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch {
      setServerError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleDelete = async (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`確定要刪除專案「${name}」？\n此操作將刪除所有檔案，無法復原。`)) return;
    try {
      await api.projects.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('刪除失敗：' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Code2 size={30} className="text-[#0e639c]" />
            <div>
              <h1 className="text-xl font-semibold text-white leading-none">CodeStore</h1>
              <p className="text-[#555] text-xs mt-0.5">本地程式碼檔案管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadProjects}
              className="p-2 text-[#858585] hover:text-white transition-colors rounded hover:bg-[#2a2d2e]"
              title="重新整理"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-2 rounded text-sm transition-colors"
            >
              <Plus size={15} />
              新增專案
            </button>
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="flex items-start gap-3 bg-[#5a1d1d] border border-[#be1100] rounded p-4 mb-6 text-sm">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">無法連接後端伺服器</p>
              <p className="text-red-400/80 text-xs mt-1">
                請確認 server 已啟動（執行 <code className="bg-black/30 px-1 rounded">start.bat</code>），
                且 <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_API_URL</code> 設定正確。
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-[#555] text-center py-20">載入中...</div>
        ) : !serverError && projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-[#424242] mb-4" />
            <p className="text-[#858585] mb-1">尚無專案工作區</p>
            <p className="text-[#424242] text-sm">點擊右上角「新增專案」開始使用</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] hover:border-[#0e639c] rounded-lg p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen size={18} className="text-[#dcb67a] flex-shrink-0" />
                    <span className="font-medium text-white truncate">{project.name}</span>
                  </div>
                  <button
                    onClick={e => handleDelete(e, project.id, project.name)}
                    className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all p-1 -m-1 flex-shrink-0"
                    title="刪除專案"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {project.description && (
                  <p className="text-[#858585] text-sm mt-2 truncate">{project.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <code className="text-[#424242] text-xs">{project.id}</code>
                  {project.createdAt && (
                    <span className="text-[#424242] text-xs">{formatDate(project.createdAt)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={project => {
            setProjects(prev => [project, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
