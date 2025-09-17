import { Router } from 'express';
import taskRoutes from './tasks';
import userRoutes from './users';

const router = Router();

// Mount route modules
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);

export default router;