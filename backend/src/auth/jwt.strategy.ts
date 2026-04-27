import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string | null;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'donatento_local_dev_secret_1234567890_donatento_local_dev_secret_1234567890',
    });
  }

  async validate(payload: JwtPayload) {
    console.log('[JwtStrategy] Validating payload:', JSON.stringify(payload));
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        tenantId: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      console.warn('[JwtStrategy] User not found or inactive:', payload.sub);
      throw new UnauthorizedException('Usuario inactivo o no encontrado.');
    }

    console.log('[JwtStrategy] User validated successfully:', user.email);
    return user; // Este objeto se monta en req.user
  }
}
