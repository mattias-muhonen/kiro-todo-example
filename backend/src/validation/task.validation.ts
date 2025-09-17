import Joi from 'joi';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const taskCreationSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Task title is required',
      'string.min': 'Task title cannot be empty',
      'string.max': 'Task title must be less than 255 characters',
    }),
  
  description: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Task description must be less than 2000 characters',
    }),
  
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .default(TaskStatus.PENDING)
    .messages({
      'any.only': 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED',
    }),
  
  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .default(TaskPriority.MEDIUM)
    .messages({
      'any.only': 'Priority must be one of: LOW, MEDIUM, HIGH',
    }),
  
  dueDate: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Due date cannot be in the past',
      'date.format': 'Due date must be a valid ISO date',
    }),
  
  assigneeId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Assignee ID must be a string',
    }),
});

export const taskUpdateSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .messages({
      'string.empty': 'Task title cannot be empty',
      'string.min': 'Task title cannot be empty',
      'string.max': 'Task title must be less than 255 characters',
    }),
  
  description: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Task description must be less than 2000 characters',
    }),
  
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .messages({
      'any.only': 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED',
    }),
  
  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .messages({
      'any.only': 'Priority must be one of: LOW, MEDIUM, HIGH',
    }),
  
  dueDate: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.format': 'Due date must be a valid ISO date',
    }),
  
  assigneeId: Joi.string()
    .allow(null)
    .messages({
      'string.base': 'Assignee ID must be a string',
    }),
});

export const taskFilterSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .optional(),
  
  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .optional(),
  
  assigneeId: Joi.string()
    .optional(),
  
  creatorId: Joi.string()
    .optional(),
  
  dueDateFrom: Joi.date()
    .iso()
    .optional(),
  
  dueDateTo: Joi.date()
    .iso()
    .optional(),
  
  search: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'string.max': 'Search query must be less than 255 characters',
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'dueDate', 'title', 'priority', 'status')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
});

export interface TaskCreationData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
}

export interface TaskUpdateData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  assigneeId?: string | null;
}

export interface TaskFilterData {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  creatorId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}