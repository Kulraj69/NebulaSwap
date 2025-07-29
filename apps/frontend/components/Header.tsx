'use client'

import React from 'react'
import Link from 'next/link'
import { Wallet, ChevronDown } from 'lucide-react'
import { useBlockchain } from '../app/providers'

export default function Header() {
  const { walletState, connectEthereum, connectCosmos, disconnect, isLoading } = useBlockchain()

  const isAnyWalletConnected = walletState.ethereum.connected || walletState.cosmos.connected

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg"></div>
            <span className="text-xl font-bold text-gray-900">NebulaSwap</span>
          </Link>

          {/* Navigation */}
          <nav className="flex space-x-8">
            <Link href="/" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Home
            </Link>
            <Link href="/swap" className="text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md text-sm font-medium">
              Swap
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-3">
            {!isAnyWalletConnected ? (
              // Show connect buttons when no wallet is connected
              <div className="flex space-x-2">
                <button
                  onClick={connectEthereum}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  {isLoading ? 'Connecting...' : 'Connect MetaMask'}
                </button>
                <button
                  onClick={connectCosmos}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  {isLoading ? 'Connecting...' : 'Connect Keplr'}
                </button>
              </div>
            ) : (
              // Show connected wallets and disconnect option
              <div className="flex items-center space-x-3">
                {walletState.ethereum.connected && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">
                      ETH: {walletState.ethereum.address?.slice(0, 6)}...{walletState.ethereum.address?.slice(-4)}
                    </span>
                  </div>
                )}
                {walletState.cosmos.connected && (
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium">
                      ATOM: {walletState.cosmos.address?.slice(0, 6)}...{walletState.cosmos.address?.slice(-4)}
                    </span>
                  </div>
                )}
                <button
                  onClick={disconnect}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  Disconnect All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 