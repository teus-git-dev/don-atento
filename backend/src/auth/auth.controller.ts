import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
