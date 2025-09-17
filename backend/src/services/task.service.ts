import { Task, TaskStatus, TaskPriority, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { handleDatabaseError } from '../utils/database-errors';
import {
  TaskCreationData,
  TaskUpdateData,
  TaskFilterData,
  taskCreationSchema,
  taskUpdateSchema,
  taskFilterSchema,
} from '../validation/task.validation';

export type TaskWithRelations = Task & {
  creator: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export interface TaskListResult {
  tasks: TaskWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TaskService {
  async createTask(creatorId: string, taskData: TaskCreationData): Promise<TaskWithRelations> {
    // Validate input data
    const { error, value } = taskCreationSchema.validate(taskData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    try {
      // Verify assignee exists if provided
      if (value.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: value.assigneeId },
        });
        if (!assignee) {
          throw new Error('Assigned user does not exist');
        }
      }

      // Create task in database
      const task = await prisma.task.create({
        data: {
          title: value.title,
          description: value.description || null,
          status: value.status || TaskStatus.PENDING,
          priority: value.priority || TaskPriority.MEDIUM,
          dueDate: value.dueDate || null,
          creatorId,
          assigneeId: value.assigneeId || null,
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

      return task;
    } catch (error) {
      if (error instanceof Error && error.message === 'Assigned user does not exist') {
        throw error;
      }
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async getTaskById(taskId: string, userId: string): Promise<TaskWithRelations | null> {
    try {
      const task = await prisma.task.findFirst({
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

      return task;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async getUserTasks(userId: string, filters: TaskFilterData = {}): Promise<TaskListResult> {
    // Validate filter data
    const { error, value } = taskFilterSchema.validate(filters);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    try {
      // Build where clause
      const whereClause: Prisma.TaskWhereInput = {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
      };

      // Apply filters
      if (value.status) {
        whereClause.status = value.status;
      }

      if (value.priority) {
        whereClause.priority = value.priority;
      }

      if (value.assigneeId) {
        whereClause.assigneeId = value.assigneeId;
      }

      if (value.creatorId) {
        whereClause.creatorId = value.creatorId;
      }

      if (value.dueDateFrom || value.dueDateTo) {
        whereClause.dueDate = {};
        if (value.dueDateFrom) {
          whereClause.dueDate.gte = value.dueDateFrom;
        }
        if (value.dueDateTo) {
          whereClause.dueDate.lte = value.dueDateTo;
        }
      }

      if (value.search) {
        whereClause.AND = [
          {
            OR: [
              { creatorId: userId },
              { assigneeId: userId },
            ],
          },
          {
            OR: [
              { title: { contains: value.search, mode: 'insensitive' } },
              { description: { contains: value.search, mode: 'insensitive' } },
            ],
          },
        ];
        // Remove the original OR clause since it's now in AND
        delete whereClause.OR;
      }

      // Calculate pagination
      const skip = (value.page - 1) * value.limit;

      // Build order by clause
      const orderBy: Prisma.TaskOrderByWithRelationInput = {};
      if (value.sortBy === 'createdAt') {
        orderBy.createdAt = value.sortOrder;
      } else if (value.sortBy === 'updatedAt') {
        orderBy.updatedAt = value.sortOrder;
      } else if (value.sortBy === 'dueDate') {
        orderBy.dueDate = value.sortOrder;
      } else if (value.sortBy === 'title') {
        orderBy.title = value.sortOrder;
      } else if (value.sortBy === 'priority') {
        orderBy.priority = value.sortOrder;
      } else if (value.sortBy === 'status') {
        orderBy.status = value.sortOrder;
      }

      // Execute queries
      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where: whereClause,
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
          orderBy,
          skip,
          take: value.limit,
        }),
        prisma.task.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(total / value.limit);

      return {
        tasks,
        total,
        page: value.page,
        limit: value.limit,
        totalPages,
      };
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async updateTask(
    taskId: string,
    userId: string,
    updateData: TaskUpdateData
  ): Promise<TaskWithRelations> {
    // Validate input data
    const { error, value } = taskUpdateSchema.validate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    try {
      // Check if user has permission to update the task
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
          ],
        },
      });

      if (!existingTask) {
        throw new Error('Task not found or access denied');
      }

      // Verify assignee exists if provided
      if (value.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: value.assigneeId },
        });
        if (!assignee) {
          throw new Error('Assigned user does not exist');
        }
      }

      // Build update data
      const updatePayload: Prisma.TaskUpdateInput = {};
      
      if (value.title !== undefined) {
        updatePayload.title = value.title;
      }
      
      if (value.description !== undefined) {
        updatePayload.description = value.description;
      }
      
      if (value.status !== undefined) {
        updatePayload.status = value.status;
      }
      
      if (value.priority !== undefined) {
        updatePayload.priority = value.priority;
      }
      
      if (value.dueDate !== undefined) {
        updatePayload.dueDate = value.dueDate;
      }
      
      if (value.assigneeId !== undefined) {
        if (value.assigneeId === null) {
          updatePayload.assignee = { disconnect: true };
        } else {
          updatePayload.assignee = { connect: { id: value.assigneeId } };
        }
      }

      // Update task
      const task = await prisma.task.update({
        where: { id: taskId },
        data: updatePayload,
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

      return task;
    } catch (error) {
      if (error instanceof Error && (
        error.message === 'Task not found or access denied' ||
        error.message === 'Assigned user does not exist'
      )) {
        throw error;
      }
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    try {
      // Check if user is the creator (only creators can delete tasks)
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          creatorId: userId,
        },
      });

      if (!existingTask) {
        throw new Error('Task not found or access denied');
      }

      await prisma.task.delete({
        where: { id: taskId },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Task not found or access denied') {
        throw error;
      }
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async updateTaskStatus(
    taskId: string,
    userId: string,
    status: TaskStatus
  ): Promise<TaskWithRelations> {
    try {
      // Check if user has permission to update the task status
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
          ],
        },
      });

      if (!existingTask) {
        throw new Error('Task not found or access denied');
      }

      // Update task status
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { status },
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

      return task;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async searchTasks(userId: string, searchQuery: string): Promise<TaskWithRelations[]> {
    if (!searchQuery.trim()) {
      return [];
    }

    try {
      const tasks = await prisma.task.findMany({
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
        take: 50, // Limit search results
      });

      return tasks;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }
}