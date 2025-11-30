import express from 'express'
import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  listProductsByVendor,
  uploadProductImagesHandler,
  deleteProductImageHandler
} from '../controllers/productController.js'

import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'
import { uploadProductImages } from '../middleware/uploadMiddleware.js'

const router = express.Router()

// Público
router.get('/vendor/:vendorId', listProductsByVendor)
router.get('/', listProducts)
router.get('/:id', getProductById)

// Upload de imagens (protegido - somente vendedor)
router.post(
  '/:id/images',
  authMiddleware,
  requireRole('vendedor'),
  uploadProductImages.array('images', 5),
  uploadProductImagesHandler
)

// rota para deletar imagem (body: { imageUrl: "..."} ou { imageFilename: "nome.jpg" })
router.delete('/:id/images', authMiddleware, requireRole('vendedor'), deleteProductImageHandler)

// Rotas protegidas (só vendedor pode criar/editar/excluir)
router.post('/', authMiddleware, requireRole('vendedor'), createProduct)
router.put('/:id', authMiddleware, requireRole('vendedor'), updateProduct)
router.delete('/:id', authMiddleware, requireRole('vendedor'), deleteProduct)

export default router
