import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'

// POST /api/v1/checkout  -> cria order a partir do cart
export const checkout = async (req, res) => {
  try {
    const buyerId = req.user?.id
    const cart = await Cart.findOne({ userId: buyerId })
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Carrinho vazio.' })

    // verificar estoque e montar items
    const orderItems = []
    for (const it of cart.items) {
      const product = await Product.findById(it.productId)
      if (!product) return res.status(404).json({ message: `Produto ${it.productId} não encontrado.` })
      if (product.stock < it.qty) return res.status(400).json({ message: `Estoque insuficiente para ${product.title}.` })
      orderItems.push({ productId: it.productId, title: product.title, qty: it.qty, unitPrice: it.unitPrice })
    }

    const total = orderItems.reduce((s, it) => s + (it.qty * it.unitPrice), 0)

    // decrementar estoque com base em orderItems
    for (const item of orderItems) {
      const product = await Product.findById(item.productId)
      if (!product) throw new Error('Produto não encontrado ao decrementar estoque')
      product.stock = Math.max(0, product.stock - item.qty)
      if (product.stock <= 0) product.status = 'sem_estoque'
      await product.save()
    }

    const order = new Order({
      buyerId,
      items: orderItems,
      total,
      status: 'pendente',
      payment: { method: 'pix', status: 'pending' }
    })
    await order.save()

    // remover carrinho
    await Cart.findOneAndDelete({ userId: buyerId })

    return res.status(201).json({ message: 'Pedido criado.', order })
  } catch (err) {
    console.error('checkout err', err)
    return res.status(500).json({ message: 'Erro ao criar pedido.' })
  }
}

// GET /api/v1/orders  - clientes veem seus pedidos; vendedores veem pedidos que contêm seus produtos
export const listOrders = async (req, res) => {
  try {
    const user = req.user
    if (user.role === 'vendedor') {
      // encontrar orders que contenham produtos do vendedor
      const products = await Product.find({ vendorId: user.id }).select('_id')
      const productIds = products.map(p => String(p._id))
      const orders = await Order.find({ 'items.productId': { $in: productIds } })
      return res.json({ orders })
    } else {
      const orders = await Order.find({ buyerId: user.id })
      return res.json({ orders })
    }
  } catch (err) {
    console.error('listOrders err', err)
    return res.status(500).json({ message: 'Erro ao listar pedidos.' })
  }
}

// GET /api/v1/orders/:id
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params
    const order = await Order.findById(id)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado.' })

    const user = req.user
    // autorização: buyer ou vendedor dono de algum item
    if (String(order.buyerId) !== String(user.id) && user.role !== 'vendedor') {
      // se vendedor, verificar se algum item pertence a ele
      if (user.role === 'vendedor') {
        const products = await Product.find({ vendorId: user.id }).select('_id')
        const productIds = products.map(p => String(p._id))
        const contains = order.items.some(i => productIds.includes(String(i.productId)))
        if (!contains) return res.status(403).json({ message: 'Acesso negado.' })
      } else {
        return res.status(403).json({ message: 'Acesso negado.' })
      }
    }

    return res.json({ order })
  } catch (err) {
    console.error('getOrder err', err)
    return res.status(500).json({ message: 'Erro ao obter pedido.' })
  }
}

// PATCH /api/v1/orders/:id/status  { status }
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const allowed = ['pendente','pago','em_transito','entregue','cancelado']
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Status inválido.' })

    const order = await Order.findById(id)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado.' })

    // apenas vendedor (que tem produtos no order) ou o comprador pode atualizar para determinados status
    const user = req.user
    if (user.role === 'vendedor') {
      // verificar pertencimento
      const products = await Product.find({ vendorId: user.id }).select('_id')
      const productIds = products.map(p => String(p._id))
      const contains = order.items.some(i => productIds.includes(String(i.productId)))
      if (!contains) return res.status(403).json({ message: 'Acesso negado.' })
    } else if (String(order.buyerId) !== String(user.id)) {
      return res.status(403).json({ message: 'Acesso negado.' })
    }

    order.status = status
    await order.save()
    return res.json({ message: 'Status atualizado.', order })
  } catch (err) {
    console.error('updateOrderStatus err', err)
    return res.status(500).json({ message: 'Erro ao atualizar status.' })
  }
}

// POST /api/v1/orders/:id/cancel
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params
    const order = await Order.findById(id)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado.' })

    const user = req.user
    if (String(order.buyerId) !== String(user.id)) return res.status(403).json({ message: 'Apenas comprador pode cancelar.' })
    if (order.status !== 'pendente') return res.status(400).json({ message: 'Pedido não pode ser cancelado.' })

    // devolver estoque
    for (const it of order.items) {
      await Product.findByIdAndUpdate(it.productId, { $inc: { stock: it.qty } })
    }

    order.status = 'cancelado'
    order.payment.status = 'failed'
    await order.save()
    return res.json({ message: 'Pedido cancelado.', order })
  } catch (err) {
    console.error('cancelOrder err', err)
    return res.status(500).json({ message: 'Erro ao cancelar pedido.' })
  }
}
