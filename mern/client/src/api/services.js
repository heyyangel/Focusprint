import api from './client';

const data = (res) => res.data;

/* ── Auth ──────────────────────────────────────────────────────────── */
export const authApi = {
  usernames: () => api.get('/auth/usernames').then((r) => r.data.data),
  login: (username, password) => api.post('/auth/login', { username, password }).then(data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  forgotPassword: (username) => api.post('/auth/forgot-password', { username }).then(data),
  resetPassword: (username, otp, newPassword) =>
    api.post('/auth/reset-password', { username, otp, newPassword }).then(data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then(data),
};

/* ── Doer List ─────────────────────────────────────────────────────── */
export const userApi = {
  list: () => api.get('/users').then((r) => r.data.data),
  departments: () => api.get('/users/departments').then((r) => r.data.data),
  hierarchy: () => api.get('/users/hierarchy').then((r) => r.data.data),
};

/* ── Checklist ─────────────────────────────────────────────────────── */
export const checklistApi = {
  list: () => api.get('/checklist').then((r) => r.data.data),
  bulkCreate: (rows) => api.post('/checklist/bulk', { rows }).then(data),
  updateGroup: (groupId, payload) => api.put(`/checklist/group/${groupId}`, payload).then(data),
  deleteGroup: (groupId) => api.delete(`/checklist/group/${encodeURIComponent(groupId)}`).then(data),
  complete: (updates) => api.post('/checklist/complete', { updates }).then(data),
  verify: (taskIds) => api.post('/checklist/verify', { taskIds }).then(data),
  revise: (updates) => api.post('/checklist/revise', { updates }).then(data),
};

/* ── Delegation ────────────────────────────────────────────────────── */
export const delegationApi = {
  list: () => api.get('/delegation').then((r) => r.data.data),
  create: (payload) => api.post('/delegation', payload).then(data),
  update: (taskId, payload) => api.put(`/delegation/${encodeURIComponent(taskId)}`, payload).then(data),
  remove: (taskIds) =>
    api.delete('/delegation', { data: { taskIds: [].concat(taskIds) } }).then(data),
  bulkStatusRemark: (updates) => api.post('/delegation/bulk-status', { updates }).then(data),
  complete: (updates) => api.post('/delegation/complete', { updates }).then(data),
  revise: (updates) => api.post('/delegation/revise', { updates }).then(data),
};

/* ── Uploads ───────────────────────────────────────────────────────── */
export const uploadApi = {
  proof: (file, taskId) => {
    const form = new FormData();
    // taskId must be appended before the file — multer reads fields in order
    // and uses it to name the stored proof.
    form.append('taskId', taskId || '');
    form.append('file', file);
    return api
      .post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.fileUrl);
  },
};
