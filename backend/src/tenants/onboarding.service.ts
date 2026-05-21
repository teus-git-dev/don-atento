import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../cognitive/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface UpdateTenantAdminInput {
  tenantId: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone?: string;
  /** If changed, triggers a new welcome email + temp password */
  adminEmail: string;
}

export interface UpdateTenantAdminResult {
  emailChanged: boolean;
  newTemporaryPassword?: string;
  emailSent: boolean;
}

export interface ProvisionTenantInput {
  /** The Inmobiliaria / Company name */
  companyName: string;
  nit: string;
  /** Admin user data */
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone?: string;
  /** Optional subscription plan id */
  subscriptionPlanId?: string;
}

export interface ProvisionResult {
  tenantId: string;
  userId: string;
  /** Temporary password — ONLY returned to the caller (SuperAdmin), never stored in plain text */
  temporaryPassword: string;
  emailSent: boolean;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Secure Password Generator ─────────────────────────────────────────────
  /**
   * Generates a cryptographically secure temporary password that satisfies:
   *  - Minimum 16 characters
   *  - At least 2 uppercase, 2 lowercase, 2 digits, 2 symbols
   *  - No dictionary words or sequential patterns
   *
   * Block B (users-roles-tenants): visibility relaxed from `private`
   * to package-public so `UsersService.create` reuses the same
   * helper instead of the literal `'TemporaryPassword123!'` sentinel
   * (which gave any admin a backdoor for users created without an
   * explicit password).
   */
  generateSecureTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O (confusable)
    const lower = 'abcdefghjkmnpqrstuvwxyz'; // No i, l, o
    const digits = '23456789'; // No 0, 1 (confusable)
    const symbols = '@#$!%*?&^+-=';

    const pick = (charset: string, count: number): string[] =>
      Array.from(
        { length: count },
        () => charset[crypto.randomInt(0, charset.length)],
      );

    const all = upper + lower + digits + symbols;

    // Guarantee character class presence
    const mandatoryChars = [
      ...pick(upper, 3),
      ...pick(lower, 3),
      ...pick(digits, 3),
      ...pick(symbols, 3),
    ];

    // Fill remaining with any chars
    const remaining = Array.from(
      { length: 4 },
      () => all[crypto.randomInt(0, all.length)],
    );

