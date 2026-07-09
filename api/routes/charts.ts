/**
 * Chart CRUD routes.
 */

import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { charts, persistAll } from '../store/index.js'
import type { ChartData } from '../../shared/types.js'

const router = Router()

router.use(authMiddleware)

function defaultChart(userId: string): ChartData {
  return {
    id: uuidv4(),
    songName: 'Untitled',
    artist: '',
    charter: '',
    bpm: 120,
    difficulty: 5,
    offset: 0,
    scenes: [
      {
        id: uuidv4(),
        name: 'Scene 1',
        judgeBoxes: [
          {
            id: uuidv4(),
            name: 'Center',
            position: { x: 0, y: 0, z: 0 },
            spawnDistance: 10,
          },
        ],
        notes: [],
        sceneLinks: [],
        startTime: 0,
      },
    ],
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * List charts for current user.
 * GET /api/charts
 */
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.userId
  const list = Array.from(charts.values())
    .filter((c) => c.createdBy === userId)
    .map((c) => ({
      id: c.id,
      songName: c.songName,
      artist: c.artist,
      charter: c.charter,
      bpm: c.bpm,
      difficulty: c.difficulty,
      backgroundText: c.backgroundText,
      coverUrl: c.coverUrl,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  res.json({ success: true, charts: list })
})

/**
 * Create a new chart.
 * POST /api/charts
 */
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  const chart = defaultChart(req.user!.userId)
  if (req.body.songName) chart.songName = req.body.songName
  if (req.body.artist !== undefined) chart.artist = req.body.artist
  if (req.body.charter !== undefined) chart.charter = req.body.charter
  if (req.body.bpm) chart.bpm = Number(req.body.bpm)
  if (req.body.difficulty) chart.difficulty = Number(req.body.difficulty)
  if (req.body.offset !== undefined) chart.offset = Number(req.body.offset)
  if (req.body.backgroundText !== undefined) chart.backgroundText = req.body.backgroundText
  if (req.body.coverUrl) chart.coverUrl = req.body.coverUrl
  if (req.body.audioUrl) chart.audioUrl = req.body.audioUrl
  if (req.body.audioMd5) chart.audioMd5 = req.body.audioMd5
  if (req.body.scenes && Array.isArray(req.body.scenes)) {
    chart.scenes = req.body.scenes.map((scene: any) => ({
      ...scene,
      connections: scene.connections || [],
    }))
  }
  charts.set(chart.id, chart)
  persistAll()
  res.json({ success: true, chart })
})

/**
 * Get a chart.
 * GET /api/charts/:id
 */
router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const chart = charts.get(req.params.id)
  if (!chart || chart.createdBy !== req.user!.userId) {
    res.status(404).json({ success: false, error: 'Chart not found' })
    return
  }
  res.json({ success: true, chart })
})

/**
 * Update a chart.
 * PUT /api/charts/:id
 */
router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const chart = charts.get(req.params.id)
  if (!chart || chart.createdBy !== req.user!.userId) {
    res.status(404).json({ success: false, error: 'Chart not found' })
    return
  }
  const updated: ChartData = {
    ...req.body,
    id: chart.id,
    createdBy: chart.createdBy,
    createdAt: chart.createdAt,
    updatedAt: new Date().toISOString(),
  }
  charts.set(chart.id, updated)
  persistAll()
  res.json({ success: true, chart: updated })
})

/**
 * Delete a chart.
 * DELETE /api/charts/:id
 */
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const chart = charts.get(req.params.id)
  if (!chart || chart.createdBy !== req.user!.userId) {
    res.status(404).json({ success: false, error: 'Chart not found' })
    return
  }
  charts.delete(chart.id)
  persistAll()
  res.json({ success: true })
})

export default router
