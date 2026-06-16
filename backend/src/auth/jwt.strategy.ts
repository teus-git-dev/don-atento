import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string | null;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is required. Server cannot start without it.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token: string | null = null;
          if (request?.cookies) {
            token =
              (request.cookies as Record<string, string>)[
                'don_atento_token_v1'
              ] ?? null;
          }
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET + '_v2',
    });
  }

  async validate(payload: JwtPayload) {
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
      throw new UnauthorizedException('Usuario inactivo o no encontrado.');
    }

    return user; // Este objeto se monta en req.user
  }
}
