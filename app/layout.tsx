import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'THREEFOLD Encryption',
  description: 'Secure text and file encryption platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
