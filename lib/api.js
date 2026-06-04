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

  deploy: (formData) => request('POST', 'deploy', { body: formData }),

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
    downloadZip: (projectId, paths) => request('POST', `projects/${projectId}/download-zip`, {
      body: { paths },
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
    rawUrl: (projectId, filePath) => {
      const url = `${BASE_URL}/api/projects/${projectId}/raw`;
      const params = new URLSearchParams();
      params.set('path', filePath);
      if (API_KEY) params.set('_key', API_KEY);
      return `${url}?${params}`;
    },
    rawBlob: async (projectId, filePath) => {
      console.log(`[api] rawBlob fetching: project=${projectId} path=${filePath}`);
      const url = `${BASE_URL}/api/projects/${projectId}/raw`;
      const params = new URLSearchParams();
      params.set('path', filePath);
      if (API_KEY) params.set('_key', API_KEY);

      const res = await fetch(`${url}?${params}`, {
        headers: {
          'x-api-key': API_KEY,
          'ngrok-skip-browser-warning': '1',
        },
      });

      if (!res.ok) {
        console.error(`[api] rawBlob failed: HTTP ${res.status} ${res.statusText}`);
        throw new Error(`HTTP ${res.status}`);
      }

      const blob = await res.blob();
      console.log(`[api] rawBlob OK: type=${blob.type} size=${blob.size}`);
      return blob;
    },
  },
};
