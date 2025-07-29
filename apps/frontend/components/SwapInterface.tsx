'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ArrowUpDown, Wallet, Zap, Clock, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { useBlockchain } from '../app/providers'
import { blockchainManager } from '../lib/blockchain'
import { generateSecret, calculateHashlock, calculateTimelock } from '../lib/htlc-utils'

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  logo?: string
  color: string
  chain: 'ethereum' | 'cosmos'
}

const ETH_TOKEN: Token = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe',
  decimals: 18,
  logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  color: 'bg-blue-500',
  chain: 'ethereum'
}

const ATOM_TOKEN: Token = {
  symbol: 'ATOM',
  name: 'Cosmos',
  address: 'uatom',
  decimals: 6,
  logo: 'https://cryptologos.cc/logos/cosmos-atom-logo.png',
  color: 'bg-purple-500',
  chain: 'cosmos'
}

const AVAILABLE_TOKENS = [ETH_TOKEN, ATOM_TOKEN]

// Swap steps enum
enum SwapStep {
  SETUP = 0,
  ETHEREUM_LOCK = 1,
  WAITING_RELAYER = 2,
  COSMOS_CLAIM = 3,
  ETHEREUM_UNLOCK = 4,
  COMPLETED = 5,
  FAILED = 6
}

// Swap state interface
interface SwapState {
  step: SwapStep
  ethereumTxHash?: string
  cosmosTxHash?: string
  unlockTxHash?: string
  secret?: string
  hashlock?: string
  timelock?: number
  error?: string
  canRefund?: boolean
}

