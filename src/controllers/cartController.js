import { validationResult } from 'express-validator'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'

// GET /api/v1/cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id
    const cart = await Cart.findOne({ userId }).populate('items.productId', 'title images price')
    if (!cart) return res.json({ items: [], total: 0 })
    return res.json(cart)
  } catch (err) {
    console.error('getCart err', err)
    return res.status(500).json({ message: 'Erro ao obter carrinho.' })
  }
}

// POST /api/v1/cart  { productId, qty }
export const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const userId = req.user?.id
    const { productId, qty } = req.body

    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' })
    if (product.stock < qty) return res.status(400).json({ message: 'Estoque insuficiente.' })

    let cart = await Cart.findOne({ userId })
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 })
    }

    const existingIdx = cart.items.findIndex(i => String(i.productId) === String(productId))
    if (existingIdx > -1) {
      cart.items[existingIdx].qty += qty
      cart.items[existingIdx].unitPrice = product.price
    } else {
      cart.items.push({ productId, qty, unitPrice: product.price })
    }

    cart.total = cart.items.reduce((s, it) => s + (it.qty * it.unitPrice), 0)
    await cart.save()
    return res.status(200).json({ message: 'Item adicionado ao carrinho.', cart })
  } catch (err) {
    console.error('addToCart err', err)
    return res.status(500).json({ message: 'Erro ao adicionar ao carrinho.' })
  }
}

// PUT /api/v1/cart  { items: [{ productId, qty }] }
export const updateCart = async (req, res) => {
  try {
    const userId = req.user?.id
    const { items } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items deve ser um array.' })

    // validate stock and build items
    const builtItems = []
    for (const it of items) {
      const product = await Product.findById(it.productId)
      if (!product) return res.status(404).json({ message: `Produto ${it.productId} não encontrado.` })
      if (product.stock < it.qty) return res.status(400).json({ message: `Estoque insuficiente para ${product.title}.` })
      builtItems.push({ productId: it.productId, qty: it.qty, unitPrice: product.price })
    }

    let cart = await Cart.findOne({ userId })
    if (!cart) cart = new Cart({ userId, items: [], total: 0 })

    cart.items = builtItems
    cart.total = builtItems.reduce((s, it) => s + (it.qty * it.unitPrice), 0)
    await cart.save()
    return res.json({ message: 'Carrinho atualizado.', cart })
  } catch (err) {
    console.error('updateCart err', err)
    return res.status(500).json({ message: 'Erro ao atualizar carrinho.' })
  }
}

// DELETE /api/v1/cart/items/:productId
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user?.id
    const { productId } = req.params
    const cart = await Cart.findOne({ userId })
    if (!cart) return res.status(404).json({ message: 'Carrinho não encontrado.' })

    cart.items = cart.items.filter(i => String(i.productId) !== String(productId))
    cart.total = cart.items.reduce((s, it) => s + (it.qty * it.unitPrice), 0)
    await cart.save()
    return res.json({ message: 'Item removido.', cart })
  } catch (err) {
    console.error('removeCartItem err', err)
    return res.status(500).json({ message: 'Erro ao remover item.' })
  }
}

// DELETE /api/v1/cart  -> esvaziar
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id
    await Cart.findOneAndDelete({ userId })
    return res.json({ message: 'Carrinho esvaziado.' })
  } catch (err) {
    console.error('clearCart err', err)
    return res.status(500).json({ message: 'Erro ao esvaziar carrinho.' })
  }
}
