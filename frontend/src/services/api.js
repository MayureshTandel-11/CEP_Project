/**
 * Centralised API client.
 * Every network call goes through here: one place for the base URL, session
 * cookies, JSON parsing and error shaping.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export class ApiError extends Error {
  constructor(message, code, status, details) {
    super(message)
    this.code = code
    this.status = status
    this.details = details || {}
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include', // session cookie
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      'Cannot reach the server. Check that the Express backend is running.',
      'NETWORK_ERROR', 0,
    )
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiError(
      payload?.message || 'Something went wrong. Please try again.',
      payload?.error || 'UNKNOWN',
      response.status,
      payload?.details,
    )
  }
  return payload?.data ?? payload
}

const get = (path) => request(path)
const post = (path, body) => request(path, { method: 'POST', body })
const put = (path, body) => request(path, { method: 'PUT', body })
const del = (path) => request(path, { method: 'DELETE' })

export const api = {
  register: (body) => post('/auth/register', body),
  login: (body) => post('/auth/login', body),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),

  getProfile: () => get('/profile'),
  saveProfile: (body) => put('/profile', body),
  profileOptions: () => get('/profile/options'),

  healthMetrics: () => get('/health-metrics'),
  nutrition: () => get('/recommendations/nutrition'),
  activity: () => get('/recommendations/activity'),
  weeklyActivity: () => get('/recommendations/activity/weekly'),
  wellness: () => get('/recommendations/wellness'),

  createLog: (body) => post('/logs', body),
  listLogs: (range = 7) => get(`/logs?range=${range}`),
  updateLog: (id, body) => put(`/logs/${id}`, body),
  deleteLog: (id) => del(`/logs/${id}`),

  dashboard: (range = 7) => get(`/dashboard?range=${range}`),
  wellnessScore: () => get('/wellness-score'),

  sendFeedback: (body) => post('/feedback', body),
  listFeedback: () => get('/feedback'),
  recentRecommendations: () => get('/recommendations/recent'),

  mlExplanation: () => get('/ml/explanation'),
  assistantStatus: () => get('/assistant/status'),
  askAssistant: (message) => post('/assistant', { message }),
}