export default function SwapInterface() {
  const { walletState, connectEthereum: connectEth, connectCosmos: connectCos } = useBlockchain()
  const [fromToken, setFromToken] = useState<Token>(ETH_TOKEN)
  const [toToken, setToToken] = useState<Token>(ATOM_TOKEN)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [slippage, setSlippage] = useState(1)
  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null)
  const [priceQuote, setPriceQuote] = useState<any>(null)
  
  // Swap state management
  const [swapState, setSwapState] = useState<SwapState>({ step: SwapStep.SETUP })
  const [isLoading, setIsLoading] = useState(false)
  const [swapHistory, setSwapHistory] = useState<SwapState[]>([])

  // Close token selector when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowTokenSelector(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Get real-time price quote from 1inch with fallback
  useEffect(() => {
    const getPriceQuote = async () => {
      if (fromAmount && fromToken && toToken && parseFloat(fromAmount) > 0) {
        try {
          const quote = await blockchainManager.getOptimalRoute(
            fromToken.address,
            toToken.address,
            fromAmount,
            1 // Ethereum mainnet
          )
          setPriceQuote(quote)
          setToAmount(quote.toTokenAmount || '')
        } catch (error) {
          console.warn('Error getting price quote:', error)
          // Set fallback amount
          const amount = parseFloat(fromAmount)
          if (!isNaN(amount)) {
            const rate = fromToken.symbol === 'ETH' && toToken.symbol === 'ATOM' ? 10 : 0.1
            setToAmount((amount * rate).toFixed(6))
          }
        }
      } else {
        setToAmount('')
        setPriceQuote(null)
      }
    }

    const debounceTimer = setTimeout(getPriceQuote, 500)
    return () => clearTimeout(debounceTimer)
  }, [fromAmount, fromToken, toToken])

  // Step 1: Lock ETH on Ethereum
  const lockEthereum = async () => {
    if (!fromAmount || !walletState?.ethereum?.connected) {
      setSwapState({ step: SwapStep.FAILED, error: 'Please connect MetaMask and enter an amount' })
      return
    }

    setIsLoading(true)
    setSwapState({ step: SwapStep.ETHEREUM_LOCK })

    try {
      // Generate HTLC parameters
      const secret = generateSecret()
      const hashlock = calculateHashlock(secret)
      const timelock = calculateTimelock()

      // Create HTLC on Ethereum
      const finalRecipient = recipientAddress || 
        (toToken.chain === 'ethereum' ? walletState.ethereum?.address : walletState.cosmos?.address) || 
        'pending'
      
      const txHash = await blockchainManager.createHTLC(
        hashlock,
        timelock,
        finalRecipient,
        fromAmount,
        'ethereum'
      )

      setSwapState({
        step: SwapStep.WAITING_RELAYER,
        ethereumTxHash: txHash,
        secret,
        hashlock,
        timelock
      })

      // Start monitoring for relayer action
      monitorRelayerAction(hashlock)

    } catch (error) {
      console.error('Ethereum lock failed:', error)
      setSwapState({ 
        step: SwapStep.FAILED, 
        error: `Failed to lock ETH: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canRefund: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Monitor relayer action (simulated for now)
  const monitorRelayerAction = async (hashlock: string) => {
    // Simulate relayer watching Ethereum and creating Cosmos HTLC
    setTimeout(() => {
      const cosmosTxHash = `cosmos_tx_${Date.now()}`
      setSwapState(prev => ({
        ...prev,
        step: SwapStep.COSMOS_CLAIM,
        cosmosTxHash
      }))
    }, 3000) // 3 second simulation
  }

  // Step 2: Claim ATOM on Cosmos
  const claimCosmos = async () => {
    if (!walletState?.cosmos?.connected || !swapState.secret || !swapState.hashlock) {
      setSwapState({ step: SwapStep.FAILED, error: 'Missing required data for claim' })
      return
    }

    setIsLoading(true)

    try {
      // Claim HTLC on Cosmos
      await blockchainManager.claimHTLC(
        swapState.hashlock,
        swapState.secret,
        'cosmos'
      )

      setSwapState(prev => ({
        ...prev,
        step: SwapStep.ETHEREUM_UNLOCK
      }))

      // Trigger final unlock (simulated relayer action)
      finalizeUnlock()

    } catch (error) {
      console.error('Cosmos claim failed:', error)
      setSwapState({ 
        step: SwapStep.FAILED, 
        error: `Failed to claim ATOM: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Final step: Relayer unlocks Ethereum (simulated)
  const finalizeUnlock = async () => {
    setTimeout(() => {
      const unlockTxHash = `unlock_tx_${Date.now()}`
      const completedSwap = {
        ...swapState,
        step: SwapStep.COMPLETED,
        unlockTxHash
      }
      setSwapState(completedSwap)
      
      // Add to history
      setSwapHistory(prev => [completedSwap, ...prev.slice(0, 4)]) // Keep last 5
    }, 2000)
  }

  // Refund mechanism
  const refundSwap = async () => {
    if (!swapState.hashlock) return

    setIsLoading(true)
    try {
      // Implement refund logic
      const refundTxHash = await blockchainManager.refundHTLC(swapState.hashlock, 'ethereum')
      setSwapState({
        step: SwapStep.COMPLETED,
        ethereumTxHash: refundTxHash,
        error: 'Swap refunded due to timeout'
      })
    } catch (error) {
      setSwapState({ 
        step: SwapStep.FAILED, 
        error: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset swap
  const resetSwap = () => {
    setSwapState({ step: SwapStep.SETUP })
    setFromAmount('')
    setToAmount('')
    setPriceQuote(null)
  }

  const switchTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
    setRecipientAddress('') // Clear recipient when switching
  }

  const handleTokenSelect = (token: Token, type: 'from' | 'to') => {
    console.log('Token selected:', token.symbol, 'for type:', type)
    
    if (type === 'from') {
      setFromToken(token)
      if (token.symbol === toToken.symbol) {
        setToToken(fromToken)
      }
    } else {
      setToToken(token)
      if (token.symbol === fromToken.symbol) {
        setFromToken(toToken)
      }
    }
    setShowTokenSelector(null)
  }

  const connectEthereum = async () => {
    if (walletState?.ethereum?.connected) return
    try {
      await connectEth()
    } catch (error) {
      console.error('Error connecting Ethereum:', error)
      setSwapState({ 
        step: SwapStep.FAILED, 
        error: 'Failed to connect MetaMask. Please make sure MetaMask is installed and unlocked.' 
      })
    }
  }

  const connectCosmos = async () => {
    if (walletState?.cosmos?.connected) return
    try {
      await connectCos()
    } catch (error) {
      console.error('Error connecting Cosmos:', error)
      setSwapState({ 
        step: SwapStep.FAILED, 
        error: 'Failed to connect Keplr. Please make sure Keplr is installed and unlocked.' 
      })
    }
  }

  const TokenSelector = ({ token, onSelect, isSelected }: { token: Token; onSelect: (token: Token) => void; isSelected: boolean }) => (
    <div 
      className={`flex items-center space-x-5 p-5 cursor-pointer rounded-xl transition-all duration-200 ${
        isSelected 
          ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
          : 'hover:bg-gray-50 hover:shadow-sm border-2 border-transparent'
      }`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect(token)
      }}
    >
      <div className={`w-12 h-12 rounded-full ${token.color} flex items-center justify-center shadow-sm`}>
        <img 
          src={token.logo} 
          alt={token.symbol} 
          className="w-10 h-10 rounded-full"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-lg text-gray-900">{token.symbol}</div>
        <div className="text-base text-gray-500">{token.name}</div>
      </div>
      {isSelected && (
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full"></div>
        </div>
      )}
    </div>
  )

  // Loading component
  const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6', 
      lg: 'w-8 h-8'
    }
    
    return (
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
    )
  }

  // Step indicator component
  const StepIndicator = () => (
    <div className="mb-6 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        {[
          { step: SwapStep.SETUP, label: 'Setup', icon: Zap },
          { step: SwapStep.ETHEREUM_LOCK, label: 'Lock ETH', icon: Clock },
          { step: SwapStep.WAITING_RELAYER, label: 'Relayer', icon: RefreshCw },
          { step: SwapStep.COSMOS_CLAIM, label: 'Claim ATOM', icon: CheckCircle },
          { step: SwapStep.COMPLETED, label: 'Complete', icon: CheckCircle }
        ].map(({ step, label, icon: Icon }, index) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              swapState.step >= step 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : swapState.step === step
                ? 'bg-blue-100 border-blue-500 text-blue-500'
                : 'bg-gray-200 border-gray-300 text-gray-400'
            }`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className={`ml-2 text-xs font-medium ${
              swapState.step >= step ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {label}
            </span>
            {index < 4 && (
              <div className={`w-4 h-0.5 mx-2 ${
                swapState.step > step ? 'bg-blue-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-8 lg:p-12">
      <div className="text-center mb-8 lg:mb-12">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Zap className="w-10 h-10 lg:w-12 lg:h-12 text-blue-500" />
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">NebulaSwap</h2>
        </div>
        <p className="text-gray-600 text-xl lg:text-2xl">Cross-Chain Atomic Swaps with HTLC</p>
        <div className="mt-4 px-4 py-2 bg-yellow-100 border border-yellow-300 rounded-full text-sm text-yellow-800 inline-block">
          🧪 Testnet Only - Sepolia & Osmosis
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator />

      {/* Current Step Content */}
      <div className="min-h-[500px]">
        {swapState.step === SwapStep.SETUP && (
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column - Token Selection */}
            <div className="space-y-8">
              {/* From Token */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-4">From</label>
                <div className="relative">
                  <div 
                    className="flex items-center justify-between p-6 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTokenSelector(showTokenSelector === 'from' ? null : 'from')
                    }}
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`w-16 h-16 rounded-full ${fromToken.color} flex items-center justify-center`}>
                        <img 
                          src={fromToken.logo} 
                          alt={fromToken.symbol} 
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            // Show token symbol instead
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.fallback-text')) {
                              const fallback = document.createElement('span')
                              fallback.className = 'fallback-text text-white font-bold text-lg'
                              fallback.textContent = fromToken.symbol
                              parent.appendChild(fallback)
                            }
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-2xl text-gray-900">{fromToken.symbol}</div>
                        <div className="text-lg text-gray-500">{fromToken.name}</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-8 h-8 text-gray-400 transition-transform ${showTokenSelector === 'from' ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {showTokenSelector === 'from' && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-20 p-3">
                      {AVAILABLE_TOKENS.map((token) => (
                        <TokenSelector 
                          key={token.symbol} 
                          token={token} 
                          onSelect={(token) => handleTokenSelect(token, 'from')}
                          isSelected={fromToken.symbol === token.symbol}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    // Only allow positive numbers and reasonable decimal places
                    if (value === '' || (/^\d*\.?\d{0,6}$/.test(value) && parseFloat(value) >= 0)) {
                      setFromAmount(value)
                    }
                  }}
                  className="mt-4 w-full p-6 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl font-medium placeholder-gray-400"
                  min="0"
                  step="0.000001"
                />
              </div>

              {/* Switch Button */}
              <div className="flex justify-center">
                <button
                  onClick={switchTokens}
                  className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <ArrowUpDown className="w-8 h-8 text-white" />
                </button>
              </div>

              {/* To Token */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-4">To</label>
                <div className="relative">
                  <div 
                    className="flex items-center justify-between p-6 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-purple-400 transition-colors bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTokenSelector(showTokenSelector === 'to' ? null : 'to')
                    }}
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`w-16 h-16 rounded-full ${toToken.color} flex items-center justify-center`}>
                        <img 
                          src={toToken.logo} 
                          alt={toToken.symbol} 
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-2xl text-gray-900">{toToken.symbol}</div>
                        <div className="text-lg text-gray-500">{toToken.name}</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-8 h-8 text-gray-400 transition-transform ${showTokenSelector === 'to' ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {showTokenSelector === 'to' && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-20 p-3">
                      {AVAILABLE_TOKENS.map((token) => (
                        <TokenSelector 
                          key={token.symbol} 
                          token={token} 
                          onSelect={(token) => handleTokenSelect(token, 'to')}
                          isSelected={toToken.symbol === token.symbol}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 relative">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={toAmount}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-2xl font-medium bg-gray-50 placeholder-gray-400"
                    readOnly
                  />
                  {fromAmount && !toAmount && (
                    <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                      <LoadingSpinner size="md" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Info & Actions */}
            <div className="space-y-8">
              {/* Recipient Address */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-4">
                  Send {toToken.symbol} to Address
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${toToken.chain === 'ethereum' ? 'Ethereum' : 'Cosmos'} wallet address...`}
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full p-6 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono placeholder-gray-400"
                />
                {!recipientAddress && (
                  <p className="mt-2 text-sm text-gray-500">
                    💡 Leave empty to send to your own {toToken.chain === 'ethereum' ? 'MetaMask' : 'Keplr'} wallet
                  </p>
                )}
                {recipientAddress && recipientAddress.length > 0 && recipientAddress.length < 20 && (
                  <p className="mt-2 text-sm text-red-500">
                    ⚠️ Address looks too short. Please check the address.
                  </p>
                )}
              </div>

              {/* Price Quote */}
              {priceQuote && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                  <div className="text-lg text-blue-800">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold">Estimated Output:</span>
                      <span className="font-bold text-blue-600 text-xl">{toAmount} {toToken.symbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Rate:</span>
                      <span className="font-bold text-green-600">1 {fromToken.symbol} = {(parseFloat(toAmount)/parseFloat(fromAmount) || 0).toFixed(6)} {toToken.symbol}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Connection */}
              <div className="p-6 bg-gray-50 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Wallet className="w-6 h-6 text-gray-600" />
                  <span className="font-semibold text-gray-700 text-lg">Wallet Status</span>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-3 lg:space-y-0">
                    <span className="text-base">Ethereum:</span>
                    <div className="flex items-center space-x-3">
                      <span className={`text-base font-semibold ${walletState?.ethereum?.connected ? 'text-green-600' : 'text-red-600'}`}>
                        {walletState?.ethereum?.connected ? '✅ Connected' : '❌ Not Connected'}
                      </span>
                      {!walletState?.ethereum?.connected && (
                        <button
                          onClick={connectEthereum}
                          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Connect MetaMask
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-3 lg:space-y-0">
                    <span className="text-base">Cosmos:</span>
                    <div className="flex items-center space-x-3">
                      <span className={`text-base font-semibold ${walletState?.cosmos?.connected ? 'text-green-600' : 'text-red-600'}`}>
                        {walletState?.cosmos?.connected ? '✅ Connected' : '❌ Not Connected'}
                      </span>
                      {!walletState?.cosmos?.connected && (
                        <button
                          onClick={connectCosmos}
                          className="px-4 py-2 bg-purple-500 text-white text-sm rounded-xl hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        >
                          Connect Keplr
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Swap Button */}
              <button
                onClick={lockEthereum}
                disabled={isLoading || !fromAmount || !walletState?.ethereum?.connected || 
                  (!!recipientAddress && recipientAddress.length < 20)}
                className={`w-full py-6 px-8 rounded-2xl font-bold text-xl transition-all transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isLoading || !fromAmount || !walletState?.ethereum?.connected || 
                  (!!recipientAddress && recipientAddress.length < 20)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:scale-105 shadow-lg'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <LoadingSpinner size="md" />
                    <span>Locking ETH...</span>
                  </div>
                ) : (
                  'Start Cross-Chain Swap'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ethereum Lock Step */}
      {swapState.step === SwapStep.ETHEREUM_LOCK && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Locking ETH on Ethereum</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Please confirm the transaction in MetaMask</p>
                              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 max-w-sm mx-auto">
                      <div>Amount: {fromAmount} {fromToken.symbol}</div>
                      <div>Network: Sepolia Testnet</div>
                      <div>Recipient: {recipientAddress || 'Your wallet'}</div>
                    </div>
        </div>
      )}

      {/* Waiting for Relayer */}
      {swapState.step === SwapStep.WAITING_RELAYER && (
        <div className="text-center py-8">
          <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 text-purple-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Waiting for Relayer</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Relayer is setting up ATOM contract on Cosmos...</p>
          <div className="space-y-3 max-w-md mx-auto">
            <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span>✅ ETH Locked:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${swapState.ethereumTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center justify-center sm:justify-start"
                >
                  View on Etherscan <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800">
              <div>⏳ Setting up ATOM side...</div>
              <div>This usually takes 30-60 seconds</div>
            </div>
          </div>
        </div>
      )}

      {/* Cosmos Claim Step */}
      {swapState.step === SwapStep.COSMOS_CLAIM && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Ready to Claim ATOM</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Switch to Keplr and claim your ATOM tokens</p>
          
          <div className="space-y-3 mb-6 max-w-md mx-auto">
            <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span>✅ ETH Locked:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${swapState.ethereumTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center justify-center sm:justify-start"
                >
                  View <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span>✅ ATOM Ready:</span>
                <a 
                  href={`https://testnet.osmosis.zone/tx/${swapState.cosmosTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline flex items-center justify-center sm:justify-start"
                >
                  View <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={claimCosmos}
            disabled={isLoading || !walletState?.cosmos?.connected}
            className={`w-full py-3 sm:py-4 px-6 rounded-xl font-bold text-base sm:text-lg transition-all transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              isLoading || !walletState?.cosmos?.connected
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-lg'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Claiming ATOM...</span>
              </div>
            ) : (
              'Claim ATOM with Keplr'
            )}
          </button>
        </div>
      )}

      {/* Ethereum Unlock Step */}
      {swapState.step === SwapStep.ETHEREUM_UNLOCK && (
        <div className="text-center py-8">
          <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Finalizing Swap</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Relayer is completing the final unlock...</p>
          <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800 max-w-sm mx-auto">
            <div>✅ ATOM claimed successfully</div>
            <div>⏳ Completing Ethereum unlock</div>
          </div>
        </div>
      )}

      {/* Completed Step */}
      {swapState.step === SwapStep.COMPLETED && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">🎉 Swap Completed!</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Your cross-chain atomic swap was successful</p>
          
          <div className="space-y-3 mb-6 max-w-md mx-auto">
            <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span>ETH Transaction:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${swapState.ethereumTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center justify-center sm:justify-start"
                >
                  View <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span>ATOM Transaction:</span>
                <a 
                  href={`https://testnet.osmosis.zone/tx/${swapState.cosmosTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline flex items-center justify-center sm:justify-start"
                >
                  View <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
            {swapState.unlockTxHash && (
              <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <span>Final Unlock:</span>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${swapState.unlockTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center justify-center sm:justify-start"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetSwap}
            className="w-full py-3 sm:py-4 px-6 rounded-xl font-bold text-base sm:text-lg transition-all transform bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Start New Swap
          </button>
        </div>
      )}

      {/* Failed Step */}
      {swapState.step === SwapStep.FAILED && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Swap Failed</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{swapState.error}</p>
          
          <div className="space-y-3 mb-6 max-w-md mx-auto">
            {swapState.ethereumTxHash && (
              <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <span>ETH Transaction:</span>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${swapState.ethereumTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center justify-center sm:justify-start focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            <button
              onClick={resetSwap}
              className="w-full py-3 px-6 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            {swapState.canRefund && swapState.hashlock && (
              <button
                onClick={refundSwap}
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-xl font-semibold text-red-700 bg-red-100 hover:bg-red-200 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Processing Refund...</span>
                  </div>
                ) : (
                  'Refund ETH'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Swap History */}
      {swapHistory.length > 0 && (
        <div className="mt-8 p-4 sm:p-6 bg-gray-50 rounded-xl">
          <h4 className="font-bold text-gray-900 mb-4">Recent Swaps</h4>
          <div className="space-y-3">
            {swapHistory.map((swap, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="text-sm">
                    <span className="font-medium">{fromToken.symbol} → {toToken.symbol}</span>
                    <span className="text-gray-500 ml-2">
                      {swap.step === SwapStep.COMPLETED ? '✅ Completed' : '❌ Failed'}
                    </span>
                  </div>
                  {swap.ethereumTxHash && (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${swap.ethereumTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs flex items-center justify-center sm:justify-start"
                    >
                      View <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}