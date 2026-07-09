import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { JwtPayload, UserRole } from '../../shared/types.js'
import { users, usersByUsername, usersByEmail, persistAll } from '../store/index.js'

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload
}

const JWT_SECRET = process.env.JWT_SECRET || 'meldchart-dev-secret-change-in-production'

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid token' })
    return
  }
  req.user = payload
  next()
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }
    next()
  }
}

export function seedAdminUser(): void {
  const id = 'admin-seed'
  const needsSave = !users.has(id)
  if (!users.has(id)) {
    const admin = {
      id,
      username: 'admin',
      email: 'admin@meldchart.local',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin' as const,
      disabled: false,
      createdAt: new Date().toISOString(),
    }
    users.set(id, admin)
  }
  usersByUsername.set('admin', id)
  usersByEmail.set('admin@meldchart.local', id)
  if (needsSave) {
    persistAll()
  }
}
