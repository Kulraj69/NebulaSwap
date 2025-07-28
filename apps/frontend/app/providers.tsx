'use client'

import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { CosmosKitProvider } from '@cosmos-kit/react'
import { chains, assets } from 'chain-registry'
import { wallets } from '@cosmos-kit/keplr-extension'

const { chains: wagmiChains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia],
  [publicProvider()]
)

const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains: wagmiChains }),
  ],
  publicClient,
  webSocketPublicClient,
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <CosmosKitProvider
        chains={chains}
        assetLists={assets}
        wallets={wallets}
        signerOptions={{
          signingStargate: () => ({
            aminoTypes: {},
            registry: {},
          }),
        }}
      >
        {children}
      </CosmosKitProvider>
    </WagmiConfig>
  )
} 