import { Prisma } from '@prisma/client';

export interface DatabaseError {
  code: string;
  message: string;
  field?: string;
}

export const handleDatabaseError = (error: unknown): DatabaseError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        return {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: `A record with this ${field?.[0] || 'value'} already exists`,
          field: field?.[0],
        };
      
      case 'P2025':
        // Record not found
        return {
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
        };
      
      case 'P2003':
        // Foreign key constraint violation
        return {
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          message: 'Referenced record does not exist',
        };
      
      case 'P2014':
        // Required relation violation
        return {
          code: 'REQUIRED_RELATION_VIOLATION',
          message: 'The change would violate a required relation',
        };
      
      default:
        return {
          code: 'DATABASE_ERROR',
          message: 'A database error occurred',
        };
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      code: 'UNKNOWN_DATABASE_ERROR',
      message: 'An unknown database error occurred',
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: 'DATABASE_PANIC',
      message: 'Database engine encountered an error',
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: 'DATABASE_INITIALIZATION_ERROR',
      message: 'Failed to initialize database connection',
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided to database',
    };
  }

  // Generic error fallback
  return {
    code: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
  };
};