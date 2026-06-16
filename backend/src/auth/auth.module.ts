import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantGuard } from './tenant.guard';
import { RolesGuard } from './roles.guard';

// Fail-fast at module load: JWT_SECRET must be set or any secret-derived
// operation in this module (signing tokens, validating tokens) is unsafe.
// Mirrors the same check in jwt.strategy.ts:16-19.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required. Server cannot start without it.',
  );
}
const ACTIVE_JWT_SECRET = JWT_SECRET + '_v2';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: ACTIVE_JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TenantGuard, RolesGuard],
  exports: [AuthService, JwtModule, PassportModule, TenantGuard, RolesGuard],
})
export class AuthModule {}
