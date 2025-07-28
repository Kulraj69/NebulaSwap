'use client'

import React, { useState } from 'react'
import { ArrowUpDown, Wallet, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function SwapPage() {
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  const handleSwapTokens = () => {
    // Swap logic will be implemented later
    console.log('Swap tokens functionality coming soon!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gradient">
              NebulaSwap
            </Link>
            <button 
              onClick={() => setIsConnected(!isConnected)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              {isConnected ? 'Connected' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cross-Chain Atomic Swap
          </h1>
          <p className="text-gray-600">
            Swap tokens between Ethereum and Cosmos without bridges
          </p>
        </div>

        {/* Swap Interface */}
        <div className="card">
          {/* From Token */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">You send</span>
                <span className="text-sm text-gray-500">Balance: 0.0 ETH</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 text-2xl font-semibold bg-transparent border-none outline-none"
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                  <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">ETH</span>
                  <span className="text-xs text-gray-500">Sepolia</span>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center my-4">
            <button 
              onClick={handleSwapTokens}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* To Token */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">You receive</span>
                <span className="text-sm text-gray-500">Balance: 0.0 ATOM</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  className="flex-1 text-2xl font-semibold bg-transparent border-none outline-none"
                  readOnly
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                  <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">ATOM</span>
                  <span className="text-xs text-gray-500">Osmosis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Exchange Rate</span>
                <span>1 ETH = 10 ATOM</span>
              </div>
              <div className="flex justify-between">
                <span>Protocol Fee</span>
                <span>0%</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time</span>
                <span>~60 seconds</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button 
            disabled={!isConnected || !fromAmount}
            className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!isConnected ? 'Connect Wallet' : !fromAmount ? 'Enter Amount' : 'Create Atomic Swap'}
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            This is a testnet demonstration. No real funds are at risk.
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <a 
              href="#" 
              className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              How it works
              <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="#" 
              className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 