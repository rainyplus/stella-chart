/**
 * API client for MeldChart backend.
 * All endpoints return { success: true, ...data } on success.
 */

import type {
  ChartData,
  InviteCode,
  PublicUser,
  Announcement,
  MaintenanceStatus,
} from '../../shared/types.js'

const API_BASE = '/api'

const TOKEN_KEY = 'meldchart_token'

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface ApiResponse<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch (err) {
    throw new Error('Network error: unable to connect to server')
  }

  let data: ApiResponse<T>
  try {
    data = (await res.json()) as ApiResponse<T>
  } catch {
    throw new Error('Invalid response from server')
  }

  if (!res.ok || !data.success) {
    if (res.status === 401) {
      clearToken()
    }
    throw new Error(data.error || `Request failed: ${res.status}`)
  }

  return data as T
}

export interface LoginPayload {
  account: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  inviteCode: string
  sessionId: string
}

export interface CaptchaResponse {
  success: boolean
  sessionId: string
  svg: string
}

export interface VerifyResponse {
  success: boolean
}

export interface AuthResponse {
  success: boolean
  token: string
  user: PublicUser
}

export interface UserResponse {
  success: boolean
  user: PublicUser
}

export const authApi = {
  getCaptcha: (): Promise<CaptchaResponse> =>
    request<CaptchaResponse>('/auth/captcha', { method: 'POST' }),

  verifyCaptcha: (sessionId: string, answer: string): Promise<VerifyResponse> =>
    request<VerifyResponse>('/auth/verify-captcha', {
      method: 'POST',
      body: JSON.stringify({ sessionId, answer }),
    }),

  verifySlider: (sessionId: string, token: string): Promise<VerifyResponse> =>
    request<VerifyResponse>('/auth/verify-slider', {
      method: 'POST',
      body: JSON.stringify({ sessionId, token }),
    }),

  register: (payload: RegisterPayload): Promise<UserResponse> =>
    request<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload): Promise<AuthResponse> => {
    const promise = request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    promise.then((res) => {
      if (res.token) setToken(res.token)
    })
    return promise
  },

  me: (): Promise<UserResponse> => request<UserResponse>('/auth/me'),

  logout: (): void => {
    clearToken()
  },

  getToken,
  setToken,
}

export interface AdminStatsResponse {
  success: boolean
  stats: Record<string, number>
}

export interface InviteCodesResponse {
  success: boolean
  codes: InviteCode[]
}

export interface GenerateInviteCodesResponse {
  success: boolean
  codes: string[]
}

export interface UsersResponse {
  success: boolean
  users: PublicUser[]
}

export interface AdminChartsResponse {
  success: boolean
  charts: Array<{
    id: string
    songName: string
    bpm: number
    difficulty: number
    createdBy?: string
    createdAt?: string
    sceneCount: number
  }>
}

export interface AnnouncementsResponse {
  success: boolean
  announcements: Announcement[]
}

export interface AnnouncementResponse {
  success: boolean
  announcement: Announcement
}

export interface CurrentAnnouncementResponse {
  success: boolean
  announcement: Announcement | null
}

