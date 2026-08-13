import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Nunito, Caveat } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SiteFooter } from '@/components/site-footer'
import { SITE_NAME, SITE_DESCRIPTION, siteUrl } from '@/lib/site'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

// Handwriting face used only on the printable fold card, so it never affects
// the rest of the UI. Exposed as a CSS variable for inline styles on the card.
const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Say thank you in a way that feels like you`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: 'v0.app',
  keywords: [
    'thank you notes',
    'thank-you note app',
    'gift tracker',
    'wedding thank you notes',
    'baby shower thank you notes',
    'AI thank you notes',
    'handwritten thank you cards',
    'gratitude',
  ],
  authors: [{ name: 'Capstone Consulting' }],
  creator: 'Capstone Consulting',
  publisher: 'Capstone Consulting',
  alternates: { canonical: '/' },
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Say thank you in a way that feels like you`,
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Say thank you in a way that feels like you`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6ede4',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} ${caveat.variable} bg-background`}>
      <body className="font-sans antialiased">
        <TooltipProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </TooltipProvider>
        <Toaster richColors position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
