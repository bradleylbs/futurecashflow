# KYC Platform

## Brand notes
- Primary brand accent is `text-blue-600`. Wherever a `LogoIcon` appears next to the word `Future`, it should be explicitly blue.
- Use `@/components/brand-logo` helpers when possible:
  - `LogoIcon`
  - `FutureCashflowBrand`
  - `FutureCashflowLink`

## Email preview/testing (local)
Until a dedicated email preview route is added, use these tips:
- All transactional emails are composed in `lib/email.tsx` using a centralized dark layout.
- During development, set the env `EMAIL_DEV_MODE=true` and point the transport to a local catcher (e.g., MailHog or Papercut):
  - MailHog (Docker): `docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog`
  - Configure your SMTP envs to `localhost:1025`.
- Add temporary test calls inside any dev-only route (e.g., `app/api/dev/email-test/route.ts`) to render and send a sample:
  - OTP: `sendOtpEmail(email, code, purpose)`
  - Invitation: `sendSupplierInvitationEmail(buyerName, companyName, inviteLink)`
  - Banking Resubmission: `sendSupplierBankingResubmissionEmail(email, resubmitLink)`

## Run
- Install deps: `pnpm install`
- Dev: `pnpm dev`

## Notes
- Currency is standardized to `R` across UI.
- Access gating is centralized via `/api/dashboard/status`.
