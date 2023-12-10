import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { map, mergeMap } from 'rxjs';
import { AuthService } from './auth.service';
import { Tokens } from './interfaces';
import { Provider } from '@prisma/client';
import { LoginDto, RegisterDto } from './dto';
import { GoogleGuard } from './guards/google.guard';
import { handleTimeoutAndErrors } from '@lib/helpers';
import { YandexGuard } from './guards/yandex.guard';
import { Cookie, Public, UserAgent } from '@lib/decorators';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { RegisterResponse } from './responses';

const REFRESH_TOKEN = 'refreshtoken';
@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}
  @ApiParam({ name: 'register', type: RegisterDto })
  @ApiOkResponse({ type: RegisterResponse })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('register')
  async register(@Body() dto: RegisterDto, @UserAgent() agent: string) {
    const tokens = await this.authService.register(dto, agent);
    if (!tokens) {
      throw new BadRequestException(
        `Не получается зарегистрировать пользователя с данными ${JSON.stringify(
          dto,
        )}`,
      );
    }

    return tokens.accessToken;
  }
  @ApiParam({ name: 'login', type: LoginDto })
  @ApiOkResponse({ type: RegisterResponse })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    const tokens = await this.authService.login(dto, agent);
    if (!tokens) {
      throw new BadRequestException(
        `Не получается войти с данными ${JSON.stringify(dto)}`,
      );
    }
    this.setRefreshTokenToCookies(tokens, res);
  }
  @ApiOkResponse()
  @Get('logout')
  async logout(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Res() res: Response,
  ) {
    if (!refreshToken) {
      res.sendStatus(HttpStatus.OK);
      return;
    }
    await this.authService.deleteRefreshToken(refreshToken);
    res.cookie(REFRESH_TOKEN, '', {
      httpOnly: true,
      secure: true,
      expires: new Date(),
    });
    res.sendStatus(HttpStatus.OK);
  }

  @Get('refresh-tokens')
  async refreshTokens(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    if (!tokens) {
      throw new UnauthorizedException();
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
    if (!tokens) {
      throw new UnauthorizedException();
    }
    res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
      httpOnly: true,
      sameSite: 'lax',
      expires: new Date(tokens.refreshToken.exp),
      secure:
        this.configService.get('NODE_ENV', 'development') === 'production',
      path: '/',
    });
    res.status(HttpStatus.CREATED).json({ accessToken: tokens.accessToken });
  }

  @UseGuards(GoogleGuard)
  @Get('google')
  googleAuth() {}

  @UseGuards(GoogleGuard)
  @Get('google/callback')
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const NEST_API_URL = this.configService.get('NEST_API_URL');
    if (req.user) {
      const token = req.user['accessToken'];
      return res.redirect(
        `${NEST_API_URL}/api/auth/success-google?token=${token}`,
      );
    }
  }

  @Get('success-google')
  successGoogle(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
      )
      .pipe(
        mergeMap(({ data: { email } }) =>
          this.authService.providerAuth(email, agent, Provider.GOOGLE),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndErrors(),
      );
  }

  @UseGuards(YandexGuard)
  @Get('yandex')
  yandexAuth() {}

  @UseGuards(YandexGuard)
  @Get('yandex/callback')
  yandexAuthCallback(@Req() req: Request, @Res() res: Response) {
    const NEST_API_URL = this.configService.get('NEST_API_URL');
    if (req.user) {
      const token = req.user['accessToken'];
      return res.redirect(
        `${NEST_API_URL}/api/auth/success-yandex?token=${token}`,
      );
    }
  }

  @Get('success-yandex')
  successYandex(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`)
      .pipe(
        mergeMap(({ data: { default_email } }) =>
          this.authService.providerAuth(default_email, agent, Provider.YANDEX),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndErrors(),
      );
  }
}
