import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(user: User) {
    const hashedPassword = user?.password
      ? this.hashPassword(user.password)
      : null;
    const savedUser = await this.prismaService.user.create({
      data: {
        email: user.email!,
        password: hashedPassword,
        provider: user?.provider,
        roles: ['USER'],
      },
    });

    return savedUser;
  }

  findAll() {
    return this.prismaService.user.findMany();
  }

  findOne(idOrEmail: string) {
    const user = this.prismaService.user.findFirst({
      where: {
        OR: [{ id: idOrEmail }, { email: idOrEmail }],
      },
    });
    return user;
  }

  async update(id: string, user: Partial<User>) {
    const hashedPassword = user?.password
      ? this.hashPassword(user.password)
      : null;
    const savedUser = await this.prismaService.user.update({
      where: {
        id,
      },

      data: {
        ...user,
        password: hashedPassword ?? undefined,
      },
    });

    return savedUser;
  }

  remove(id: string) {
    return this.prismaService.user.delete({
      where: { id },
      select: { id: true },
    });
  }
  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}
