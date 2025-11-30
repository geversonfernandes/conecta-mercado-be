import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1])

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Não autenticado.' })
  }

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET não definido no ambiente')
      return res.status(500).json({ message: 'Configuração de servidor inválida.' })
    }

    const decoded = jwt.verify(token, secret)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}
