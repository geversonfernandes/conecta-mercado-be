import express from 'express'
import { createPix, webhook, getPaymentStatus } from '../controllers/paymentController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/create-pix', authMiddleware, createPix)
router.post('/webhook', webhook)
router.get('/:orderId/status', authMiddleware, getPaymentStatus)

export default router
