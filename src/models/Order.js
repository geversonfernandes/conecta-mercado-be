import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false })

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pendente', 'pago', 'em_transito', 'entregue', 'cancelado'], default: 'pendente' },
  payment: {
    method: { type: String, default: 'pix' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    providerData: { type: mongoose.Schema.Types.Mixed }
  }
}, { timestamps: true })

const Order = mongoose.model('Order', orderSchema)
export default Order
