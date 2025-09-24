import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import ClientToaster from "@/components/ClientToaster"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"

// Font configuration
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  preload: true,
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: {
    default: "Future Mining Finance - African Mining Supply Chain Finance Reimagined",
    template: "%s | Future Mining Finance"
  },
  description: "Future Mining Finance is a fintech and funding platform enabling mining companies to offer early payment programs for SMEs in their supply chain. Future Mining Finance (Pty) Ltd is a registered Credit Provider NCRCP18174.",
  keywords: [
    "Future Mining Finance",
    "NCRCP18174",
    "registered credit provider",
    "mining finance",
    "supply chain finance",
    "fintech",
    "African mining",
    "SME financing",
    "early payment programs",
    "invoice factoring",
    "cash flow solutions",
    "mining suppliers",
    "accounts payable integration",
    "South Africa mining",
    "mining technology",
    "supplier development"
  ],
  authors: [{ name: "Future Mining Finance (Pty) Ltd" }],
  creator: "Future Mining Finance",
  publisher: "Future Mining Finance",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: 'https://futureminingfinance.com',
    siteName: 'Future Mining Finance',
    title: 'Future Mining Finance - African Mining Supply Chain Finance Reimagined',
    description: 'Future Mining Finance is a fintech and funding platform enabling mining companies to offer early payment programs for SMEs in their supply chain. Registered Credit Provider NCRCP18174.',
    images: [
      {
        url: '/og-future-mining-finance.jpg',
        width: 1200,
        height: 630,
        alt: 'Future Mining Finance - African Mining Supply Chain Finance Reimagined',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Future Mining Finance - African Mining Supply Chain Finance Reimagined',
    description: 'Future Mining Finance is a fintech and funding platform enabling mining companies to offer early payment programs for SMEs in their supply chain.',
    images: ['/twitter-future-mining-finance.jpg'],
    creator: '@futureminingfinance',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#3b82f6' },
    ],
  },
  manifest: '/site.webmanifest',
  category: 'Financial Technology',
  classification: 'Financial Services - Credit Provider',
  referrer: 'origin-when-cross-origin',
  generator: 'Next.js',
  applicationName: 'Future Mining Finance',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Future Mining Finance',
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
  metadataBase: new URL('https://futureminingfinance.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-ZA': '/en-za',
      'en-US': '/en-us',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000', // Black like presentation
  colorScheme: 'light',
}

// Root layout matching presentation exactly
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background text-foreground font-sans antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md z-50 transition-all duration-200">
            Skip to main content
          </a>
          <div id="main-content" className="relative">
            {children}
          </div>
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
