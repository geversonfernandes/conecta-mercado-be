import Product from '../models/Product.js'
import { validationResult } from 'express-validator'
import cloudinary from '../config/cloudinary.js'

// POST /api/v1/products
export const createProduct = async (req, res) => {
  // req.user deve existir (authMiddleware)
  try {
    // validação via express-validator (se usada)
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { title, description, price, stock, category } = req.body
    const vendorId = req.user?.id

    if (!vendorId) return res.status(401).json({ message: 'Usuário não autenticado.' })

    const product = new Product({
      vendorId,
      title,
      description,
      price: Number(price),
      stock: stock ? Number(stock) : 0,
      category,
      images: [] // você pode popular via endpoint de upload posteriormente
    })

    await product.save()
    return res.status(201).json({ message: 'Produto criado', product })
  } catch (error) {
    console.error('Erro createProduct:', error)
    return res.status(500).json({ message: 'Erro interno ao criar produto.' })
  }
}

// GET /api/v1/products
export const listProducts = async (req, res) => {
  try {
    // filtros simples via query params
    const { search, category, minPrice, maxPrice, page = 1, limit = 12, sort = '-createdAt' } = req.query
    const filter = {}

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    if (category) filter.category = category
    if (minPrice) filter.price = { ...(filter.price || {}), $gte: Number(minPrice) }
    if (maxPrice) filter.price = { ...(filter.price || {}), $lte: Number(maxPrice) }
    filter.status = 'anunciado' // por padrão só mostra produtos anunciados

    const skip = (Number(page) - 1) * Number(limit)
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter)
    ])

    return res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Erro listProducts:', error)
    return res.status(500).json({ message: 'Erro ao listar produtos.' })
  }
}

// GET /api/v1/products/:id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id).populate('vendorId', 'name email')
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })
    return res.json(product)
  } catch (error) {
    console.error('Erro getProductById:', error)
    return res.status(500).json({ message: 'Erro ao buscar produto.' })
  }
}

// PUT /api/v1/products/:id
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.user?.id
    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })

    // somente o dono (vendedor) pode editar
    if (String(product.vendorId) !== String(vendorId)) {
      return res.status(403).json({ message: 'Acesso negado. Você não é o dono deste produto.' })
    }

    const { title, description, price, stock, category, status } = req.body

    product.title = title ?? product.title
    product.description = description ?? product.description
    product.price = price !== undefined ? Number(price) : product.price
    product.stock = stock !== undefined ? Number(stock) : product.stock
    product.category = category ?? product.category
    if (status) product.status = status

    await product.save()
    return res.json({ message: 'Produto atualizado com sucesso.', product })
  } catch (error) {
    console.error('Erro updateProduct:', error)
    return res.status(500).json({ message: 'Erro ao atualizar produto.' })
  }
}

// DELETE /api/v1/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.user?.id
    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })

    if (String(product.vendorId) !== String(vendorId)) {
      return res.status(403).json({ message: 'Acesso negado. Você não é o dono deste produto.' })
    }

    await product.deleteOne()
    return res.json({ message: 'Produto deletado com sucesso.' })
  } catch (error) {
    console.error('Erro deleteProduct:', error)
    return res.status(500).json({ message: 'Erro ao deletar produto.' })
  }
}

// GET /api/v1/vendors/:vendorId/products  (opcional / útil para dashboard)
export const listProductsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params
    const items = await Product.find({ vendorId })
    return res.json({ items })
  } catch (error) {
    console.error('Erro listProductsByVendor:', error)
    return res.status(500).json({ message: 'Erro ao listar produtos do vendedor.' })
  }
}

// POST /api/v1/products/:id/images
// aceita múltiplos arquivos com campo 'images' (max conforme rota)
export const uploadProductImagesHandler = async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.user?.id

    console.log(id);
    console.log(vendorId)

    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })

    if (String(product.vendorId) !== String(vendorId)) {
      return res.status(403).json({ message: 'Acesso negado. Você não é o dono deste produto.' })
    }

    const files = req.files || []
    if (files.length === 0) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada.' })
    }

    const uploadedImages = files.map(f => ({
      url: f.path,          // secure_url do Cloudinary
      publicId: f.filename  // public_id do Cloudinary
    }))

    // adiciona ao array do produto
    product.images = [...product.images, ...uploadedImages]
    await product.save()

    return res.json({
      message: 'Imagens enviadas com sucesso.',
      images: product.images
    })
  } catch (error) {
    console.error('Erro uploadProductImagesHandler:', error)
    return res.status(500).json({ message: 'Erro ao enviar imagens.' })
  }
}

// DELETE /api/v1/products/:id/images
// Body JSON: { "imageUrl": "..."}  ou { "imageFilename": "nome.jpg" }
export const deleteProductImageHandler = async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.user?.id
    const { publicId } = req.body

    if (!publicId) {
      return res.status(400).json({ message: 'Informe publicId da imagem.' })
    }

    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })

    if (String(product.vendorId) !== String(vendorId)) {
      return res.status(403).json({ message: 'Acesso negado.' })
    }

    // Remover do Cloudinary
    await cloudinary.uploader.destroy(publicId)

    // Remover do array
    product.images = product.images.filter(img => img.publicId !== publicId)
    await product.save()

    return res.json({ message: 'Imagem removida.', images: product.images })
  } catch (error) {
    console.error('Erro deleteProductImageHandler:', error)
    return res.status(500).json({ message: 'Erro ao remover imagem.' })
  }
}
