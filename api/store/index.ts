/**
 * In-memory data stores with file-based persistence.
 * Data is loaded from JSON files on startup and saved on changes.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { User, InviteCode, VerificationSession, ChartData, UploadedAsset, Announcement, MaintenanceStatus } from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data')

console.log('[Data] DATA_DIR =', DATA_DIR)

if (!fs.existsSync(DATA_DIR)) {
  console.log('[Data] Creating data directory...')
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    console.log('[Data] Data directory created successfully')
  } catch (err) {
    console.error('[Data] Failed to create data directory:', err)
  }
} else {
  console.log('[Data] Data directory exists')
  try {
    const testFile = path.join(DATA_DIR, '.write-test')
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)
    console.log('[Data] Data directory is writable')
  } catch (err) {
    console.error('[Data] Data directory is NOT writable:', err)
  }
}

function loadMap<T>(filename: string): Map<string, T> {
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return new Map()
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return new Map(Object.entries(data))
  } catch {
    return new Map()
  }
}

function loadJson<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return defaultValue
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return defaultValue
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function persistAll(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(Object.fromEntries(users), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'usersByUsername.json'), JSON.stringify(Object.fromEntries(usersByUsername), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'usersByEmail.json'), JSON.stringify(Object.fromEntries(usersByEmail), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'inviteCodes.json'), JSON.stringify(Object.fromEntries(inviteCodes), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'charts.json'), JSON.stringify(Object.fromEntries(charts), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'assets.json'), JSON.stringify(Object.fromEntries(assets), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'announcements.json'), JSON.stringify(Object.fromEntries(announcements), null, 2))
      fs.writeFileSync(path.join(DATA_DIR, 'maintenance.json'), JSON.stringify(maintenance, null, 2))
    } catch (err) {
      console.error('[persistence] Failed to save data', err)
    }
    saveTimeout = null
  }, 100)
}

export const users: Map<string, User> = loadMap<User>('users.json')
export const usersByUsername: Map<string, string> = loadMap<string>('usersByUsername.json')
export const usersByEmail: Map<string, string> = loadMap<string>('usersByEmail.json')
export const inviteCodes: Map<string, InviteCode> = loadMap<InviteCode>('inviteCodes.json')
export const verificationSessions: Map<string, VerificationSession> = new Map()
export const charts: Map<string, ChartData> = loadMap<ChartData>('charts.json')
export const assets: Map<string, UploadedAsset> = loadMap<UploadedAsset>('assets.json')
export const announcements: Map<string, Announcement> = loadMap<Announcement>('announcements.json')

const defaultMaintenance: MaintenanceStatus = {
  isMaintenance: false,
  message: '服务器维护中，请稍后再试',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
}

export let maintenance: MaintenanceStatus = loadJson<MaintenanceStatus>('maintenance.json', defaultMaintenance)

let autoOpenTimer: ReturnType<typeof setTimeout> | null = null

function setupAutoOpenServer() {
  if (autoOpenTimer) {
    clearTimeout(autoOpenTimer)
    autoOpenTimer = null
  }
  
  if (maintenance.isMaintenance && maintenance.scheduledOpenTime) {
    const openTime = new Date(maintenance.scheduledOpenTime).getTime()
    const now = Date.now()
    const delay = openTime - now
    
    if (delay > 0 && delay < 30 * 24 * 60 * 60 * 1000) {
      console.log(`[Maintenance] 自动开服已设置，将在 ${Math.round(delay / 1000)} 秒后开服`)
      autoOpenTimer = setTimeout(() => {
        console.log('[Maintenance] 到达预定时间，自动开服')
        maintenance = {
          ...maintenance,
          isMaintenance: false,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system-auto',
        }
        persistAll()
        autoOpenTimer = null
      }, delay)
    }
  }
}

export function updateMaintenance(status: MaintenanceStatus): void {
  maintenance = status
  persistAll()
  setupAutoOpenServer()
}

export function reloadAll(): void {
  console.log('[Data] Reloading all data from disk...')
  
  const newUsers = loadMap<User>('users.json')
  const newUsersByUsername = loadMap<string>('usersByUsername.json')
  const newUsersByEmail = loadMap<string>('usersByEmail.json')
  const newInviteCodes = loadMap<InviteCode>('inviteCodes.json')
  const newCharts = loadMap<ChartData>('charts.json')
  const newAssets = loadMap<UploadedAsset>('assets.json')
  const newAnnouncements = loadMap<Announcement>('announcements.json')
  const newMaintenance = loadJson<MaintenanceStatus>('maintenance.json', defaultMaintenance)
  
  users.clear()
  for (const [k, v] of newUsers) users.set(k, v)
  
  usersByUsername.clear()
  for (const [k, v] of newUsersByUsername) usersByUsername.set(k, v)
  
  usersByEmail.clear()
  for (const [k, v] of newUsersByEmail) usersByEmail.set(k, v)
  
  inviteCodes.clear()
  for (const [k, v] of newInviteCodes) inviteCodes.set(k, v)
  
  charts.clear()
  for (const [k, v] of newCharts) charts.set(k, v)
  
  assets.clear()
  for (const [k, v] of newAssets) assets.set(k, v)
  
  announcements.clear()
  for (const [k, v] of newAnnouncements) announcements.set(k, v)
  
  maintenance = newMaintenance
  
  setupAutoOpenServer()
  
  console.log('[Data] Reload complete')
  console.log(`  Users: ${users.size}`)
  console.log(`  Charts: ${charts.size}`)
  console.log(`  Assets: ${assets.size}`)
  console.log(`  Invite codes: ${inviteCodes.size}`)
  console.log(`  Announcements: ${announcements.size}`)
  console.log(`  Maintenance: ${maintenance.isMaintenance ? 'ON' : 'OFF'}`)
}

setupAutoOpenServer()
