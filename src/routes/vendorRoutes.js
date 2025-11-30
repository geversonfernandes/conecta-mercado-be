import express from 'express'
import { getVendorDashboard } from '../controllers/vendorController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/dashboard', authMiddleware, requireRole('vendedor'), getVendorDashboard)

export default router
