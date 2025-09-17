import { TaskService } from '../task.service';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../../config/database';

// Mock the database module
jest.mock('../../config/database', () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Get the mocked functions
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const creatorId = 'creator-1';
    const validTaskData = {
      title: 'Test Task',
      description: 'Test Description',
      priority: TaskPriority.HIGH,
      assigneeId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
    };

    const mockTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorId: 'creator-1',
      assigneeId: '550e8400-e29b-41d4-a716-446655440000',
      creator: {
        id: 'creator-1',
        name: 'Creator User',
        email: 'creator@example.com',
      },
      assignee: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Assignee User',
        email: 'assignee@example.com',
      },
    };

    it('should create a task successfully', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Assignee User',
      });
      (mockPrisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await taskService.createTask(creatorId, validTaskData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.PENDING,
          priority: TaskPriority.HIGH,
          dueDate: null,
          creatorId: 'creator-1',
          assigneeId: '550e8400-e29b-41d4-a716-446655440000',
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual(mockTask);
    });

    it('should create task without assignee', async () => {
      const taskDataWithoutAssignee = {
        title: 'Test Task',
        description: 'Test Description',
      };

      const mockTaskWithoutAssignee = {
        ...mockTask,
        assigneeId: null,
        assignee: null,
      };

      (mockPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithoutAssignee);

      const result = await taskService.createTask(creatorId, taskDataWithoutAssignee);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: null,
          creatorId: 'creator-1',
          assigneeId: null,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual(mockTaskWithoutAssignee);
    });

    it('should throw error for empty title', async () => {
      const invalidData = { ...validTaskData, title: '' };

      await expect(taskService.createTask(creatorId, invalidData)).rejects.toThrow(
        'Validation error: Task title is required'
      );
    });

    it('should throw error for non-existent assignee', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(taskService.createTask(creatorId, validTaskData)).rejects.toThrow(
        'Assigned user does not exist'
      );
    });
  });

  describe('getTaskById', () => {
    const taskId = 'task-1';
    const userId = 'user-1';

    const mockTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorId: 'creator-1',
      assigneeId: 'user-1',
      creator: {
        id: 'creator-1',
        name: 'Creator User',
        email: 'creator@example.com',
      },
      assignee: {
        id: 'user-1',
        name: 'User One',
        email: 'user1@example.com',
      },
    };

    it('should return task if user is creator', async () => {
      (mockPrisma.task.findFirst as jest.Mock).mockResolvedValue(mockTask);

      const result = await taskService.getTaskById(taskId, userId);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: taskId,
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual(mockTask);
    });

    it('should return null if task not found or access denied', async () => {
      (mockPrisma.task.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await taskService.getTaskById(taskId, userId);

      expect(result).toBeNull();
    });
  });

  describe('getUserTasks', () => {
    const userId = 'user-1';
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: 'user-1',
        assigneeId: null,
        creator: {
          id: 'user-1',
          name: 'User One',
          email: 'user1@example.com',
        },
        assignee: null,
      },
    ];

    it('should return user tasks with default pagination', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const result = await taskService.getUserTasks(userId);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 20,
      });

      expect(result).toEqual({
        tasks: mockTasks,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply status filter', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const filters = { status: TaskStatus.COMPLETED };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TaskStatus.COMPLETED,
          }),
        })
      );
    });

    it('should apply search filter', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const filters = { search: 'test query' };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { creatorId: userId },
                  { assigneeId: userId },
                ],
              },
              {
                OR: [
                  { title: { contains: 'test query', mode: 'insensitive' } },
                  { description: { contains: 'test query', mode: 'insensitive' } },
                ],
              },
            ],
          }),
        })
      );
    });

    it('should apply priority filter', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const filters = { priority: TaskPriority.HIGH };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: TaskPriority.HIGH,
          }),
        })
      );
    });

    it('should apply assignee filter', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const assigneeId = 'assignee-123';
      const filters = { assigneeId };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId,
          }),
        })
      );
    });

    it('should apply creator filter', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const creatorId = 'creator-123';
      const filters = { creatorId };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId,
          }),
        })
      );
    });

    it('should apply due date range filter', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const dueDateFrom = new Date('2024-01-01');
      const dueDateTo = new Date('2024-12-31');
      const filters = { dueDateFrom, dueDateTo };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: dueDateFrom,
              lte: dueDateTo,
            },
          }),
        })
      );
    });

    it('should apply sorting by different fields', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const filters = { sortBy: 'dueDate', sortOrder: 'asc' as const };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            dueDate: 'asc',
          },
        })
      );
    });

    it('should apply pagination correctly', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(25);

      const filters = { page: 2, limit: 10 };
      const result = await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit = (2 - 1) * 10
          take: 10,
        })
      );

      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should combine multiple filters', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const filters = {
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        search: 'urgent',
        assigneeId: 'assignee-123',
      };
      await taskService.getUserTasks(userId, filters);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { creatorId: userId },
                  { assigneeId: userId },
                ],
              },
              {
                OR: [
                  { title: { contains: 'urgent', mode: 'insensitive' } },
                  { description: { contains: 'urgent', mode: 'insensitive' } },
                ],
              },
            ],
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            assigneeId: 'assignee-123',
          }),
        })
      );
    });
  });

  describe('updateTask', () => {
    const taskId = 'task-1';
    const userId = 'user-1';
    const updateData = {
      title: 'Updated Task',
      status: TaskStatus.COMPLETED,
    };

    const existingTask = {
      id: 'task-1',
      creatorId: 'user-1',
      assigneeId: null,
    };

    const updatedTask = {
      id: 'task-1',
      title: 'Updated Task',
      description: 'Test Description',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorId: 'user-1',
      assigneeId: null,
      creator: {
        id: 'user-1',
        name: 'User One',
        email: 'user1@example.com',
      },
      assignee: null,
    };

    it('should update task successfully', async () => {
      (mockPrisma.task.findFirst as jest.Mock).mockResolvedValue(existingTask);
      (mockPrisma.task.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(taskId, userId, updateData);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: taskId,
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
          ],
        },
      });

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          title: 'Updated Task',
          status: TaskStatus.COMPLETED,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(updatedTask);
    });

    it('should throw error if task not found', async () => {
      (mockPrisma.task.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(taskService.updateTask(taskId, userId, updateData)).rejects.toThrow(
        'Task not found or access denied'
      );
    });
  });

  describe('deleteTask', () => {
    const taskId = 'task-1';
    const userId = 'user-1';

    const existingTask = {
      id: 'task-1',
      creatorId: 'user-1',
    };

    it('should delete task successfully', async () => {
      (mockPrisma.task.findFirst as jest.Mock).mockResolvedValue(existingTask);
      (mockPrisma.task.delete as jest.Mock).mockResolvedValue({});

      await taskService.deleteTask(taskId, userId);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: taskId,
          creatorId: userId,
        },
      });

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should throw error if user is not creator', async () => {
      (mockPrisma.task.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(taskService.deleteTask(taskId, userId)).rejects.toThrow(
        'Task not found or access denied'
      );
    });
  });

  describe('searchTasks', () => {
    const userId = 'user-1';
    const searchQuery = 'test search';

    const mockTasks = [
      {
        id: 'task-1',
        title: 'Test Task',
        description: 'Contains search term',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: 'user-1',
        assigneeId: null,
        creator: {
          id: 'user-1',
          name: 'User One',
          email: 'user1@example.com',
        },
        assignee: null,
      },
    ];

    it('should search tasks successfully', async () => {
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

      const result = await taskService.searchTasks(userId, searchQuery);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: userId },
                { assigneeId: userId },
              ],
            },
            {
              OR: [
                { title: { contains: searchQuery, mode: 'insensitive' } },
                { description: { contains: searchQuery, mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50,
      });

      expect(result).toEqual(mockTasks);
    });

    it('should return empty array for empty search query', async () => {
      const result = await taskService.searchTasks(userId, '');

      expect(result).toEqual([]);
      expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
    });
  });
});