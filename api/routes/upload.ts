/**
 * Upload routes for audio and cover images.
 * Stores base64 data URLs in memory for demo purposes.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { assets, persistAll } from '../store/index.js'

const router = Router()

router.use(authMiddleware)

function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/)
  return match ? match[1] : 'application/octet-stream'
}

function saveAsset(name: string, dataUrl: string): { id: string; url: string; md5: string } {
  const id = uuidv4()
  const commaIndex = dataUrl.indexOf(',')
  const base64 = commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl
  if (!base64) {
    throw new Error('Empty base64 data')
  }
  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, 'base64')
  } catch {
    throw new Error('Invalid base64 data')
  }
  const md5 = CryptoJS.MD5(base64).toString()
  assets.set(id, {
    id,
    name,
    mimeType: mimeTypeFromDataUrl(dataUrl),
    size: buffer.length,
    dataUrl,
    md5,
  })
  persistAll()
  return { id, url: `/api/assets/${id}`, md5 }
}

/**
 * Upload audio.
 * POST /api/upload/audio
 */
router.post('/audio', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, dataUrl } = req.body
    if (!name || !dataUrl) {
      res.status(400).json({ success: false, error: 'name and dataUrl required' })
      return
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      res.status(400).json({ success: false, error: 'Invalid dataUrl format' })
      return
    }
    const result = saveAsset(name, dataUrl)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[upload audio error]', err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    })
  }
})

/**
 * Upload cover image.
 * POST /api/upload/cover
 */
router.post('/cover', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, dataUrl } = req.body
    if (!name || !dataUrl) {
      res.status(400).json({ success: false, error: 'name and dataUrl required' })
      return
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      res.status(400).json({ success: false, error: 'Invalid dataUrl format' })
      return
    }
    const result = saveAsset(name, dataUrl)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[upload cover error]', err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    })
  }
})

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
  const base64 = asset.dataUrl.split(',')[1] || asset.dataUrl
  const buffer = Buffer.from(base64, 'base64')
  res.setHeader('Content-Type', asset.mimeType)
  res.send(buffer)
})

export default router
