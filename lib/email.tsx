import nodemailer from "nodemailer"
import { smtpConfig } from "./smtp-config"
import { getBankingUrl, getInvitationUrl, getAllUrls } from "./url-utils"
// Email service for OTP and invitation delivery
// This would integrate with your preferred email service (SendGrid, AWS SES, etc.)

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Brand tokens aligned with app UI
const BRAND = {
  bg: "#000000", // black background
  cardBg: "#111827", // gray-900
  cardBorder: "#1f2937", // gray-800
  text: "#e5e7eb", // gray-200
  textMuted: "#9ca3af", // gray-400
  primary: "#2563eb", // blue-600
  primaryDark: "#1d4ed8", // blue-700
  divider: "#1f2937",
}

// Reusable branded email layout
function renderBrandEmailLayout(options: {
  heading: string
  bodyHtml: string
  ctaLabel?: string
  ctaHref?: string
  preheader?: string
  footerText?: string
}): string {
  const { heading, bodyHtml, ctaHref, ctaLabel, preheader, footerText } = options
  const footer = footerText || "Future  Finance  Cashflow• Secure Financial Services"
  return `
  <div style="margin:0;padding:0;background:${BRAND.bg};">
    ${
      preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden">${preheader}</div>`
        : ""
    }
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
      <div style="border:1px solid ${BRAND.cardBorder};background:${BRAND.cardBg};border-radius:16px;overflow:hidden;">
        <div style="padding:24px 24px 0 24px;border-bottom:1px solid ${BRAND.divider};">
          <div style="display:flex;align-items:center;gap:8px;color:${BRAND.text};">
            <span style="font-size:20px;font-weight:800;letter-spacing:0.3px;">Future</span>
            <span style="width:1px;height:18px;background:${BRAND.primary};display:inline-block;"></span>
            <span style="font-size:16px;font-weight:400;color:${BRAND.textMuted};white-space:nowrap;">Finance Cashflow</span>
          </div>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 12px 0;color:${BRAND.text};font-size:22px;font-weight:700;">${heading}</h2>
          <div style="color:${BRAND.textMuted};line-height:1.6;font-size:14px;">${bodyHtml}</div>
          ${
            ctaHref
              ? `<div style="text-align:center;margin:28px 0 8px 0;">
                  <a href="${ctaHref}"
                     style="background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;display:inline-block;font-weight:700;box-shadow:0 8px 20px rgba(37,99,235,0.35)">
                    ${ctaLabel || "Open Dashboard"}
                  </a>
                 </div>`
              : ""
          }
        </div>
        <div style="padding:16px 24px;border-top:1px solid ${BRAND.divider};">
          <p style="margin:0;color:${BRAND.textMuted};font-size:12px;text-align:center;">${footer}</p>
        </div>
      </div>
    </div>
  </div>`
}

export async function sendOTPEmail(email: string, otp: string, purpose: string): Promise<boolean> {
  try {
    const template = getOTPEmailTemplate(otp, purpose)
    const transporter = nodemailer.createTransport(smtpConfig)
    await transporter.sendMail({
      from: smtpConfig.auth.user,
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    return true
  } catch (error) {
    console.error("Failed to send OTP email:", error)
    return false
  }
}

export async function sendSupplierBankingResubmissionEmail(
  supplierEmail: string,
  companyName?: string,
  notes?: string,
  request?: Request,
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport(smtpConfig)
    const heading = "Action required: Please resubmit banking details"
    const paragraphs: string[] = [
      "Our admin team reviewed your submission and requires updated banking details to proceed.",
    ]
    if (notes) {
      paragraphs.push(`Admin notes: ${notes}`)
    }
    const bodyHtml = paragraphs.map((p) => `<p style="margin:0 0 12px 0;">${p}</p>`).join("")

    const ctaHref = getBankingUrl(request)
    const html = renderBrandEmailLayout({
      heading,
      bodyHtml,
      ctaHref,
      ctaLabel: "Resubmit Banking Details",
      preheader: "Banking resubmission required to continue onboarding",
      footerText: `${companyName ? companyName + " • " : ""}Future Finance Cashflow • Secure Financial Services`,
    })
    const text = [
      heading,
      "",
      ...paragraphs,
      `Action: ${ctaHref}`,
    ].join("\n")

    await transporter.sendMail({
      from: smtpConfig.auth.user,
      to: supplierEmail,
      subject: "Banking Details Resubmission Required",
      text,
      html,
    })
    return true
  } catch (err) {
    console.error("Failed to send supplier banking resubmission email:", err)
    return false
  }
}

export async function sendInvitationEmail(
  buyerName: string,
  supplierEmail: string,
  companyName: string,
  invitationToken: string,
  message?: string,
  request?: Request,
): Promise<boolean> {
  try {
    const template = getInvitationEmailTemplate(buyerName, companyName, invitationToken, message, request)
    const transporter = nodemailer.createTransport(smtpConfig)
    await transporter.sendMail({
      from: smtpConfig.auth.user,
      to: supplierEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    return true
  } catch (error) {
    console.error("Failed to send invitation email:", error)
    return false
  }
}

export async function sendBuyerMilestoneEmail(
  buyerEmail: string,
  subject: string,
  body: { heading: string; paragraphs: string[]; ctaLabel?: string; ctaHref?: string },
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport(smtpConfig)
    const bodyHtml = body.paragraphs
      .map((p) => `<p style="margin:0 0 12px 0;">${p}</p>`)
      .join("")

    const html = renderBrandEmailLayout({
      heading: body.heading,
      bodyHtml,
      ctaHref: body.ctaHref,
      ctaLabel: body.ctaLabel,
      preheader: body.paragraphs[0] || body.heading,
    })
    const text = [body.heading, "", ...body.paragraphs, body.ctaHref ? `Action: ${body.ctaHref}` : ""].join("\n")

    await transporter.sendMail({
      from: smtpConfig.auth.user,
      to: buyerEmail,
      subject,
      text,
      html,
    })
    return true
  } catch (err) {
    console.error("Failed to send buyer milestone email:", err)
    return false
  }
}

function getOTPEmailTemplate(otp: string, purpose: string): EmailTemplate {
  const purposeText =
    {
      registration: "complete your registration",
      login: "verify your login",
      password_reset: "reset your password",
      email_change: "verify your new email address",
    }[purpose] || "verify your account"

  const codeBlock = `
    <div style="background:${BRAND.bg};border:1px solid ${BRAND.cardBorder};padding:20px;text-align:center;margin:18px 0;border-radius:12px;">
      <div style="color:${BRAND.text};font-size:28px;font-weight:900;letter-spacing:6px;font-family:Consolas, 'SFMono-Regular', Menlo, Monaco, 'Liberation Mono', 'Courier New', monospace;">${otp}</div>
    </div>`

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hello,</p>
    <p style="margin:0 0 12px 0;">Please use the following verification code to ${purposeText}:</p>
    ${codeBlock}
    <p style="margin:0 0 12px 0;color:#fca5a5;">This code will expire in 10 minutes.</p>
    <p style="margin:0;">If you didn't request this verification, please ignore this email.</p>
  `

  return {
    subject: `Your Future Cashflow verification code: ${otp}`,
    html: renderBrandEmailLayout({
      heading: "Email Verification",
      bodyHtml,
      preheader: `Use this code to ${purposeText}: ${otp}`,
    }),
    text: `Future Cashflow - Email Verification\n\nUse this code to ${purposeText}: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this verification, please ignore this email.`,
  }
}

