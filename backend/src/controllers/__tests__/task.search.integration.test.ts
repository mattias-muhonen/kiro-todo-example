import { TaskService } from '../../services/task.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

// Mock the database connection
jest.mock('../../config/database', () => ({
  connectDatabase: jest.fn(),
  checkDatabaseHealth: jest.fn().mockResolvedValue(true),
  prisma: {
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('Task Search Integration Tests', () => {
  let taskService: TaskService;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
  };

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Implement search functionality',
      description: 'Add full-text search to the application',
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
      dueDate: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      creatorId: mockUser.id,
      assigneeId: null,
      creator: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      },
      assignee: null,
    },
    {
      id: 'task-2',
      title: 'Fix bug in search results',
      description: 'The search is not returning correct results',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2024-02-01'),
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-04'),
      creatorId: mockUser.id,
      assigneeId: 'other-user',
      creator: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      },
      assignee: {
        id: 'other-user',
        name: 'Other User',
        email: 'other@example.com',
      },
    },
    {
      id: 'task-3',
      title: 'Update documentation',
      description: 'Update the API documentation for new features',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      dueDate: null,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-06'),
      creatorId: 'other-user',
      assigneeId: mockUser.id,
      creator: {
        id: 'other-user',
        name: 'Other User',
        email: 'other@example.com',
      },
      assignee: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      },
    },
  ];

  beforeEach(() => {
    taskService = new TaskService();
    jest.clearAllMocks();
  });

  describe('Search Functionality', () => {
    it('should search tasks by title', async () => {
      const { prisma } = require('../../config/database');
      
      const searchResults = [mockTasks[0], mockTasks[1]]; // Tasks with "search" in title
      prisma.task.findMany.mockResolvedValue(searchResults);

      const result = await taskService.searchTasks(mockUser.id, 'search');

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'search', mode: 'insensitive' } },
                { description: { contains: 'search', mode: 'insensitive' } },
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

      expect(result).toEqual(searchResults);
    });

    it('should search tasks by description', async () => {
      const { prisma } = require('../../config/database');
      
      const searchResults = [mockTasks[2]]; // Task with "API" in description
      prisma.task.findMany.mockResolvedValue(searchResults);

      const result = await taskService.searchTasks(mockUser.id, 'API');

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'API', mode: 'insensitive' } },
                { description: { contains: 'API', mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: expect.any(Object),
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50,
      });

      expect(result).toEqual(searchResults);
    });

    it('should perform case-insensitive search', async () => {
      const { prisma } = require('../../config/database');
      
      const searchResults = [mockTasks[0]]; // Task with "implement" in title
      prisma.task.findMany.mockResolvedValue(searchResults);

      const result = await taskService.searchTasks(mockUser.id, 'IMPLEMENT');

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'IMPLEMENT', mode: 'insensitive' } },
                { description: { contains: 'IMPLEMENT', mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: expect.any(Object),
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50,
      });

      expect(result).toEqual(searchResults);
    });

    it('should return empty array for no matches', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findMany.mockResolvedValue([]);

      const result = await taskService.searchTasks(mockUser.id, 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty search query', async () => {
      const result = await taskService.searchTasks(mockUser.id, '');

      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only search query', async () => {
      const result = await taskService.searchTasks(mockUser.id, '   ');

      expect(result).toEqual([]);
    });

    it('should limit search results to 50 items', async () => {
      const { prisma } = require('../../config/database');
      
      // Create 60 mock tasks
      const manyTasks = Array.from({ length: 60 }, (_, i) => ({
        ...mockTasks[0],
        id: `task-${i}`,
        title: `Search task ${i}`,
      }));
      
      prisma.task.findMany.mockResolvedValue(manyTasks.slice(0, 50));

      const result = await taskService.searchTasks(mockUser.id, 'search');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );

      expect(result).toHaveLength(50);
    });

    it('should only return tasks user has access to', async () => {
      const { prisma } = require('../../config/database');
      
      // Should only return tasks where user is creator or assignee
      const accessibleTasks = mockTasks.filter(task => 
        task.creatorId === mockUser.id || task.assigneeId === mockUser.id
      );
      
      prisma.task.findMany.mockResolvedValue(accessibleTasks);

      const result = await taskService.searchTasks(mockUser.id, 'task');

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'task', mode: 'insensitive' } },
                { description: { contains: 'task', mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: expect.any(Object),
        orderBy: {
          updatedAt: 'desc',
        },
        take: 50,
      });

      expect(result).toEqual(accessibleTasks);
    });
  });

  describe('Search with Filtering Integration', () => {
    it('should combine search with status filter in getUserTasks', async () => {
      const { prisma } = require('../../config/database');
      
      const filteredTasks = [mockTasks[1]]; // IN_PROGRESS task with "search" in title
      prisma.task.findMany.mockResolvedValue(filteredTasks);
      prisma.task.count.mockResolvedValue(1);

      const filters = {
        search: 'search',
        status: TaskStatus.IN_PROGRESS,
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc' as const,
      };

      const result = await taskService.getUserTasks(mockUser.id, filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'search', mode: 'insensitive' } },
                { description: { contains: 'search', mode: 'insensitive' } },
              ],
            },
          ],
          status: TaskStatus.IN_PROGRESS,
        },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 20,
      });

      expect(result.tasks).toEqual(filteredTasks);
    });

    it('should combine search with priority filter in getUserTasks', async () => {
      const { prisma } = require('../../config/database');
      
      const filteredTasks = [mockTasks[0]]; // HIGH priority task with "search" in title
      prisma.task.findMany.mockResolvedValue(filteredTasks);
      prisma.task.count.mockResolvedValue(1);

      const filters = {
        search: 'functionality',
        priority: TaskPriority.HIGH,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'asc' as const,
      };

      const result = await taskService.getUserTasks(mockUser.id, filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'functionality', mode: 'insensitive' } },
                { description: { contains: 'functionality', mode: 'insensitive' } },
              ],
            },
          ],
          priority: TaskPriority.HIGH,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 20,
      });

      expect(result.tasks).toEqual(filteredTasks);
    });

    it('should combine search with assignee filter in getUserTasks', async () => {
      const { prisma } = require('../../config/database');
      
      const filteredTasks = [mockTasks[2]]; // Task assigned to user with "documentation" in title
      prisma.task.findMany.mockResolvedValue(filteredTasks);
      prisma.task.count.mockResolvedValue(1);

      const filters = {
        search: 'documentation',
        assigneeId: mockUser.id,
        page: 1,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc' as const,
      };

      const result = await taskService.getUserTasks(mockUser.id, filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { creatorId: mockUser.id },
                { assigneeId: mockUser.id },
              ],
            },
            {
              OR: [
                { title: { contains: 'documentation', mode: 'insensitive' } },
                { description: { contains: 'documentation', mode: 'insensitive' } },
              ],
            },
          ],
          assigneeId: mockUser.id,
        },
        include: expect.any(Object),
        orderBy: { title: 'asc' },
        skip: 0,
        take: 20,
      });

      expect(result.tasks).toEqual(filteredTasks);
    });
  });

  describe('Search Performance', () => {
    it('should order search results by most recently updated', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findMany.mockResolvedValue(mockTasks);

      await taskService.searchTasks(mockUser.id, 'task');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            updatedAt: 'desc',
          },
        })
      );
    });

    it('should include all necessary relations in search results', async () => {
      const { prisma } = require('../../config/database');
      
      prisma.task.findMany.mockResolvedValue(mockTasks);

      await taskService.searchTasks(mockUser.id, 'task');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
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
        })
      );
    });
  });
});