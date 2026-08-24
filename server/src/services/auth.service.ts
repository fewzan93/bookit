import bcrypt from 'bcryptjs';
import { User, type IUser } from '../models/user.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import type { LoginInput, RegisterInput } from '../middlewares/validate.js';

export class AuthService {
  async register(input: RegisterInput): Promise<IUser> {
    const existing = await User.findOne({ email: input.email }).exec();
    if (existing) throw new ApiError(409, 'Email is already registered');

    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      const user = await User.create({ ...input, passwordHash });
      return user;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ApiError(409, 'Email is already registered');
      }
      throw err;
    }
  }

  async login(input: LoginInput): Promise<IUser> {
    const user = await User.findOne({ email: input.email }).select('+passwordHash').exec();
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const matches = await user.comparePassword(input.password);
    if (!matches) throw new ApiError(401, 'Invalid email or password');

    return user;
  }
}
