import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      body.email,
      body.password,
    );

    res.cookie('don_atento_token_v1', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 1000, // 1 hour
      path: '/',
    });

    res.cookie('don_atento_refresh_v1', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000, // 7 days
      path: '/api/auth/refresh', // only sent to refresh endpoint
    });

    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cerrar sesión: invalida todos los refresh tokens del usuario y limpia cookies',
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Best-effort DB invalidation — cookie cleanup must succeed regardless.
    const rawAccessToken = req.cookies?.['don_atento_token_v1'];
    await this.authService.logout(rawAccessToken);

    res.clearCookie('don_atento_token_v1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('don_atento_refresh_v1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
    });
    return { success: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar JWT usando Refresh Token' })
  async refresh(
    @Body() body: any, // or @Req() to get cookies
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies['don_atento_refresh_v1'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refreshToken(refreshToken);

    res.cookie('don_atento_token_v1', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 1000, // 1 hour
      path: '/',
    });

    res.cookie('don_atento_refresh_v1', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000, // 7 days
      path: '/api/auth/refresh',
    });

    return { user };
  }
}
