'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';

export default function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const project = await api.projects.create({ name: name.trim(), description: description.trim() });
      onCreate(project);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-base">新增專案工作區</h2>
          <button onClick={onClose} className="text-[#858585] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#858585] mb-1.5">專案名稱 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#3c3c3c] border border-[#555] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0e639c]"
              placeholder="my-project"
              autoFocus
            />
            <p className="text-xs text-[#555] mt-1">只允許英文、數字、連字號</p>
          </div>

          <div>
            <label className="block text-xs text-[#858585] mb-1.5">描述（選填）</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#3c3c3c] border border-[#555] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0e639c]"
              placeholder="專案用途說明"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#858585] hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm bg-[#0e639c] hover:bg-[#1177bb] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '建立中...' : '建立專案'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
