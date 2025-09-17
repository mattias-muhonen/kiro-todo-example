import { User } from '@prisma/client';
import { prisma } from '../config/database';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { handleDatabaseError } from '../utils/database-errors';
import {
  UserRegistrationData,
  UserLoginData,
  UserUpdateData,
  userRegistrationSchema,
  userLoginSchema,
  userUpdateSchema,
} from '../validation/user.validation';

export class UserService {
  async createUser(userData: UserRegistrationData): Promise<Omit<User, 'passwordHash'>> {
    // Validate input data
    const { error, value } = userRegistrationSchema.validate(userData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(value.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    try {
      // Hash password
      const passwordHash = await hashPassword(value.password);

      // Create user in database
      const user = await prisma.user.create({
        data: {
          email: value.email.toLowerCase(),
          name: value.name,
          passwordHash,
        },
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async authenticateUser(loginData: UserLoginData): Promise<Omit<User, 'passwordHash'> | null> {
    // Validate input data
    const { error, value } = userLoginSchema.validate(loginData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: value.email.toLowerCase() },
      });

      if (!user) {
        return null;
      }

      // Verify password
      const isPasswordValid = await comparePassword(value.password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return null;
      }

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async getUserByEmail(email: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        return null;
      }

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async updateUser(id: string, updateData: UserUpdateData): Promise<Omit<User, 'passwordHash'>> {
    // Validate input data
    const { error, value } = userUpdateSchema.validate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    try {
      const updatePayload: any = {};
      
      if (value.name) {
        updatePayload.name = value.name;
      }
      
      if (value.email) {
        updatePayload.email = value.email.toLowerCase();
      }

      const user = await prisma.user.update({
        where: { id },
        data: updatePayload,
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    try {
      const users = await prisma.user.findMany({
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

      return users;
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw new Error(dbError.message);
    }
  }
}