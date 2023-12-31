import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider, Token, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { UserService } from '@user/user.service';
import { compareSync } from 'bcrypt';
import { add } from 'date-fns';
import { v4 } from 'uuid';

import { Tokens } from './interfaces';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async refreshTokens(refreshToken: string, agent: string): Promise<Tokens> {
    const token = await this.prismaService.token.delete({
      where: { token: refreshToken },
    });
    if (!token || new Date(token.exp) < new Date()) {
      throw new UnauthorizedException();
    }
    const user = await this.userService.findOne(token.userId);
    return this.generateTokens(user, agent);
  }

  async register(dto: RegisterDto, agent: string) {
    const user = await this.userService.findOne(dto.email).catch((err) => {
      this.logger.error(err);
      return null;
    });
    console.log('user', user);

    if (user) {
      throw new ConflictException(
        'Пользователь с таким email уже зарегистрирован',
      );
    }
    const userSaved = await this.userService.update(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
    return userSaved ? this.generateTokens(userSaved, agent) : null;
  }

  async login(dto: LoginDto, agent: string): Promise<Tokens> {
    const user = await this.userService
      .findOne(dto.email, true)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user || !compareSync(dto.password, user.password || '')) {
      throw new UnauthorizedException('Не верный логин или пароль');
    }
    return this.generateTokens(user, agent);
  }

  private async generateTokens(user: User, agent: string): Promise<Tokens> {
    const accessToken =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      });
    const refreshToken = await this.getRefreshToken(user.id, agent);
    return { accessToken, refreshToken };
  }

  private async getRefreshToken(userId: string, agent: string): Promise<Token> {
    const tokenData = await this.prismaService.token.findFirst({
      where: {
        userId,
        userAgent: agent,
      },
    });

    const token = tokenData?.token ?? 'unknown';

    return this.prismaService.token.upsert({
      where: { token },
      update: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
      },
      create: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
        userId,
        userAgent: agent,
      },
    });
  }
  deleteRefreshToken(token: string) {
    return this.prismaService.token
      .delete({ where: { token } })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
  }

  async providerAuth(email: string, agent: string, provider: Provider) {
    const user = await this.userService
      .update({ email, provider })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user) {
      throw new HttpException(
        `Не получилось создать пользователя с email ${email} в Google auth`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.generateTokens(user, agent);
  }
}
