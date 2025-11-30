import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER || 'produtos',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
})

export const uploadProductImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})
