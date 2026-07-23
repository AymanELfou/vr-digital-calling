import { Router } from 'express'
import { authService } from './auth.service'
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema'
import { authenticate } from '../../middleware/auth.middleware'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body)
  const data = await authService.register(input, res)
  res.status(201).json(data)
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body)
  const data = await authService.login(input, res)
  res.json(data)
})

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  authService.logout(res)
  res.json({ message: 'Logged out successfully' })
})

// GET /api/auth/me — returns current user data (used on app reload)
router.get('/me', authenticate, async (req, res) => {
  const data = await authService.getMe(req.user!.sub)
  res.json(data)
})

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)
  await authService.changePassword(req.user!.sub, currentPassword, newPassword)
  res.json({ message: 'Password changed successfully' })
})

export { router as authRouter }
