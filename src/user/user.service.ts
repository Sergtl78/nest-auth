import { JwtPayload } from '@auth/interfaces';
import { convertToSecondsUtil } from '@lib/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { genSaltSync, hashSync } from 'bcrypt';
import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async update(user: Partial<User>) {
    const hashedPassword = user?.password
      ? this.hashPassword(user.password)
      : null;
    const savedUser = await this.prismaService.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        ...user,
        password: hashedPassword ?? undefined,
      },
      create: {
        email: user.email!,
        password: hashedPassword,
        provider: user?.provider,
        roles: ['USER'],
      },
    });
    await this.cacheManager.set(savedUser.id, savedUser);
    await this.cacheManager.set(savedUser.email, savedUser);
    return savedUser;
  }

  async findOne(idOrEmail: string, isReset = false): Promise<User> {
    if (isReset) {
      await this.cacheManager.del(idOrEmail);
    }
    const user = await this.cacheManager.get<User>(idOrEmail);
    if (!user) {
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [{ id: idOrEmail }, { email: idOrEmail }],
        },
      });
      if (!user) {
        throw new NotFoundException();
      }
      await this.cacheManager.set(
        idOrEmail,
        user,
        convertToSecondsUtil(
          this.configService.get('JWT_EXP') ?? 'super_secret',
        ),
      );
      return user;
    }
    return user;
  }

  async remove(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }
    await Promise.all([
      this.cacheManager.del(id),
      this.cacheManager.del(user.email),
    ]);
    return this.prismaService.user.delete({
      where: { id },
      select: { id: true },
    });
  }

  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}
