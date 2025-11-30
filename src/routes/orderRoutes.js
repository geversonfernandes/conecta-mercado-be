import express from 'express'
import {
  checkout,
  listOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder
} from '../controllers/orderController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authMiddleware)

router.post('/checkout', checkout)
router.get('/', listOrders)
router.get('/:id', getOrder)
router.patch('/:id/status', updateOrderStatus)
router.post('/:id/cancel', cancelOrder)

export default router
