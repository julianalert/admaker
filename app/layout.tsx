import './css/style.css'

import { Inter } from 'next/font/google'
import Theme from './theme-provider'
import AppProvider from './app-provider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://app.yuzuu.co'),
  title: {
    default: 'Yuzuu - AI product photography',
    template: '%s | Yuzuu',
  },
  description: 'Studio-quality AI product photos for PDPs, ads, and socials. Your product stays 100% unchanged. Pay as you go.',
  openGraph: {
    title: 'Yuzuu - AI product photography',
    description: 'Studio-quality AI product photos for PDPs, ads, and socials. Your product stays 100% unchanged.',
    images: [
      {
        url: '/images/thumbnail2.png',
        width: 1200,
        height: 630,
        alt: 'Yuzuu - AI product photography',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yuzuu - AI product photography',
    description: 'Studio-quality AI product photos for PDPs, ads, and socials.',
    images: ['/images/thumbnail2.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>{/* suppressHydrationWarning: https://github.com/vercel/next.js/issues/44343 */}
      <body className="font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <Theme>
          <AppProvider>
            {children}
          </AppProvider>
        </Theme>
      </body>
    </html>
  )
}
