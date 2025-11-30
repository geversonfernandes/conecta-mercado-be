import express from 'express'
import connectDB from './config/db.js'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import xss from 'xss-clean'
import morgan from 'morgan'
import path from 'path'

import userRoutes from './routes/userRoutes.js'
import productRoutes from './routes/productRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import vendorRoutes from './routes/vendorRoutes.js'

dotenv.config()
connectDB()

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 5000

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://conecta-mercado-fe.vercel.app"
  ],
  credentials: true,
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

app.use(cors(corsOptions))
app.use(limiter)
app.use(express.json())
app.use(cookieParser())
app.use(mongoSanitize())
app.use(xss())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use(morgan('dev'))

app.use('/api/v1/user', userRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/cart', cartRoutes)
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/vendor', vendorRoutes)

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() })
})

app.use((req, res, next) => {
  res.status(404).json({ message: 'Rota não encontrada' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Erro interno do servidor' })
})

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
