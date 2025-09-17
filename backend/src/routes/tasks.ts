import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  searchTasks,
} from '../controllers/task.controller';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

// Task CRUD endpoints
router.post('/', createTask);
router.get('/', getTasks);
router.get('/search', searchTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateTaskStatus);

export default router;