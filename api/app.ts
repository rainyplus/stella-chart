/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import chartRoutes from './routes/charts.js'
import uploadRoutes from './routes/upload.js'
import exportRoutes from './routes/export.js'
import { assets, announcements, maintenance, DATA_DIR } from './store/index.js'
import { seedAdminUser } from './middleware/auth.js'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../shared/types.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

// seed admin user
seedAdminUser()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

/**
 * Public maintenance status endpoint (no auth required)
 */
app.get('/api/maintenance/status', (req: Request, res: Response): void => {
  res.json({ success: true, maintenance })
})

/**
 * Maintenance check middleware - blocks non-admin users during maintenance
 */
app.use('/api', (req: Request, res: Response, next: NextFunction): void => {
  if (!maintenance.isMaintenance) {
    next()
    return
  }
  
  const publicPaths = ['/maintenance/status', '/health', '/announcements/current', '/auth/login', '/auth/register', '/auth/captcha', '/auth/verify-captcha', '/auth/verify-slider', '/auth/me']
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    next()
    return
  }
  
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'meldchart-dev-secret-change-in-production'
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
      if (decoded.role === 'admin') {
        next()
        return
      }
    } catch {
      // invalid token, fall through
    }
  }
  
  res.status(503).json({
    success: false,
    error: 'MAINTENANCE_MODE',
    message: maintenance.message,
    maintenance: {
      isMaintenance: true,
      message: maintenance.message,
      scheduledOpenTime: maintenance.scheduledOpenTime,
    },
  })
})

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/charts', chartRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/export', exportRoutes)

/**
 * Public announcement endpoints
 */
app.get('/api/announcements/current', (req: Request, res: Response): void => {
  const list = Array.from(announcements.values())
  const active = list.find((a) => a.isActive)
  res.json({ success: true, announcement: active || null })
})

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * Serve uploaded assets directly at /api/assets/:id
 */
app.get('/api/assets/:id', (req: Request, res: Response): void => {
  const asset = assets.get(req.params.id)
  if (!asset) {
    res.status(404).json({ success: false, error: 'Asset not found' })
    return
  }
  const filePath = path.join(DATA_DIR, asset.filePath)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: 'Asset file not found' })
    return
  }
  res.setHeader('Content-Type', asset.mimeType)
  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
})

/**
 * Serve frontend static files in production
 */
const DIST_DIR = path.resolve(__dirname, '../dist')
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  
  app.get('*', (req: Request, res: Response): void => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ success: false, error: 'API not found' })
      return
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
} else {
  /**
   * 404 handler (dev mode without frontend build)
   */
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API not found',
    })
  })
}

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[server error]', error.message, error.stack)
  if ((error as { type?: string }).type === 'entity.too.large' || error.name === 'PayloadTooLargeError') {
    res.status(413).json({
      success: false,
      error: '文件过大，请上传小于 200MB 的文件',
    })
    return
  }
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

export default app
