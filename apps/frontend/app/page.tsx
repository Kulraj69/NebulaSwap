'use client'

import { useState } from 'react'
import { ArrowRight, Shield, Zap, Globe, Lock } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="text-gradient">NebulaSwap</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionary cross-chain atomic swap protocol enabling trustless trading between 
              Ethereum and Cosmos ecosystems without bridges or intermediaries.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/swap" 
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
              >
                Start Swapping
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="btn-secondary text-lg px-8 py-3">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose NebulaSwap?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of cross-chain trading with cryptographic guarantees and zero trust requirements.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trustless</h3>
              <p className="text-gray-600">
                No bridges, intermediaries, or wrapped tokens. Pure cryptographic security.
              </p>
            </div>
            
            <div className="card text-center">
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant</h3>
              <p className="text-gray-600">
                Atomic execution ensures both sides succeed or both fail. No partial states.
              </p>
            </div>
            
            <div className="card text-center">
              <div className="w-12 h-12 bg-cosmos-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-cosmos-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cross-Chain</h3>
              <p className="text-gray-600">
                Seamless trading between Ethereum and Cosmos ecosystems.
              </p>
            </div>
            
            <div className="card text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure</h3>
              <p className="text-gray-600">
                HTLC-based security with time-lock protection and automatic refunds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">$50B+</div>
              <div className="text-lg opacity-90">Monthly Cross-Chain Volume</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">90%</div>
              <div className="text-lg opacity-90">Reduction in Attack Surface</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0</div>
              <div className="text-lg opacity-90">Trusted Intermediaries</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Experience the Future?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the revolution in cross-chain trading. No bridges, no trust, just pure cryptographic guarantees.
          </p>
          <Link 
            href="/swap" 
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
          >
            Start Your First Swap
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
} 