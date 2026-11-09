import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import recommendationRoutes from './routes/recommendationRoutes.js';
import { connectDB } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5201;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'recommendation-service',
    status: 'OK'
  });
});

app.use('/api/recommendations', recommendationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

try {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Recommendation service running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('No se pudo iniciar recommendation-service:', error.message);
  process.exit(1);
}
