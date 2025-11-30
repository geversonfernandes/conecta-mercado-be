import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['cliente', 'vendedor'], default: 'client' },
    cpfCnpj: { type: String },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    addresses: [
      {
        label: String,
        street: String,
        number: String,
        city: String,
        state: String,
        zip: String
      }
    ]
  },
  {
    timestamps: true
  }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const hash = await bcrypt.hash(this.password, SALT_ROUNDS)
  this.password = hash
  next()
})

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

const User = mongoose.model('User', userSchema)

export default User
