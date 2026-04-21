const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

async function request(method, path, options = {}) {
  const { body, params, isBlob = false } = options;

  let url = `${BASE_URL}/api/${path}`;
  if (params) url += '?' + new URLSearchParams(params);

  const headers = { 'x-api-key': API_KEY, 'ngrok-skip-browser-warning': '1' };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (isBlob) return res.blob();
  return res.json();
}

export const api = {
  health: () => request('GET', 'health'),

  projects: {
    list: () => request('GET', 'projects'),
    create: (data) => request('POST', 'projects', { body: data }),
    get: (id) => request('GET', `projects/${id}`),
    delete: (id) => request('DELETE', `projects/${id}`),
  },

  files: {
    list: (projectId) => request('GET', `projects/${projectId}/files`),
    upload: (projectId, formData) => request('POST', `projects/${projectId}/upload`, { body: formData }),
    download: (projectId, filePath) => request('GET', `projects/${projectId}/download`, {
      params: { path: filePath },
      isBlob: true,
    }),
    delete: (projectId, filePath) => request('DELETE', `projects/${projectId}/files`, {
      params: { path: filePath },
    }),
    mkdir: (projectId, dirPath) => request('POST', `projects/${projectId}/mkdir`, {
      body: { path: dirPath },
    }),
    content: (projectId, filePath) => request('GET', `projects/${projectId}/content`, {
      params: { path: filePath },
    }),
    move: (projectId, from, to) => request('POST', `projects/${projectId}/move`, {
      body: { from, to },
    }),
  },
};