function getInvitationEmailTemplate(
  buyerName: string,
  companyName: string,
  invitationToken: string,
  message?: string,
  request?: Request,
): EmailTemplate {
  // Build dual links: primary (e.g., dev tunnel) and localhost
  const { primary, local } = getAllUrls()
  const trimSlash = (u: string) => (u || "").replace(/\/$/, "")
  const registrationUrlPrimary = `${trimSlash(primary)}/register/supplier?token=${invitationToken}`
  const registrationUrlLocal = `${trimSlash(local)}/register/supplier?token=${invitationToken}`
  // Backward compatible, derive contextual URL too (not shown, but in case CTA fallback is needed)
  const contextualUrl = getInvitationUrl(invitationToken, request)
  const ctaUrl = registrationUrlPrimary || contextualUrl || registrationUrlLocal
  const mineCode = invitationToken.slice(0, 8).toUpperCase()

  const messageBlock = message
    ? `<div style="background:${BRAND.bg};border:1px solid ${BRAND.cardBorder};padding:16px;border-radius:12px;margin:16px 0;">
         <p style="margin:0;color:${BRAND.text};font-style:italic;">"${message}"</p>
       </div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hello,</p>
    <p style="margin:0 0 12px 0;"><strong style="color:${BRAND.text}">${buyerName}</strong> has invited <strong style="color:${BRAND.text}">${companyName}</strong> to join Future Cashflow as a supplier.</p>
    ${messageBlock}
    <p style="margin:0 0 12px 0;">Use your secure code <strong style="color:${BRAND.text}">${mineCode}</strong> and click the button below to register your company:</p>
    <p style="margin:12px 0 0 0;color:${BRAND.textMuted}">Or copy one of these links into your browser:</p>
    <div style="background:${BRAND.bg};border:1px solid ${BRAND.cardBorder};padding:12px;border-radius:8px;margin:8px 0;">
      <p style="margin:0 0 6px 0;color:${BRAND.textMuted};font-size:12px;">External (for testers):</p>
      <p style="margin:0;word-break:break-all;color:${BRAND.primary};font-family:monospace;font-size:12px;">${registrationUrlPrimary}</p>
    </div>
    <div style="background:${BRAND.bg};border:1px solid ${BRAND.cardBorder};padding:12px;border-radius:8px;margin:8px 0;">
      <p style="margin:0 0 6px 0;color:${BRAND.textMuted};font-size:12px;">Local (on your machine):</p>
      <p style="margin:0;word-break:break-all;color:${BRAND.primary};font-family:monospace;font-size:12px;">${registrationUrlLocal}</p>
    </div>
    <p style="margin:12px 0 0 0;color:#fca5a5"><strong>This invitation expires in 7 days.</strong></p>
  `

  return {
    subject: `Invitation to join Future Cashflow from ${buyerName}`,
    html: renderBrandEmailLayout({
      heading: "You're invited to join Future Cashflow",
      bodyHtml,
      ctaHref: ctaUrl,
      ctaLabel: "Register Now",
      preheader: `${buyerName} invited ${companyName} to join Future Cashflow`,
    }),
    text: `You're invited to join Future Cashflow\n\n${buyerName} has invited ${companyName} to join Future Cashflow as a supplier.\n\n${
      message ? `Message: "${message}"\n\n` : ""
    }Your secure code: ${mineCode}\nTo register (external): ${registrationUrlPrimary}\nLocal (developer): ${registrationUrlLocal}\n\nThis invitation expires in 7 days.`,
  }
}
