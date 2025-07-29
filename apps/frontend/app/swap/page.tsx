'use client'

import React from 'react'
import Header from '../../components/Header'
import SwapInterface from '../../components/SwapInterface'

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <SwapInterface />
      </main>
    </div>
  )
} 