import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OnboardingService } from './onboarding.service';
import { EmailService } from '../cognitive/email.service';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [OnboardingService, EmailService],
  exports: [OnboardingService],
})
export class TenantsModule {}
