import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0 },
    images: [
      {
        url: String,
        publicId: String
      }
    ],
    category: { type: String, default: 'geral' },
    status: { type: String, enum: ['anunciado', 'sem_estoque', 'desativado'], default: 'anunciado' }
  },
  { timestamps: true }
)

const Product = mongoose.model('Product', productSchema)

export default Product
