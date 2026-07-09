/**
 * Upload routes for audio and cover images.
 * Uses multer for streaming file uploads to minimize memory usage.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { assets, persistAll, DATA_DIR } from '../store/index.js'

const router = Router()

router.use(authMiddleware)

const ASSETS_DIR = path.join(DATA_DIR, 'assets')

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ASSETS_DIR)
  },
  filename: (_req, _file, cb) => {
    const id = uuidv4()
    cb(null, id)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
})

function md5File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

async function saveAsset(
  name: string,
  mimeType: string,
  filePath: string,
  size: number,
): Promise<{ id: string; url: string; md5: string }> {
  const id = path.basename(filePath)
  const md5 = await md5File(filePath)
  const relPath = path.relative(DATA_DIR, filePath)

  assets.set(id, {
    id,
    name,
    mimeType,
    size,
    filePath: relPath,
    md5,
  })
  persistAll()
  return { id, url: `/api/assets/${id}`, md5 }
}

/**
 * Upload audio.
 * POST /api/upload/audio
 */
router.post(
  '/audio',
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' })
        return
      }
      const name = (req.body.name as string) || req.file.originalname
      const result = await saveAsset(name, req.file.mimetype, req.file.path, req.file.size)
      res.json({ success: true, ...result })
    } catch (err) {
      console.error('[upload audio error]', err)
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      })
    }
  },
)

/**
 * Upload cover image.
 * POST /api/upload/cover
 */
router.post(
  '/cover',
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' })
        return
      }
      const name = (req.body.name as string) || req.file.originalname
      const result = await saveAsset(name, req.file.mimetype, req.file.path, req.file.size)
      res.json({ success: true, ...result })
    } catch (err) {
      console.error('[upload cover error]', err)
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      })
    }
  },
)

/**
 * Serve asset by id.
 * GET /api/assets/:id
 */
router.get('/assets/:id', (req: Request, res: Response): void => {
  const asset = assets.get(req.params.id)
  if (!asset) {
    res.status(404).json({ success: false, error: 'Asset not found' })
    return
  }
  const filePath = path.join(DATA_DIR, asset.filePath)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: 'File not found on disk' })
    return
  }
  res.setHeader('Content-Type', asset.mimeType)
  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
  stream.on('error', (err) => {
    console.error('[asset stream error]', err)
    res.status(500).end()
  })
})

export default router
