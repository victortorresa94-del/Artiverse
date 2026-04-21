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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${jetbrainsMono.variable}`} data-theme="dark">
      <body className={poppins.className}>
        <ThemeProvider>
          <MobileLayout>{children}</MobileLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
