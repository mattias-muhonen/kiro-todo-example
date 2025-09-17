import { UserService } from '../user.service';
import { prisma } from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password';

// Mock the database module
jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock password utilities
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  validatePasswordStrength: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
}));

// Get the mocked functions
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a user successfully', async () => {
      mockHashPassword.mockResolvedValue('hashed-password');
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.createUser(validUserData);

      expect(mockHashPassword).toHaveBeenCalledWith('Password123!');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed-password',
        },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw error for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      await expect(userService.createUser(invalidData)).rejects.toThrow(
        'Validation error: Please provide a valid email address'
      );
    });

    it('should convert email to lowercase', async () => {
      const upperCaseEmailData = { ...validUserData, email: 'TEST@EXAMPLE.COM' };
      mockHashPassword.mockResolvedValue('hashed-password');
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
      });

      await userService.createUser(upperCaseEmailData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed-password',
        },
      });
    });
  });

  describe('authenticateUser', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should authenticate user successfully', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);

      const result = await userService.authenticateUser(loginData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should return null for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.authenticateUser(loginData);

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);

      const result = await userService.authenticateUser(loginData);

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user by id', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should return null for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    const mockUser = {
      id: 'user-1',
      email: 'updated@example.com',
      name: 'Updated User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update user successfully', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com',
      };

      const result = await userService.updateUser('user-1', updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: 'Updated User',
          email: 'updated@example.com',
        },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'updated@example.com',
        name: 'Updated User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });
  });

  describe('getAllUsers', () => {
    const mockUsers = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return all users', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual(mockUsers);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      (mockPrisma.user.delete as jest.Mock).mockResolvedValue({} as any);

      await userService.deleteUser('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});