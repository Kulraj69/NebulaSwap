import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'NebulaSwap - Cross-Chain Atomic Swap Protocol',
  description: 'Trustless cross-chain atomic swaps between Ethereum and Cosmos using HTLCs',
  keywords: 'blockchain, defi, cross-chain, atomic swap, ethereum, cosmos, htlc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 