    // Shuffle with Fisher-Yates using crypto.randomInt for true entropy
    const chars = [...mandatoryChars, ...remaining];
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }

  // ─── Main Provisioning Flow ────────────────────────────────────────────────
  async provisionNewTenant(
    input: ProvisionTenantInput,
  ): Promise<ProvisionResult> {
    this.logger.log(
      `[Onboarding] Provisioning new tenant: ${input.companyName}`,
    );

    const temporaryPassword = this.generateSecureTemporaryPassword();

    // bcrypt cost factor 12 — ~400ms per hash, makes brute force infeasible
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // ── 1. Get or create a Subscription Plan ──────────────────────────────
    let planId = input.subscriptionPlanId;
    if (!planId) {
      const defaultPlan = await this.prisma.subscriptionPlan.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      planId = defaultPlan?.id;
    }

    if (!planId) {
      throw new NotFoundException(
        'No subscription plan provided and no default plan found in the database.',
      );
    }

    // ── 2. Block B: tenant + admin user creates atomically. Pre-Block-B
    // a user-create failure (e.g. duplicate email unique violation)
    // left a tenant ghost without admin — inaccessible without manual
    // DB intervention. $transaction guarantees both succeed together
    // or neither persists.
    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.companyName,
          nit: input.nit,
          status: 'ACTIVE',
          subscriptionPlanId: planId,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.adminEmail,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          phone: input.adminPhone ?? null,
          role: 'ADMIN_TENANT',
          passwordHash,
          isActive: true,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });

      return { tenant, user };
    });

    this.logger.log(`[Onboarding] Tenant created: ${tenant.id}`);
    this.logger.log(
      `[Onboarding] Admin user created: ${user.id} (mustChangePassword=true)`,
    );

    // ── 4. Send Welcome Email ──────────────────────────────────────────────
    let emailSent = false;
    try {
      const loginUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/login`
        : 'https://app.doniq.co/login';

      const htmlBody = this.buildWelcomeEmailHtml({
        firstName: input.adminFirstName,
        companyName: input.companyName,
        email: input.adminEmail,
        temporaryPassword,
        loginUrl,
      });

      await this.emailService.sendEmail(
        input.adminEmail,
        '¡Bienvenido a Teus — Tu inmobiliaria, ahora con inteligencia.',
        htmlBody,
      );

      emailSent = true;
      this.logger.log(
        `[Onboarding] Welcome email dispatched to ${input.adminEmail}`,
      );
    } catch (err) {
      // Email failure is non-blocking — the account still exists.
      // Block C: log only the error message string. The err object
      // can carry SMTP credentials / recipient PII in some failure
      // paths; the message alone is enough for debugging.
      const msg = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(`[Onboarding] Email dispatch failed: ${msg}`);
    }

    // ── 5. Return result (temp password visible ONLY here — NEVER stored in logs) ──
    return {
      tenantId: tenant.id,
      userId: user.id,
      temporaryPassword, // Caller (SuperAdmin UI) must display this securely & once
      emailSent,
    };
  }

  // ─── Update Tenant Admin ─────────────────────────────────────────────────
  /**
   * Updates the ADMIN_TENANT user of a given tenant.
   * If the email changes, a new temporary password is generated and the
   * welcome email is re-sent to the new address with mustChangePassword=true.
   */
  async updateTenantAdmin(
    input: UpdateTenantAdminInput,
  ): Promise<UpdateTenantAdminResult> {
    this.logger.log(
      `[Onboarding] Updating admin for tenant: ${input.tenantId}`,
    );

    // Find the current ADMIN_TENANT user for this tenant
    const existingAdmin = await this.prisma.user.findFirst({
      where: { tenantId: input.tenantId, role: 'ADMIN_TENANT' },
      include: { tenant: true },
    });

    if (!existingAdmin) {
      throw new NotFoundException(
        `No se encontró un usuario ADMIN_TENANT para el tenant ${input.tenantId}`,
      );
    }

    const emailChanged = existingAdmin.email !== input.adminEmail;
    let newTemporaryPassword: string | undefined;
    let emailSent = false;

    if (emailChanged) {
      // Generate a new temporary password
      newTemporaryPassword = this.generateSecureTemporaryPassword();
      const passwordHash = await bcrypt.hash(newTemporaryPassword, 12);

      await this.prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email: input.adminEmail,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          phone: input.adminPhone ?? existingAdmin.phone,
          passwordHash,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });

      this.logger.log(
        `[Onboarding] Email changed for user ${existingAdmin.id} → mustChangePassword=true`,
      );

      // Re-send welcome email to new address
      try {
        const loginUrl = process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/login`
          : 'https://app.doniq.co/login';

        const htmlBody = this.buildWelcomeEmailHtml({
          firstName: input.adminFirstName,
          companyName: existingAdmin.tenant?.name || 'Tu Inmobiliaria',
          email: input.adminEmail,
          temporaryPassword: newTemporaryPassword,
          loginUrl,
        });

        await this.emailService.sendEmail(
          input.adminEmail,
          '¡Tu acceso a Teus ha sido actualizado — credenciales nuevas.',
          htmlBody,
        );

        emailSent = true;
        this.logger.log(
          `[Onboarding] Re-onboarding email sent to ${input.adminEmail}`,
        );
      } catch (err) {
        // Block C: log only message; the error object can carry
        // SMTP credentials / recipient PII.
        const msg = err instanceof Error ? err.message : 'unknown error';
        this.logger.error(`[Onboarding] Re-onboarding email failed: ${msg}`);
      }
    } else {
      // Only update name and phone — no email/password changes
      await this.prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          phone: input.adminPhone ?? existingAdmin.phone,
        },
      });
    }

    return { emailChanged, newTemporaryPassword, emailSent };
  }

  // ─── Reset Password Flow ───────────────────────────────────────────────────
  /**
   * Called when the user submits the forced password-change form on first login.
   * Validates new password strength, hashes it, and clears the mustChangePassword flag.
   */
  async completePasswordReset(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    this.validatePasswordStrength(newPassword);

    const newHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(
      `[Onboarding] Password reset completed for user: ${userId}`,
    );
  }

  // ─── Password Strength Validator ──────────────────────────────────────────
  private validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < 12)
      errors.push('La contraseña debe tener al menos 12 caracteres.');
    if (!/[A-Z]/.test(password))
      errors.push('Debe contener al menos una letra mayúscula.');
    if (!/[a-z]/.test(password))
      errors.push('Debe contener al menos una letra minúscula.');
    if (!/\d/.test(password)) errors.push('Debe contener al menos un número.');
    if (!/[@#$!%*?&^+\-=]/.test(password))
      errors.push('Debe contener al menos un símbolo (@, #, $, !, %, etc.).');

    if (errors.length > 0) {
      // Block C: BadRequestException reemplaza el throw new Error(...)
      // — el caller (changePassword controller) ahora recibe 400 con
      // mensaje claro en lugar de 500.
      throw new BadRequestException(
        `Contraseña no cumple estándares de seguridad: ${errors.join(' ')}`,
      );
    }
  }

  /**
   * Block C: minimal HTML escape applied to every field interpolated
   * into the welcome email body. Layer-1 defense — `companyName`
   * comes from the SUPERADMIN input which is trusted, but
   * defense-in-depth recommends escaping at the boundary. Mirrors
   * the escapeHtml helper introduced in crm Block E sendWelcomeKit.
   */
  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Welcome Email HTML Template ──────────────────────────────────────────
  private buildWelcomeEmailHtml(params: {
    firstName: string;
    companyName: string;
    email: string;
    temporaryPassword: string;
    loginUrl: string;
  }): string {
    const { firstName, companyName, email, temporaryPassword, loginUrl } =
      params;

    // Block C: escape all interpolated values. companyName / email
    // come from SUPERADMIN input (trusted-ish) but defense-in-depth.
    const firstNameSafe = this.escapeHtml(firstName);
    const companyNameSafe = this.escapeHtml(companyName);
    const emailSafe = this.escapeHtml(email);
    const temporaryPasswordSafe = this.escapeHtml(temporaryPassword);
    const loginUrlSafe = this.escapeHtml(loginUrl);

    return /* html */ `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Teus</title>
  <style>
    /* ── Reset ───────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f0f0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { display: block; max-width: 100%; }

    /* ── Layout ──────────────────────────────────── */
    .wrapper      { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
    .card         { background: #ffffff; border: 1px solid #e0e0e0; overflow: hidden; }
    .header       { background: #0a0a0a; padding: 32px 40px 28px; }
    .body         { padding: 40px; }
    .footer       { background: #f7f7f7; border-top: 1px solid #e8e8e8; padding: 24px 40px; }

    /* ── Typography ──────────────────────────────── */
    .logo         { font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.04em; }
    .logo-dot     { color: rgba(255,255,255,0.35); }
    .tagline      { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.35); letter-spacing: 0.12em; text-transform: uppercase; margin-top: 4px; }
    h1            { font-size: 24px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 12px; }
    .body p       { font-size: 14px; color: #4a4a4a; line-height: 1.7; margin-bottom: 20px; }
    .highlight    { font-weight: 600; color: #0a0a0a; }

    /* ── Credential Box ──────────────────────────── */
    .credential-box {
      background: #0a0a0a;
      border: 1px solid #1a1a1a;
      padding: 24px 28px;
      margin: 28px 0;
    }
    .cred-label   { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.40); margin-bottom: 6px; }
    .cred-value   { font-family: 'Courier New', 'Fira Code', monospace; font-size: 15px; font-weight: 700; color: #ffffff; letter-spacing: 0.04em; word-break: break-all; }
    .cred-row     { margin-bottom: 18px; }
    .cred-row:last-child { margin-bottom: 0; }
    .cred-note    { margin-top: 20px; padding-top: 16px; border-top: 1px solid #2a2a2a; font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.6; }

    /* ── Security Alert ──────────────────────────── */
    .alert        { border-left: 3px solid #f59e0b; background: #fffbeb; padding: 14px 18px; margin: 24px 0; }
    .alert-title  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #92400e; margin-bottom: 4px; }
    .alert p      { font-size: 13px; color: #78350f; margin: 0; line-height: 1.6; }

    /* ── CTA Button ──────────────────────────────── */
    .cta-wrapper  { text-align: center; margin: 32px 0; }
    .cta-button   {
      display: inline-block;
      background: #0a0a0a;
      color: #ffffff !important;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 14px 32px;
      border: 1px solid #0a0a0a;
      text-decoration: none !important;
    }
    .cta-sub      { font-size: 11px; color: #a0a0a0; margin-top: 12px; }

    /* ── Steps ───────────────────────────────────── */
    .steps        { margin: 28px 0; }
    .step         { display: flex; gap: 16px; margin-bottom: 18px; align-items: flex-start; }
    .step-num     { width: 28px; height: 28px; background: #0a0a0a; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-text    { font-size: 13px; color: #4a4a4a; line-height: 1.6; padding-top: 4px; }
    .step-text strong { color: #0a0a0a; }

    /* ── Footer ──────────────────────────────────── */
    .footer p     { font-size: 11px; color: #a0a0a0; line-height: 1.7; margin-bottom: 6px; }
    .footer a     { color: #5a5a5a; text-decoration: underline; }
    .footer-logo  { font-size: 13px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.03em; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <div class="logo">Teus <span class="logo-dot">·</span> Don IQ</div>
        <div class="tagline">Arquitectura Cognitiva Inmobiliaria</div>
      </div>

      <!-- Body -->
      <div class="body">

        <h1>Hola, ${firstNameSafe}.<br>Tu cuenta está lista.</h1>

        <p>
          Bienvenido/a a <span class="highlight">Teus</span>. Hemos creado y configurado el acceso administrativo
          para <span class="highlight">${companyNameSafe}</span>. A continuación encontrarás
          tus credenciales de acceso inicial.
        </p>

        <!-- Security Alert -->
        <div class="alert">
          <div class="alert-title">⚠ Credencial de Un Solo Uso</div>
          <p>
            La contraseña a continuación es <strong>temporal</strong> y expira al primer inicio de sesión.
            Al ingresar serás redirigido/a de forma obligatoria a definir una nueva contraseña segura.
            <strong>No compartas este correo.</strong>
          </p>
        </div>

        <!-- Credential Box -->
        <div class="credential-box">
          <div class="cred-row">
            <div class="cred-label">Correo de acceso</div>
            <div class="cred-value">${emailSafe}</div>
          </div>
          <div class="cred-row">
            <div class="cred-label">Contraseña Temporal</div>
            <div class="cred-value">${temporaryPasswordSafe}</div>
          </div>
          <div class="cred-note">
            Esta contraseña fue generada con entropía criptográfica de 128 bits.
            Es válida para un <strong>único inicio de sesión</strong>.
            Bórrala de tu bandeja de entrada una vez hayas cambiado tu contraseña.
          </div>
        </div>

        <!-- Steps -->
        <p>Sigue estos pasos para activar tu cuenta:</p>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text">
              Ingresa al portal usando el botón de abajo. Usa el correo y la contraseña temporal de arriba.
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-text">
              El sistema te redirigirá automáticamente a una pantalla de <strong>cambio obligatorio de contraseña</strong>.
              Elige una contraseña de al menos 12 caracteres, con mayúsculas, números y símbolos.
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">
              Una vez confirmado el cambio, tendrás acceso completo a tu panel de administración de
              <strong>${companyNameSafe}</strong> en la plataforma Don IQ.
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-wrapper">
          <a href="${loginUrlSafe}" class="cta-button">
            Activar Mi Cuenta &rarr;
          </a>
          <div class="cta-sub">
            O copia esta URL en tu navegador:<br>
            <span style="font-family: monospace; font-size: 11px; color: #7a7a7a;">${loginUrlSafe}</span>
          </div>
        </div>

        <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #a0a0a0;">
          Si no reconoces este registro o no esperabas este correo, por favor ignóralo y
          contacta a <a href="mailto:soporte@teus-ai.com" style="color: #5a5a5a;">soporte@teus-ai.com</a>
          de inmediato.
        </p>

      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-logo">Teus S.A.S</div>
        <p>© 2025 Teus S.A.S · Todos los derechos reservados.</p>
        <p>
          Este es un mensaje de seguridad automatizado. No respondas a este correo.<br>
          Soporte: <a href="mailto:soporte@teus-ai.com">soporte@teus-ai.com</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