export const adminApi = {
  stats: (): Promise<AdminStatsResponse> =>
    request<AdminStatsResponse>('/admin/stats'),

  generateInviteCodes: (
    count = 1
  ): Promise<GenerateInviteCodesResponse> =>
    request<GenerateInviteCodesResponse>(
      `/admin/invite-codes?count=${count}`,
      { method: 'POST' }
    ),

  listInviteCodes: (): Promise<InviteCodesResponse> =>
    request<InviteCodesResponse>('/admin/invite-codes'),

  revokeInviteCode: (code: string): Promise<VerifyResponse> =>
    request<VerifyResponse>(`/admin/invite-codes/${code}`, {
      method: 'DELETE',
    }),

  listUsers: (): Promise<UsersResponse> =>
    request<UsersResponse>('/admin/users'),

  toggleUser: (id: string): Promise<UserResponse> =>
    request<UserResponse>(`/admin/users/${id}/toggle`, {
      method: 'PATCH',
    }),

  deleteUser: (id: string): Promise<VerifyResponse> =>
    request<VerifyResponse>(`/admin/users/${id}`, { method: 'DELETE' }),

  listCharts: (): Promise<AdminChartsResponse> =>
    request<AdminChartsResponse>('/admin/charts'),

  deleteChart: (id: string): Promise<VerifyResponse> =>
    request<VerifyResponse>(`/admin/charts/${id}`, { method: 'DELETE' }),

  changePassword: (oldPassword: string, newPassword: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/admin/password', {
      method: 'PATCH',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  listAnnouncements: (): Promise<AnnouncementsResponse> =>
    request<AnnouncementsResponse>('/admin/announcements'),

  createAnnouncement: (title: string, content: string): Promise<AnnouncementResponse> =>
    request<AnnouncementResponse>('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),

  updateAnnouncement: (id: string, data: Partial<Announcement>): Promise<AnnouncementResponse> =>
    request<AnnouncementResponse>(`/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAnnouncement: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/admin/announcements/${id}`, { method: 'DELETE' }),

  getMaintenance: (): Promise<{ success: boolean; maintenance: MaintenanceStatus }> =>
    request<{ success: boolean; maintenance: MaintenanceStatus }>('/admin/maintenance'),

  updateMaintenance: (data: Partial<MaintenanceStatus>): Promise<{ success: boolean; maintenance: MaintenanceStatus }> =>
    request<{ success: boolean; maintenance: MaintenanceStatus }>('/admin/maintenance', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  downloadBackup: async (): Promise<Blob> => {
    const token = getToken()
    const res = await fetch(`${API_BASE}/admin/backup/download`, {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })
    if (!res.ok) {
      throw new Error('下载备份失败')
    }
    return res.blob()
  },

  restoreBackup: (backupData: string): Promise<{ success: boolean; message?: string }> =>
    request<{ success: boolean; message?: string }>('/admin/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupData }),
    }),
}

export interface MaintenanceStatusResponse {
  success: boolean
  maintenance: MaintenanceStatus
}

export const systemApi = {
  getMaintenanceStatus: (): Promise<MaintenanceStatusResponse> =>
    request<MaintenanceStatusResponse>('/maintenance/status'),
}

export interface ChartListResponse {
  success: boolean
  charts: Array<{
    id: string
    songName: string
    bpm: number
    difficulty: number
    coverUrl?: string
    createdAt?: string
    updatedAt?: string
  }>
}

export interface ChartResponse {
  success: boolean
  chart: ChartData
}

export interface CreateChartPayload {
  songName?: string
  bpm?: number
  difficulty?: number
  offset?: number
  coverUrl?: string
  audioUrl?: string
  audioMd5?: string
  id?: string
  [key: string]: unknown
}

export const chartApi = {
  list: (): Promise<ChartListResponse> =>
    request<ChartListResponse>('/charts'),

  create: (payload: CreateChartPayload): Promise<ChartResponse> =>
    request<ChartResponse>('/charts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  get: (id: string): Promise<ChartResponse> =>
    request<ChartResponse>(`/charts/${id}`),

  update: (id: string, chart: ChartData | Record<string, unknown>): Promise<ChartResponse> =>
    request<ChartResponse>(`/charts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(chart),
    }),

  delete: (id: string): Promise<VerifyResponse> =>
    request<VerifyResponse>(`/charts/${id}`, { method: 'DELETE' }),
}

export interface UploadResponse {
  success: boolean
  id: string
  url: string
  md5: string
}

export const uploadApi = {
  audio: (name: string, dataUrl: string): Promise<UploadResponse> =>
    request<UploadResponse>('/upload/audio', {
      method: 'POST',
      body: JSON.stringify({ name, dataUrl }),
    }),

  cover: (name: string, dataUrl: string): Promise<UploadResponse> =>
    request<UploadResponse>('/upload/cover', {
      method: 'POST',
      body: JSON.stringify({ name, dataUrl }),
    }),

  getAssetUrl: (id: string): string => `${API_BASE}/assets/${id}`,
}

export const exportApi = {
  export: async (id: string): Promise<Response> => {
    const token = getToken()
    return fetch(`${API_BASE}/export/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })
  },

  exportChart: async (id: string): Promise<Blob> => {
    const res = await exportApi.export(id)
    if (!res.ok) {
      let errorMessage = 'Export failed'
      try {
        const data = (await res.json()) as { error?: string }
        errorMessage = data.error || errorMessage
      } catch {
        // ignore
      }
      throw new Error(errorMessage)
    }
    return res.blob()
  },

  import: (data: string): Promise<ChartResponse> =>
    request<ChartResponse>('/export/', {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  importChart: (data: string): Promise<ChartResponse> =>
    exportApi.import(data),
}

export interface HealthResponse {
  success: boolean
  message: string
}

export const healthApi = {
  check: (): Promise<HealthResponse> =>
    request<HealthResponse>('/health'),
}

export const announcementApi = {
  getCurrent: (): Promise<CurrentAnnouncementResponse> =>
    request<CurrentAnnouncementResponse>('/announcements/current'),
}
