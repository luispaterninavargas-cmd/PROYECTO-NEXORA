import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recommendations';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500
    });
    console.log('MongoDB conectado en recommendation-service');
    return true;
  } catch (error) {
    console.warn('MongoDB no disponible en recommendation-service:', error.message);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MongoDB es obligatorio en producción para conservar el historial del recomendador.', {
        cause: error
      });
    }
    console.warn('El perfil del recomendador solo se conservará temporalmente en memoria.');
    return false;
  }
};
