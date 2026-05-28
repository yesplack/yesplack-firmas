import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Grupo El Ombú — Firmas Digitales',
  description: 'Sistema de firma digital de listas de precios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
