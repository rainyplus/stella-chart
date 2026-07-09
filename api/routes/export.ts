/**
 * Export / import routes for the private STELLA chart format.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { charts, assets, persistAll, DATA_DIR } from '../store/index.js'
import type { ChartData } from '../../shared/types.js'

const router = Router()

router.use(authMiddleware)

const EXPORT_SECRET = process.env.EXPORT_SECRET || 'stella-chart-export-secret'
const ALGORITHM = 'aes-256-cbc'

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest()
}

function validateChart(chart: ChartData): string | null {
  for (const scene of chart.scenes) {
    for (const note of scene.notes) {
      if (note.type === 'Stalid' && note.pathNodes.length < 2) {
        return `Stalid note ${note.id} has fewer than 2 path nodes`
      }
      if (note.type === 'Hold' && note.holdDuration < 0) {
        return `Hold note ${note.id} has negative duration`
      }
    }
  }
  return null
}

function encryptBuffer(buffer: Buffer): Buffer {
  const key = deriveKey(EXPORT_SECRET)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
  return Buffer.concat([iv, encrypted])
}

function decryptBuffer(buffer: Buffer): Buffer {
  const iv = buffer.subarray(0, 16)
  const encrypted = buffer.subarray(16)
  const key = deriveKey(EXPORT_SECRET)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

function md5File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Export chart to encrypted private binary format.
 * POST /api/export/:id
 */
router.post('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const chart = charts.get(req.params.id)
    if (!chart || chart.createdBy !== req.user!.userId) {
      res.status(404).json({ success: false, error: 'Chart not found' })
      return
    }
    const error = validateChart(chart)
    if (error) {
      res.status(400).json({ success: false, error })
      return
    }

    const audioAsset = chart.audioUrl ? assets.get(chart.audioUrl.replace('/api/assets/', '')) : undefined
    const coverAsset = chart.coverUrl ? assets.get(chart.coverUrl.replace('/api/assets/', '')) : undefined

    let audioData: string | null = null
    let coverData: string | null = null

    if (audioAsset) {
      const audioPath = path.join(DATA_DIR, audioAsset.filePath)
      if (fs.existsSync(audioPath)) {
        const buffer = fs.readFileSync(audioPath)
        audioData = `data:${audioAsset.mimeType};base64,${buffer.toString('base64')}`
      }
    }

    if (coverAsset) {
      const coverPath = path.join(DATA_DIR, coverAsset.filePath)
      if (fs.existsSync(coverPath)) {
        const buffer = fs.readFileSync(coverPath)
        coverData = `data:${coverAsset.mimeType};base64,${buffer.toString('base64')}`
      }
    }

    const payload = {
      version: '1.0.0',
      chart,
      audio: audioData,
      cover: coverData,
    }

    const json = JSON.stringify(payload)
    const encrypted = encryptBuffer(Buffer.from(json, 'utf-8'))

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(chart.songName)}.selert"`)
    res.send(encrypted)
  } catch (err) {
    console.error('[export error]', err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    })
  }
})

/**
 * Import private chart binary.
 * POST /api/import
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let encryptedData: Buffer

    if (req.is('multipart/form-data')) {
      const multer = (await import('multer')).default
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } })
      await new Promise<void>((resolve, reject) => {
        upload.single('file')(req as Request, res as Response, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' })
        return
      }
      encryptedData = req.file.buffer
    } else {
      const { data } = req.body
      if (!data) {
        res.status(400).json({ success: false, error: 'data required' })
        return
      }
      encryptedData = Buffer.from(data, 'base64')
    }

    const decrypted = decryptBuffer(encryptedData).toString('utf-8')
    if (!decrypted) {
      throw new Error('Failed to decrypt')
    }
    const payload = JSON.parse(decrypted)
    const chart: ChartData = payload.chart
    chart.id = uuidv4()
    chart.createdBy = req.user!.userId
    chart.createdAt = new Date().toISOString()
    chart.updatedAt = chart.createdAt

    if (chart.artist === undefined) chart.artist = ''
    if (chart.charter === undefined) chart.charter = ''
    if (chart.scenes && Array.isArray(chart.scenes)) {
      chart.scenes = chart.scenes.map((scene) => ({
        ...scene,
        sceneLinks: scene.sceneLinks || [],
      }))
    }

    const assetsDir = path.join(DATA_DIR, 'assets')
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true })
    }

    if (payload.audio) {
      const id = uuidv4()
      const commaIndex = payload.audio.indexOf(',')
      const base64 = commaIndex >= 0 ? payload.audio.substring(commaIndex + 1) : payload.audio
      const mimeMatch = payload.audio.match(/^data:([^;]+);base64,/)
      const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mpeg'
      const buffer = Buffer.from(base64, 'base64')
      const filePath = path.join(assetsDir, id)
      fs.writeFileSync(filePath, buffer)
      const md5 = await md5File(filePath)
      const relPath = path.relative(DATA_DIR, filePath)

      assets.set(id, {
        id,
        name: 'audio',
        mimeType,
        size: buffer.length,
        filePath: relPath,
        md5,
      })
      chart.audioUrl = `/api/assets/${id}`
    }
    if (payload.cover) {
      const id = uuidv4()
      const commaIndex = payload.cover.indexOf(',')
      const base64 = commaIndex >= 0 ? payload.cover.substring(commaIndex + 1) : payload.cover
      const mimeMatch = payload.cover.match(/^data:([^;]+);base64,/)
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      const buffer = Buffer.from(base64, 'base64')
      const filePath = path.join(assetsDir, id)
      fs.writeFileSync(filePath, buffer)
      const md5 = await md5File(filePath)
      const relPath = path.relative(DATA_DIR, filePath)

      assets.set(id, {
        id,
        name: 'cover',
        mimeType,
        size: buffer.length,
        filePath: relPath,
        md5,
      })
      chart.coverUrl = `/api/assets/${id}`
    }

    charts.set(chart.id, chart)
    persistAll()
    res.json({ success: true, chart })
  } catch (err) {
    console.error('[import error]', err)
    res.status(400).json({ success: false, error: 'Invalid chart file' })
  }
})

export default router
