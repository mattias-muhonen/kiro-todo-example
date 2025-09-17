import { TaskService } from '../../services/task.service';
import { UserService } from '../../services/user.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

// Mock the database connection
jest.mock('../../config/database', () => ({
  connectDatabase: jest.fn(),
  checkDatabaseHealth: jest.fn().mockResolvedValue(true),
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('Task Assignment Integration Tests', () => {
  let taskService: TaskService;
  let userService: UserService;

  const mockUser = {
    id: 'user-1',
    email: 'creator@example.com',
    name: 'Creator User',
    passwordHash: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssignee = {
    id: 'user-2',
    email: 'assignee@example.com',
    name: 'Assignee User',
    passwordHash: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creatorId: mockUser.id,
    assigneeId: mockAssignee.id,
    creator: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
    assignee: {
      id: mockAssignee.id,
      name: mockAssignee.name,
      email: mockAssignee.email,
    },
  };

  beforeEach(() => {
    taskService = new TaskService();
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('Task Assignment Logic', () => {
    it('should validate that assigned user exists during task creation', async () => {
      const { prisma } = require('../../config/database');
      
      // Mock assignee exists
      prisma.user.findUnique.mockResolvedValue(mockAssignee);
      prisma.task.create.mockResolvedValue(mockTask);

      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        assigneeId: mockAssignee.id,
      };

      const result = await taskService.createTask(mockUser.id, taskData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockAssignee.id },
      });
      expect(result.assigneeId).toBe(mockAssignee.id);
    });

    it('should throw error when assigned user does not exist', async () => {
      const { prisma } = require('../../config/database');
      
      // Mock assignee does not exist
      prisma.user.findUnique.mockResolvedValue(null);

      const taskData = {
        title: 'Test Task',
        assigneeId: 'non-existent-user',
      };

      await expect(taskService.createTask(mockUser.id, taskData))
        .rejects.toThrow('Assigned user does not exist');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-user' },
      });
    });

    it('should allow task creation without assignee', async () => {
      const { prisma } = require('../../config/database');
      
      const taskWithoutAssignee = { ...mockTask, assigneeId: null, assignee: null };
      prisma.task.create.mockResolvedValue(taskWithoutAssignee);

      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
      };

      const result = await taskService.createTask(mockUser.id, taskData);

      expect(result.assigneeId).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Task Assignment Updates', () => {
    it('should validate assignee exists during task update', async () => {
      const { prisma } = require('../../config/database');
      
      // Mock existing task and new assignee
      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.user.findUnique.mockResolvedValue(mockAssignee);
      prisma.task.update.mockResolvedValue(mockTask);

      const updateData = {
        assigneeId: mockAssignee.id,
      };

      const result = await taskService.updateTask('task-1', mockUser.id, updateData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockAssignee.id },
      });
      expect(result.assigneeId).toBe(mockAssignee.id);
    });

    it('should allow removing task assignment', async () => {
      const { prisma } = require('../../config/database');
      
      const unassignedTask = { ...mockTask, assigneeId: null, assignee: null };
      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue(unassignedTask);

      const updateData = {
        assigneeId: null,
      };

      const result = await taskService.updateTask('task-1', mockUser.id, updateData);

      expect(result.assigneeId).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Task Access Control', () => {
    it('should allow creator to access task', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await taskService.getTaskById('task-1', mockUser.id);

      expect(result).toBeTruthy();
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          OR: [
            { creatorId: mockUser.id },
            { assigneeId: mockUser.id },
          ],
        },
        include: expect.any(Object),
      });
    });

    it('should allow assignee to access task', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await taskService.getTaskById('task-1', mockAssignee.id);

      expect(result).toBeTruthy();
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          OR: [
            { creatorId: mockAssignee.id },
            { assigneeId: mockAssignee.id },
          ],
        },
        include: expect.any(Object),
      });
    });

    it('should deny access to non-creator/non-assignee', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findFirst.mockResolvedValue(null);

      const result = await taskService.getTaskById('task-1', 'other-user');

      expect(result).toBeNull();
    });
  });

  describe('User Selection for Assignment', () => {
    it('should return all users for assignment selection', async () => {
      const { prisma } = require('../../config/database');
      
      const mockUsers = [
        { id: mockUser.id, email: mockUser.email, name: mockUser.name, createdAt: mockUser.createdAt, updatedAt: mockUser.updatedAt },
        { id: mockAssignee.id, email: mockAssignee.email, name: mockAssignee.name, createdAt: mockAssignee.createdAt, updatedAt: mockAssignee.updatedAt },
      ];
      
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });
  });

  describe('Task Filtering by Assignment', () => {
    it('should filter tasks by assignee', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findMany.mockResolvedValue([mockTask]);
      prisma.task.count.mockResolvedValue(1);

      const filters = {
        assigneeId: mockAssignee.id,
        page: 1,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc' as const,
      };

      const result = await taskService.getUserTasks(mockUser.id, filters);

      expect(result.tasks).toHaveLength(1);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { creatorId: mockUser.id },
            { assigneeId: mockUser.id },
          ],
          assigneeId: mockAssignee.id,
        },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter tasks by creator', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findMany.mockResolvedValue([mockTask]);
      prisma.task.count.mockResolvedValue(1);

      const filters = {
        creatorId: mockUser.id,
        page: 1,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc' as const,
      };

      const result = await taskService.getUserTasks(mockUser.id, filters);

      expect(result.tasks).toHaveLength(1);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { creatorId: mockUser.id },
            { assigneeId: mockUser.id },
          ],
          creatorId: mockUser.id,
        },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });
});