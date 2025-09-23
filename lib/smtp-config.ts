// SMTP configuration for nodemailer
export const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // Gmail requires SSL
  auth: {
    user: process.env.SMTP_USER || "your@gmail.com",
    pass: process.env.SMTP_PASS || "your_gmail_app_password",
  },
}
