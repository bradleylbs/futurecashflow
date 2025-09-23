/**
 * URL utilities for handling both localhost and external URLs
 */

export function getBaseUrl(request?: Request): string {
  // If we have a request object, try to determine from headers
  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host') || undefined
    const host = forwardedHost || request.headers.get('host') || undefined
    const headerProto = request.headers.get('x-forwarded-proto') || undefined
    let proto = headerProto
    if (!proto) {
      try {
        proto = new URL((request as any).url || '').protocol.replace(':', '') || undefined
      } catch {}
    }

    // If it's a dev tunnel URL, force HTTPS
    if (host && host.includes('devtunnels.ms')) {
      return `https://${host}`
    }

    // If running from localhost but a public app URL is configured, prefer the configured URL
    if (host && host.includes('localhost')) {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL
      }
      return `${proto || 'http'}://${host}`
    }

    if (host) {
      return `${proto || 'http'}://${host}`
    }
  }

  // Fallback to environment variables
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL_LOCAL || "http://localhost:3000"
}

export function getInvitationUrl(token: string, request?: Request): string {
  const baseUrl = getBaseUrl(request)
  return `${baseUrl}/register/supplier?token=${token}`
}

export function getBankingUrl(request?: Request): string {
  const baseUrl = getBaseUrl(request)
  return `${baseUrl}/supplier/banking`
}

export function getDashboardUrl(userType: 'buyer' | 'supplier' | 'admin' = 'buyer', request?: Request): string {
  const baseUrl = getBaseUrl(request)
  return `${baseUrl}/dashboard/${userType}`
}

// For backwards compatibility - returns both URLs
export function getAllUrls(): { primary: string; local: string } {
  return {
    primary: process.env.NEXT_PUBLIC_APP_URL || "https://3xvlwdkq-3000.uks1.devtunnels.ms",
    local: process.env.NEXT_PUBLIC_APP_URL_LOCAL || "http://localhost:3000"
  }
}