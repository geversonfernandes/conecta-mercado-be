import express from 'express'
import { body } from 'express-validator'
import {
  getCart,
  addToCart,
  updateCart,
  removeCartItem,
  clearCart
} from '../controllers/cartController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('cliente'))

router.get('/', getCart)
router.post('/', [ body('productId').notEmpty(), body('qty').isInt({ min: 1 }) ], addToCart)
router.put('/', updateCart)
router.delete('/items/:productId', removeCartItem)
router.delete('/', clearCart)

export default router
