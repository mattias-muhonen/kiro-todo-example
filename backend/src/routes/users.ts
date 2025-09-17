import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getUsers, getUserById } from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// User endpoints
router.get('/', getUsers);
router.get('/:id', getUserById);

export default router;