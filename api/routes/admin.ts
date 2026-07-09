/**
 * Admin routes: invite codes, user management, chart moderation.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { inviteCodes, users, usersByUsername, usersByEmail, charts, announcements, persistAll, maintenance, updateMaintenance } from '../store/index.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import type { Announcement } from '../../shared/types.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

/**
 * Generate invite codes.
 * POST /api/admin/invite-codes?count=5
 */
router.post('/invite-codes', (req: AuthenticatedRequest, res: Response): void => {
  const count = Math.min(Number(req.query.count) || 1, 100)
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()
    inviteCodes.set(code, {
      code,
      used: false,
      createdAt: new Date().toISOString(),
    })
    codes.push(code)
  }
  persistAll()
  res.json({ success: true, codes })
})

/**
 * List invite codes.
 * GET /api/admin/invite-codes
 */
router.get('/invite-codes', (req: AuthenticatedRequest, res: Response): void => {
  const list = Array.from(inviteCodes.values())
  res.json({ success: true, codes: list })
})

/**
 * Revoke an invite code.
 * DELETE /api/admin/invite-codes/:code
 */
router.delete('/invite-codes/:code', (req: AuthenticatedRequest, res: Response): void => {
  const { code } = req.params
  if (!inviteCodes.has(code)) {
    res.status(404).json({ success: false, error: 'Invite code not found' })
    return
  }
  inviteCodes.delete(code)
  persistAll()
  res.json({ success: true })
})

/**
 * List users.
 * GET /api/admin/users
 */
router.get('/users', (req: AuthenticatedRequest, res: Response): void => {
  const list = Array.from(users.values()).map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    disabled: u.disabled,
    createdAt: u.createdAt,
  }))
  res.json({ success: true, users: list })
})

/**
 * Delete a user.
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const user = users.get(id)
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }
  users.delete(id)
  usersByUsername.delete(user.username)
  usersByEmail.delete(user.email)
  persistAll()
  res.json({ success: true })
})

/**
 * Toggle user disabled state.
 * PATCH /api/admin/users/:id/toggle
 */
router.patch('/users/:id/toggle', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params
  const user = users.get(id)
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }
  user.disabled = !user.disabled
  users.set(id, user)
  persistAll()
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      disabled: user.disabled,
      createdAt: user.createdAt,
    },
  })
})

/**
 * List charts.
 * GET /api/admin/charts
 */
router.get('/charts', (req: AuthenticatedRequest, res: Response): void => {
  const list = Array.from(charts.values()).map((c) => ({
    id: c.id,
    songName: c.songName,
    bpm: c.bpm,
    difficulty: c.difficulty,
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    sceneCount: c.scenes.length,
  }))
  res.json({ success: true, charts: list })
})

/**
 * Delete a chart.
 * DELETE /api/admin/charts/:id
 */
router.delete('/charts/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params
  if (!charts.has(id)) {
    res.status(404).json({ success: false, error: 'Chart not found' })
    return
  }
  charts.delete(id)
  res.json({ success: true })
})

/**
 * Admin statistics.
 * GET /api/admin/stats
 */
router.get('/stats', (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    stats: {
      totalUsers: users.size,
      totalCharts: charts.size,
      totalInviteCodes: inviteCodes.size,
      usedInviteCodes: Array.from(inviteCodes.values()).filter((c) => c.used).length,
    },
  })
})

/**
 * Change admin's own password.
 * PATCH /api/admin/password
 */
router.patch('/password', (req: AuthenticatedRequest, res: Response): void => {
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) {
    res.status(400).json({ success: false, error: 'oldPassword and newPassword are required' })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ success: false, error: 'New password must be at least 6 characters' })
    return
  }
  const userId = req.user!.userId
  const user = users.get(userId)
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }
  const isMatch = bcrypt.compareSync(oldPassword, user.passwordHash)
  if (!isMatch) {
    res.status(400).json({ success: false, error: 'Old password is incorrect' })
    return
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10)
  users.set(userId, user)
  persistAll()
  res.json({ success: true })
})

