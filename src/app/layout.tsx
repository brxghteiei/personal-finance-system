import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import '@fontsource-variable/noto-sans-thai'
import { AppHeader, AppToolbar } from '@/components/finance/app-header'
import { FinanceProvider } from '@/components/finance/finance-provider'
import { GuidedTour } from '@/components/finance/guided-tour'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Personal Finance System',
  description: 'ระบบจัดการการเงินส่วนบุคคล',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#11191b',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${GeistSans.variable} ${GeistMono.variable} bg-background`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <FinanceProvider>
            <div className="flex min-h-dvh">
              <AppHeader />
              <div className="min-w-0 flex-1">
                <AppToolbar />
                {children}
              </div>
            </div>
            <GuidedTour />
          </FinanceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
