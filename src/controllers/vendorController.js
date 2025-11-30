import Product from '../models/Product.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import mongoose from 'mongoose'

/**
 * GET /api/v1/vendor/dashboard
 * Retorna estatísticas e resumo para o vendedor autenticado
 */
export const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.user?.id
    if (!vendorId) return res.status(401).json({ message: 'Não autenticado.' })

    // 1) total de produtos anunciados
    const totalProducts = await Product.countDocuments({ vendorId: vendorId })

    // 2) obter lista de productIds do vendedor (ObjectIds)
    const products = await Product.find({ vendorId: vendorId }).select('_id title')
    const productIds = products.map(p => p._id)

    // 3) total de pedidos que contêm ao menos um produto do vendedor
    const ordersWithVendorItems = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      { $group: { _id: '$_id' } }, // agrupa por order id
      { $count: 'ordersCount' }
    ])
    const totalOrders = ordersWithVendorItems.length ? ordersWithVendorItems[0].ordersCount : 0

    // 4) total de pedidos pendentes (status = 'pendente') que contenham produtos do vendedor
    const pendingOrdersAgg = await Order.aggregate([
      { $match: { status: 'pendente' } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      { $group: { _id: '$_id' } },
      { $count: 'pendingCount' }
    ])
    const pendingOrders = pendingOrdersAgg.length ? pendingOrdersAgg[0].pendingCount : 0

    // 5) receita total (somente itens de orders com status 'pago')
    // somamos qty * unitPrice apenas para os itens do vendedor dentro de orders com status 'pago'
    const revenueAgg = await Order.aggregate([
      { $match: { status: 'pago' } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $multiply: ['$items.qty', '$items.unitPrice'] } }
        }
      }
    ])
    const revenue = revenueAgg.length ? revenueAgg[0].revenue : 0

    // 5.1) Estatísticas dos últimos 7 dias (receita e nº de pedidos / dia)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // zera horário de hoje
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6) // hoje + 6 dias anteriores

    const last7Agg = await Order.aggregate([
      {
        $match: {
          status: 'pago',
          createdAt: { $gte: sevenDaysAgo } // até agora
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.unitPrice'] } },
          ordersSet: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day',
          revenue: 1,
          ordersCount: { $size: '$ordersSet' }
        }
      }
    ])

    // monta array com exatamente 7 dias (0 se não teve venda)
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)

      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const day = d.getDate()

      const found = last7Agg.find(
        x => x.year === y && x.month === m && x.day === day
      )

      last7Days.push({
        label: d.toLocaleDateString('pt-BR'),
        revenue: found?.revenue || 0,
        ordersCount: found?.ordersCount || 0
      })
    }

    // 6) top 5 produtos por quantidade vendida (em orders 'pago')
    const topProductsAgg = await Order.aggregate([
      { $match: { status: 'pago' } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      {
        $group: {
          _id: '$items.productId',
          qtySold: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.unitPrice'] } }
        }
      },
      { $sort: { qtySold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          title: '$product.title',
          qtySold: 1,
          revenue: 1
        }
      }
    ])

    // 7) últimos 5 pedidos que contenham itens do vendedor (inclui comprador)
    const recentOrdersAgg = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: productIds } } },
      {
        $group: {
          _id: '$_id',
          buyerId: { $first: '$buyerId' },
          createdAt: { $first: '$createdAt' },
          status: { $first: '$status' },
          items: { $push: '$items' },
          total: { $first: '$total' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer'
        }
      },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orderId: '$_id',
          buyer: { id: '$buyer._id', name: '$buyer.name', email: '$buyer.email' },
          createdAt: 1,
          status: 1,
          items: 1,
          total: 1
        }
      }
    ])

    return res.json({
      totalProducts,
      totalOrders,
      pendingOrders,
      revenue,
      topProducts: topProductsAgg,
      recentOrders: recentOrdersAgg,
      last7Days
    })
  } catch (error) {
    console.error('getVendorDashboard err', error)
    return res.status(500).json({ message: 'Erro ao gerar dashboard do vendedor.' })
  }
}
