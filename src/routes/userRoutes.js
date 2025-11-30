import express from 'express'
import {
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
} from '../controllers/userController.js'

import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = express.Router()

// Registrar usuário (cliente ou vendedor)
router.post('/register', createUser)

// Login e logout (públicos)
router.post('/login', loginUser)
router.post('/logout', logoutUser)

// A partir daqui: rotas que exigem token
router.put('/users/:id', authMiddleware, updateUser)
router.delete('/users/:id', authMiddleware, deleteUser)

export default router