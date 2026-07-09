/**
 * Authentication routes with invite code + two human verification steps.
 */

import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { authMiddleware, generateToken, seedAdminUser } from '../middleware/auth.js'
import { users, usersByUsername, usersByEmail, inviteCodes, verificationSessions, persistAll } from '../store/index.js'
import type { PublicUser, VerificationSession } from '../../shared/types.js'

seedAdminUser()

const router = Router()

function toPublicUser(user: { id: string; username: string; email: string; role: 'user' | 'admin'; disabled: boolean; createdAt: string }): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    disabled: user.disabled,
    createdAt: user.createdAt,
  }
}

/**
 * Generate a simple SVG captcha and store the answer in a verification session.
 * POST /api/auth/captcha
 */
router.post('/captcha', (req: Request, res: Response): void => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let answer = ''
  for (let i = 0; i < 4; i++) {
    answer += chars[Math.floor(Math.random() * chars.length)]
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
    <rect width="120" height="40" fill="#f3f4f6"/>
    ${answer.split('').map((ch, i) => `<text x="${20 + i * 24}" y="28" font-family="monospace" font-size="22" fill="#374151" transform="rotate(${Math.random() * 20 - 10} ${20 + i * 24} 20)">${ch}</text>`).join('')}
  </svg>`
  const session: VerificationSession = {
    id: uuidv4(),
    captchaPassed: false,
    captchaAnswer: answer.toUpperCase(),
    sliderPassed: false,
    createdAt: Date.now(),
  }
  verificationSessions.set(session.id, session)
  res.json({ success: true, sessionId: session.id, svg })
})

/**
 * Verify captcha answer.
 * POST /api/auth/verify-captcha
 */
router.post('/verify-captcha', (req: Request, res: Response): void => {
  const { sessionId, answer } = req.body
  const session = verificationSessions.get(sessionId)
  if (!session) {
    res.status(400).json({ success: false, error: 'Session expired' })
    return
  }
  if (answer?.toUpperCase() !== session.captchaAnswer) {
    res.status(400).json({ success: false, error: 'Incorrect captcha' })
    return
  }
  session.captchaPassed = true
  verificationSessions.set(sessionId, session)
  res.json({ success: true })
})

/**
 * Verify slider / puzzle behavior.
 * POST /api/auth/verify-slider
 */
router.post('/verify-slider', (req: Request, res: Response): void => {
  const { sessionId, token } = req.body
  const session = verificationSessions.get(sessionId)
  if (!session) {
    res.status(400).json({ success: false, error: 'Session expired' })
    return
  }
  // Demo: accept any non-empty token as passed.
  if (!token) {
    res.status(400).json({ success: false, error: 'Slider token required' })
    return
  }
  session.sliderPassed = true
  verificationSessions.set(sessionId, session)
  res.json({ success: true })
})

/**
 * Register with invite code + completed verification session.
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password, inviteCode, sessionId } = req.body
  const session = verificationSessions.get(sessionId)
  if (!session || !session.captchaPassed || !session.sliderPassed) {
    res.status(400).json({ success: false, error: 'Please complete all verification steps' })
    return
  }
  const code = inviteCodes.get(inviteCode)
  if (!code || code.used) {
    res.status(400).json({ success: false, error: 'Invalid or used invite code' })
    return
  }
  if (usersByUsername.has(username)) {
    res.status(400).json({ success: false, error: 'Username already exists' })
    return
  }
  if (usersByEmail.has(email)) {
    res.status(400).json({ success: false, error: 'Email already exists' })
    return
  }
  const id = uuidv4()
  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id,
    username,
    email,
    passwordHash,
    role: 'user' as const,
    disabled: false,
    createdAt: new Date().toISOString(),
  }
  users.set(id, user)
  usersByUsername.set(username, id)
  usersByEmail.set(email, id)
  code.used = true
  code.usedBy = id
  inviteCodes.set(inviteCode, code)
  verificationSessions.delete(sessionId)
  persistAll()
  res.json({ success: true, user: toPublicUser(user) })
})

/**
 * Login.
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { account, password } = req.body
  const userId = usersByUsername.get(account) || usersByEmail.get(account)
  if (!userId) {
    res.status(401).json({ success: false, error: 'Invalid credentials' })
    return
  }
  const user = users.get(userId)
  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid credentials' })
    return
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' })
    return
  }
  if (user.disabled) {
    res.status(403).json({ success: false, error: 'Account disabled' })
    return
  }
  const token = generateToken({ userId: user.id, username: user.username, role: user.role })
  res.json({ success: true, token, user: toPublicUser(user) })
})

/**
 * Get current user.
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const user = users.get(req.user!.userId)
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }
  res.json({ success: true, user: toPublicUser(user) })
})

export default router
