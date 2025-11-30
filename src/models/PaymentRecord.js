import mongoose from 'mongoose'

const paymentRecordSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending','paid','failed'], default: 'pending' },
  providerResponse: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema)
export default PaymentRecord
