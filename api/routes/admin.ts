/**
 * Admin routes: invite codes, user management, chart moderation.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { inviteCodes, users, usersByUsername, usersByEmail, charts, announcements, persistAll, maintenance, updateMaintenance, reloadAll, DATA_DIR } from '../store/index.js'
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

const BACKUP_KEY = process.env.BACKUP_KEY || 'stella-chart-backup-2026-secret-key'
const ASSETS_DIR = path.join(DATA_DIR, 'assets')
const BACKUP_MAGIC = Buffer.from('STBK')
const BACKUP_VERSION = 1

function deriveKey(password: string): Buffer {
  return crypto.scryptSync(password, 'stella-salt', 32)
}

function encryptBuffer(buffer: Buffer): Buffer {
  const key = deriveKey(BACKUP_KEY)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
  return Buffer.concat([BACKUP_MAGIC, Buffer.from([BACKUP_VERSION]), iv, encrypted])
}

function decryptBuffer(buffer: Buffer): Buffer {
  const magic = buffer.subarray(0, 4)
  if (!magic.equals(BACKUP_MAGIC)) {
    throw new Error('无效的备份文件格式')
  }
  const version = buffer[4]
  if (version !== BACKUP_VERSION) {
    throw new Error(`不支持的备份版本: ${version}`)
  }
  const iv = buffer.subarray(5, 21)
  const encrypted = buffer.subarray(21)
  const key = deriveKey(BACKUP_KEY)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

function writeUInt32LE(buffer: Buffer, offset: number, value: number): number {
  buffer.writeUInt32LE(value, offset)
  return offset + 4
}

function readUInt32LE(buffer: Buffer, offset: number): { value: number; offset: number } {
  return { value: buffer.readUInt32LE(offset), offset: offset + 4 }
}

function buildBackup(): Buffer {
  console.log('[Backup] Building backup...')
  
  const jsonFiles = ['users.json', 'usersByUsername.json', 'usersByEmail.json', 'inviteCodes.json', 'charts.json', 'assets.json', 'announcements.json', 'maintenance.json']
  const jsonData: Record<string, unknown> = {}
  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file)
    if (fs.existsSync(filePath)) {
      jsonData[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  }
  
  const jsonStr = JSON.stringify(jsonData)
  const jsonBuf = Buffer.from(jsonStr, 'utf8')
  
  let assetFiles: string[] = []
  if (fs.existsSync(ASSETS_DIR)) {
    assetFiles = fs.readdirSync(ASSETS_DIR)
  }
  
  let totalSize = 4 + jsonBuf.length + 4 + 4 * assetFiles.length
  for (const id of assetFiles) {
    totalSize += id.length + 8
    const filePath = path.join(ASSETS_DIR, id)
    totalSize += fs.statSync(filePath).size
  }
  
  const result = Buffer.alloc(totalSize)
  let offset = 0
  
  offset = writeUInt32LE(result, offset, jsonBuf.length)
  jsonBuf.copy(result, offset)
  offset += jsonBuf.length
  
  offset = writeUInt32LE(result, offset, assetFiles.length)
  
  for (const id of assetFiles) {
    const filePath = path.join(ASSETS_DIR, id)
    const idBuf = Buffer.from(id, 'utf8')
    offset = writeUInt32LE(result, offset, idBuf.length)
    idBuf.copy(result, offset)
    offset += idBuf.length
    
    const fileData = fs.readFileSync(filePath)
    result.writeBigUInt64LE(BigInt(fileData.length), offset)
    offset += 8
    fileData.copy(result, offset)
    offset += fileData.length
  }
  
  console.log(`[Backup] Build complete: ${jsonFiles.length} JSON files, ${assetFiles.length} assets, ${(result.length / 1024 / 1024).toFixed(2)} MB`)
  return result
}

function parseBackup(buffer: Buffer): { jsonData: Record<string, unknown>; assets: Array<{ id: string; data: Buffer }> } {
  let offset = 0
  
  const { value: jsonLen, offset: o1 } = readUInt32LE(buffer, offset)
  offset = o1
  const jsonBuf = buffer.subarray(offset, offset + jsonLen)
  offset += jsonLen
  const jsonData = JSON.parse(jsonBuf.toString('utf8'))
  
  const { value: assetCount, offset: o2 } = readUInt32LE(buffer, offset)
  offset = o2
  
  const assets: Array<{ id: string; data: Buffer }> = []
  for (let i = 0; i < assetCount; i++) {
    const { value: idLen, offset: o3 } = readUInt32LE(buffer, offset)
    offset = o3
    const id = buffer.subarray(offset, offset + idLen).toString('utf8')
    offset += idLen
    
    const dataLen = Number(buffer.readBigUInt64LE(offset))
    offset += 8
    const data = buffer.subarray(offset, offset + dataLen)
    offset += dataLen
    
    assets.push({ id, data })
  }
  
  return { jsonData, assets }
}

router.get('/backup/download', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = buildBackup()
    const encrypted = encryptBuffer(data)
    
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
})

router.post('/backup/restore', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '未上传备份文件' })
      return
    }
    
    console.log('[Backup] Restore started, file size:', (req.file.size / 1024 / 1024).toFixed(2), 'MB')
    
    let decrypted: Buffer
    try {
      decrypted = decryptBuffer(req.file.buffer)
    } catch (err) {
      console.error('[Backup] Decrypt failed:', err)
      res.status(400).json({ success: false, error: '备份文件解密失败，文件可能已损坏或不是有效的备份文件' })
      return
    }
    
    let parsed
    try {
      parsed = parseBackup(decrypted)
    } catch (err) {
      console.error('[Backup] Parse failed:', err)
      res.status(400).json({ success: false, error: '备份数据格式错误' })
      return
    }
    
    const { jsonData, assets } = parsed
    
    console.log(`[Backup] Parsed: ${Object.keys(jsonData).length} JSON files, ${assets.length} assets`)
    
    const filesToRestore = ['users.json', 'usersByUsername.json', 'usersByEmail.json', 'inviteCodes.json', 'charts.json', 'assets.json', 'announcements.json', 'maintenance.json']
    for (const file of filesToRestore) {
      if (jsonData[file]) {
        const filePath = path.join(DATA_DIR, file)
        fs.writeFileSync(filePath, JSON.stringify(jsonData[file], null, 2))
        console.log(`[Backup] Restored ${file}`)
      }
    }
    
    if (!fs.existsSync(ASSETS_DIR)) {
      fs.mkdirSync(ASSETS_DIR, { recursive: true })
    }
    for (const asset of assets) {
      const filePath = path.join(ASSETS_DIR, asset.id)
      fs.writeFileSync(filePath, asset.data)
    }
    console.log(`[Backup] Restored ${assets.length} asset files`)
    
    res.json({ success: true, message: '数据恢复成功，服务器正在重新加载数据...' })
    
    setTimeout(() => {
      try {
        reloadAll()
        console.log('[Backup] Data reload complete')
      } catch (err) {
        console.error('[Backup] Data reload failed:', err)
      }
    }, 500)
    
  } catch (err) {
    console.error('[Backup] Restore failed:', err)
    res.status(500).json({ success: false, error: '数据恢复失败：' + (err instanceof Error ? err.message : '未知错误') })
  }
})

export default router