router.get('/announcements', (req: AuthenticatedRequest, res: Response): void => {
  const list = Array.from(announcements.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  res.json({ success: true, announcements: list })
})

router.post('/announcements', (req: AuthenticatedRequest, res: Response): void => {
  const { title, content } = req.body
  if (!title || !content) {
    res.status(400).json({ success: false, error: 'title and content are required' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString()
  const createdBy = req.user!.userId

  for (const ann of announcements.values()) {
    ann.isActive = false
  }

  const announcement: Announcement = {
    id,
    title,
    content,
    createdAt: now,
    createdBy,
    isActive: true,
  }
  announcements.set(id, announcement)
  persistAll()
  res.json({ success: true, announcement })
})

router.put('/announcements/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params
  const announcement = announcements.get(id)
  if (!announcement) {
    res.status(404).json({ success: false, error: 'Announcement not found' })
    return
  }
  const { title, content, isActive } = req.body
  if (title !== undefined) announcement.title = title
  if (content !== undefined) announcement.content = content
  if (isActive !== undefined) {
    if (isActive) {
      for (const ann of announcements.values()) {
        ann.isActive = false
      }
    }
    announcement.isActive = isActive
  }
  announcements.set(id, announcement)
  persistAll()
  res.json({ success: true, announcement })
})

router.delete('/announcements/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params
  if (!announcements.has(id)) {
    res.status(404).json({ success: false, error: 'Announcement not found' })
    return
  }
  announcements.delete(id)
  persistAll()
  res.json({ success: true })
})

router.get('/maintenance', (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, maintenance })
})

router.put('/maintenance', (req: AuthenticatedRequest, res: Response): void => {
  const { isMaintenance, message, scheduledOpenTime } = req.body
  const now = new Date().toISOString()
  const updatedBy = req.user!.userId
  
  updateMaintenance({
    isMaintenance: Boolean(isMaintenance),
    message: message || '服务器维护中，请稍后再试',
    scheduledOpenTime: scheduledOpenTime || undefined,
    updatedAt: now,
    updatedBy,
  })
  
  res.json({ success: true, maintenance })
})

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../../data')
const BACKUP_KEY = 'stella-chart-backup-2026-secret-key'

function encryptData(data: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(BACKUP_KEY, 'salt', 32), iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(BACKUP_KEY, 'salt', 32), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

router.get('/backup/download', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const backupData: Record<string, unknown> = {}
    
    const files = ['users.json', 'usersByUsername.json', 'usersByEmail.json', 'inviteCodes.json', 'charts.json', 'assets.json', 'announcements.json', 'maintenance.json']
    for (const file of files) {
      const filePath = path.join(DATA_DIR, file)
      if (fs.existsSync(filePath)) {
        backupData[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      }
    }
    
    const jsonStr = JSON.stringify(backupData, null, 2)
    const encrypted = encryptData(jsonStr)
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `stella-backup-${timestamp}.stebak`
    
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(encrypted)
  } catch (err) {
    console.error('[Backup] Download failed:', err)
    res.status(500).json({ success: false, error: '备份下载失败' })
  }
})

router.post('/backup/restore', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { backupData } = req.body
    
    if (!backupData || typeof backupData !== 'string') {
      res.status(400).json({ success: false, error: '备份数据无效' })
      return
    }
    
    let decrypted: string
    try {
      decrypted = decryptData(backupData)
    } catch {
      res.status(400).json({ success: false, error: '备份文件解密失败，文件可能已损坏或不是有效的备份文件' })
      return
    }
    
    let data: Record<string, unknown>
    try {
      data = JSON.parse(decrypted)
    } catch {
      res.status(400).json({ success: false, error: '备份数据格式错误' })
      return
    }
    
    const filesToRestore = ['users.json', 'usersByUsername.json', 'usersByEmail.json', 'inviteCodes.json', 'charts.json', 'assets.json', 'announcements.json', 'maintenance.json']
    for (const file of filesToRestore) {
      if (data[file]) {
        const filePath = path.join(DATA_DIR, file)
        fs.writeFileSync(filePath, JSON.stringify(data[file], null, 2))
      }
    }
    
    process.exit(0)
    
    res.json({ success: true, message: '数据恢复成功，服务器正在重启...' })
  } catch (err) {
    console.error('[Backup] Restore failed:', err)
    res.status(500).json({ success: false, error: '数据恢复失败' })
  }
})

export default router
