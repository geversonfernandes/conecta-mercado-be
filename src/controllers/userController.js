import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { token } from 'morgan'

const ALLOWED_ROLES = ['cliente', 'vendedor']
const DEFAULT_ROLE = 'cliente'
const SALT_ROUNDS = 10

const createToken = (user) => {
  const payload = { id: user._id, role: user.role, email: user.email }
  const secret = process.env.JWT_SECRET
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h'
  return jwt.sign(payload, secret, { expiresIn })
}

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email e password são obrigatórios.' })
  }

  // valida role: se não informado, assume client; se informado, valida se é permitido
  const normalizedRole = role ? String(role).toLowerCase() : DEFAULT_ROLE
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    return res.status(400).json({ message: `Role inválida. Valores permitidos: ${ALLOWED_ROLES.join(', ')}` })
  }

  try {
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'Usuário já existe!' })
    }

    const user = new User({ name, email, password, role: normalizedRole })
    await user.save()

    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    res.status(500).json({ error: error.message })
  }
}

export const updateUser = async (req, res) => {
  const { id } = req.params
  const { name, email, password } = req.body

  try {
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado!' })
    }

    user.name = name || user.name
    user.email = email || user.email
    if (password) user.password = await bcrypt.hash(password, SALT_ROUNDS)

    await user.save()
    res.status(200).json({ message: 'Usuário atualizado com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const deleteUser = async (req, res) => {
  const { id } = req.params

  try {
    const user = await User.findByIdAndDelete(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado!' })
    }
    res.status(200).json({ message: 'Usuário deletado com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const loginUser = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' })
  }

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado!' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha incorreta!' })
    }

    const token = createToken(user)

    // Detecta se request é HTTPS (útil para proxies)
    const isSecureRequest = req.secure || (req.headers['x-forwarded-proto'] === 'https')

    const cookieOptions = {
      httpOnly: true,
      secure: !!isSecureRequest,
      sameSite: isSecureRequest ? 'None' : 'Lax',
      maxAge: 1000 * 60 * 60 // 1 hora
    }

    res.cookie('token', token, cookieOptions)

    res.status(200).json({
      message: 'Login bem-sucedido!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({ error: error.message })
  }
}

export const logoutUser = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'Lax' })
  res.status(200).json({ message: 'Logout realizado com sucesso.' })
}
