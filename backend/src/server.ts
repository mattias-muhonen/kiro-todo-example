import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDatabase, checkDatabaseHealth } from './config/database';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Health check route with database status
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.json({ 
    status: dbHealthy ? 'OK' : 'ERROR',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString() 
  });
});

// Initialize database and start server
const startServer = async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;