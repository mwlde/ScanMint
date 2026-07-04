
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ScanMint',
  description: 'AI-powered document scanner — detect, align, and classify instantly.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0, backgroundColor: '#F5F5F5' }}>
        <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100dvh', position: 'relative', overflow: 'hidden', backgroundColor: 'white' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
