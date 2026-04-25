import type { Metadata } from 'next'
import { Poppins, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import MobileLayout from '@/components/MobileLayout'
import { ThemeProvider } from '@/components/ThemeProvider'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Artiverse Control',
  description: 'Dashboard de outreach y micro-CRM para Artiverse',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Artiverse',
  },
  icons: {
    icon: '/icon-512.png',
    apple: '/apple-touch-icon.png',
    shortcut: '/icon-192.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${jetbrainsMono.variable}`} data-theme="dark">
      <head>
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Artiverse" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={poppins.className}>
        <ThemeProvider>
          <MobileLayout>{children}</MobileLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
