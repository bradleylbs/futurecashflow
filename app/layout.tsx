import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import ClientToaster from "@/components/ClientToaster"
import { cn } from "@/lib/utils"

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
    <html 
      lang="en" 
      className={cn(
        inter.variable,
        "scroll-smooth antialiased"
      )}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Rich snippets - Exact company information from presentation */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Future Mining Finance",
              "legalName": "Future Mining Finance (Pty) Ltd",
              "description": "Future Mining Finance is a fintech and funding platform enabling mining companies to offer early payment programs for SMEs in their supply chain.",
              "url": "https://futureminingfinance.com",
              "logo": "https://futureminingfinance.com/logo-future-mining-finance.svg",
              "foundingDate": "2024",
              "industry": ["Financial Technology", "Mining Finance", "Supply Chain Finance"],
              "areaServed": {
                "@type": "Place",
                "name": "Africa"
              },
              "identifier": [
                {
                  "@type": "PropertyValue",
                  "name": "Credit Provider Registration Number",
                  "value": "NCRCP18174"
                }
              ],
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "ZA",
                "addressRegion": "Gauteng",
                "addressLocality": "Johannesburg"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Service",
                "email": "contact@futureminingfinance.com",
                "availableLanguage": ["English"]
              },
              "sameAs": [
                "https://linkedin.com/company/future-mining-finance",
                "https://twitter.com/futureminingfinance"
              ],
              "slogan": "African Mining Supply Chain Finance Reimagined",
              "service": [
                {
                  "@type": "FinancialService",
                  "name": "Supply Chain Finance",
                  "description": "Early payment programs for mining suppliers"
                },
                {
                  "@type": "FinancialService", 
                  "name": "Invoice Factoring",
                  "description": "Immediate payment for approved invoices based on mine's credit risk"
                },
                {
                  "@type": "FinancialService",
                  "name": "Mining Supplier Finance",
                  "description": "Specialized financing solutions tailored for mining industry suppliers"
                }
              ],
              "knowsAbout": [
                "Mining Supply Chain Finance",
                "SME Development",
                "African Mining Industry",
                "Early Payment Programs",
                "Invoice Factoring",
                "Financial Technology",
                "Credit Risk Management",
                "Supplier Cash Flow Solutions"
              ],
              "hasCredential": {
                "@type": "EducationalOccupationalCredential",
                "credentialCategory": "Credit Provider License",
                "recognizedBy": {
                  "@type": "Organization",
                  "name": "National Credit Regulator",
                  "sameAs": "https://www.ncr.org.za/"
                }
              }
            })
          }}
        />
        
        {/* Geographic and business meta tags */}
        <meta name="geo.region" content="ZA" />
        <meta name="geo.placename" content="Johannesburg" />
        <meta name="geo.position" content="-26.2041;28.0473" />
        <meta name="ICBM" content="-26.2041, 28.0473" />
        <meta name="language" content="en" />
        <meta name="coverage" content="Africa" />
        <meta name="target" content="mining companies, suppliers, SMEs, financial institutions" />
        <meta name="audience" content="mining industry professionals, financial services" />
        <meta name="topic" content="Mining Finance, Supply Chain Finance, SME Development" />
        <meta name="subject" content="African Mining Supply Chain Finance" />
        
        {/* Business registration information */}
        <meta name="company" content="Future Mining Finance (Pty) Ltd" />
        <meta name="registration" content="NCRCP18174" />
        <meta name="regulator" content="National Credit Regulator" />
        <meta name="services" content="Supply Chain Finance, Early Payment Programs, Invoice Factoring, Mining Finance" />
        <meta name="industry" content="Financial Technology, Mining Finance, Credit Services" />
        <meta name="market" content="African Mining Industry" />
      </head>
      
      <body 
        className={cn(
          "min-h-screen bg-background text-foreground font-sans antialiased",
          inter.className
        )}
      >
        {/* Skip to main content for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md z-50 transition-all duration-200"
        >
          Skip to main content
        </a>
        
        {/* Main content wrapper */}
        <div id="main-content" className="relative">
          {children}
        </div>
        
        {/* Toast notifications */}
        <ClientToaster />
        
        {/* Simple performance and error tracking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Basic performance monitoring
              if ('performance' in window && 'getEntriesByType' in window.performance) {
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    const navEntries = performance.getEntriesByType('navigation');
                    if (navEntries.length > 0) {
                      const navTiming = navEntries[0];
                      const loadTime = navTiming.loadEventEnd - navTiming.loadEventStart;
                      if (loadTime > 0) {
                        console.log('Future Mining Finance - Page load time:', loadTime + 'ms');
                      }
                    }
                  }, 100);
                });
              }
              
              // Error handling
              window.addEventListener('error', function(e) {
                console.error('Application error:', e.error?.message || e.message);
                
                // Handle chunk loading errors in development
                const isChunkError = e?.error && /Loading chunk .* failed/i.test(String(e.error.message || e.message));
                const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
                
                if (isChunkError && isDev) {
                  console.warn('Development chunk error detected, refreshing...');
                  setTimeout(() => window.location.reload(), 100);
                }
              });
              
              // Unhandled promise rejections
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
              });
              
              // Track key metrics
              if ('PerformanceObserver' in window) {
                try {
                  const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.entryType === 'largest-contentful-paint') {
                        console.log('LCP (Largest Contentful Paint):', Math.round(entry.startTime) + 'ms');
                      }
                    }
                  });
                  observer.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (e) {
                  // Observer not supported
                }
              }
            `,
          }}
        />
      </body>
    </html>
  )
}