/**
 * Export / import routes for the private MeldChart format.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { charts, assets } from '../store/index.js'
import type { ChartData } from '../../shared/types.js'

const router = Router()

router.use(authMiddleware)

const EXPORT_SECRET = process.env.EXPORT_SECRET || 'meldchart-export-secret'

function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/)
  return match ? match[1] : 'application/octet-stream'
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

/**
 * Export chart to encrypted private binary format.
 * POST /api/export/:id
 */
router.post('/:id', (req: AuthenticatedRequest, res: Response): void => {
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

    const payload = {
      version: '1.0.0',
      chart,
      audio: audioAsset?.dataUrl || null,
      cover: coverAsset?.dataUrl || null,
    }

    const json = JSON.stringify(payload)
    const encrypted = CryptoJS.AES.encrypt(json, EXPORT_SECRET).toString()
    const blob = Buffer.from(encrypted, 'utf-8')

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(chart.songName)}.selert"`)
    res.send(blob)
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
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  const { data } = req.body
  if (!data) {
    res.status(400).json({ success: false, error: 'data required' })
    return
  }
  try {
    const decrypted = CryptoJS.AES.decrypt(data, EXPORT_SECRET).toString(CryptoJS.enc.Utf8)
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

    // Re-create asset records if audio/cover included
    if (payload.audio) {
      const id = uuidv4()
      const base64 = payload.audio.split(',')[1] || payload.audio
      const buffer = Buffer.from(base64, 'base64')
      const md5 = CryptoJS.MD5(base64).toString()
      assets.set(id, {
        id,
        name: 'audio',
        mimeType: mimeTypeFromDataUrl(payload.audio),
        size: buffer.length,
        dataUrl: payload.audio,
        md5,
      })
      chart.audioUrl = `/api/assets/${id}`
    }
    if (payload.cover) {
      const id = uuidv4()
      const base64 = payload.cover.split(',')[1] || payload.cover
      const buffer = Buffer.from(base64, 'base64')
      const md5 = CryptoJS.MD5(base64).toString()
      assets.set(id, {
        id,
        name: 'cover',
        mimeType: mimeTypeFromDataUrl(payload.cover),
        size: buffer.length,
        dataUrl: payload.cover,
        md5,
      })
      chart.coverUrl = `/api/assets/${id}`
    }

    charts.set(chart.id, chart)
    res.json({ success: true, chart })
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid chart file' })
  }
})

export default router
