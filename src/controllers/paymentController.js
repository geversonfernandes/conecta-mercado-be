import PaymentRecord from '../models/PaymentRecord.js'
import Order from '../models/Order.js'
import { v4 as uuidv4 } from 'uuid'

// POST /api/v1/payments/create-pix   { orderId }
export const createPix = async (req, res) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado.' })
    if (order.payment.status === 'paid') return res.status(400).json({ message: 'Pedido já pago.' })

    const paymentId = uuidv4()
    // gerar dados simulados
    const qrCode = `pix://simulado/${paymentId}` // string simulada
    const copyPaste = `SIMULADO|${paymentId}`

    const pr = new PaymentRecord({
      paymentId,
      orderId: order._id,
      amount: order.total,
      status: 'pending',
      providerResponse: { qrCode, copyPaste }
    })
    await pr.save()

    // retornar dados para o cliente pagar (simulação)
    return res.json({
      paymentId,
      orderId: order._id,
      amount: order.total,
      pix: { qrCode, copyPaste },
      expiresAt: Date.now() + 1000 * 60 * 15 // 15 min
    })
  } catch (err) {
    console.error('createPix err', err)
    return res.status(500).json({ message: 'Erro ao criar pagamento PIX.' })
  }
}

// POST /api/v1/payments/webhook   (simulação de confirmação do gateway)
// body: { paymentId, orderId, status: 'paid', txid: '...' }
export const webhook = async (req, res) => {
  try {
    const { paymentId, orderId, status, txid } = req.body
    if (!paymentId || !orderId || !status) return res.status(400).json({ message: 'paymentId, orderId e status required.' })

    const pr = await PaymentRecord.findOne({ paymentId })
    if (!pr) return res.status(404).json({ message: 'PaymentRecord não encontrado.' })

    pr.status = status
    pr.providerResponse = { ...(pr.providerResponse || {}), txid }
    await pr.save()

    if (status === 'paid') {
      // atualizar order
      const order = await Order.findById(orderId)
      if (order) {
        order.payment.status = 'paid'
        order.status = 'pago'
        order.payment.providerData = { txid, paidAt: new Date() }
        await order.save()
      }
    }

    return res.json({ message: 'Webhook processado.' })
  } catch (err) {
    console.error('webhook err', err)
    return res.status(500).json({ message: 'Erro no webhook.' })
  }
}

// GET /api/v1/payments/:orderId/status
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const pr = await PaymentRecord.findOne({ orderId }).sort({ createdAt: -1 })
    if (!pr) return res.status(404).json({ message: 'PaymentRecord não encontrado.' })
    return res.json({ paymentId: pr.paymentId, status: pr.status, providerResponse: pr.providerResponse })
  } catch (err) {
    console.error('getPaymentStatus err', err)
    return res.status(500).json({ message: 'Erro ao consultar status.' })
  }
}
