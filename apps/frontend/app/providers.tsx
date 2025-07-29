'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { blockchainManager, WalletState } from '../lib/blockchain'

interface BlockchainContextType {
  walletState: WalletState;
  isLoading: boolean;
  updateWalletState: (newState: Partial<WalletState>) => void;
  connectEthereum: () => Promise<void>;
  connectCosmos: () => Promise<void>;
  disconnect: () => void;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export function useBlockchain() {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>({
    ethereum: { connected: false },
    cosmos: { connected: false }
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateWalletState = (newState: Partial<WalletState>) => {
    setWalletState(prev => ({ ...prev, ...newState }));
  };

  const connectEthereum = async () => {
    setIsLoading(true);
    try {
      const { address, provider } = await blockchainManager.connectEthereum();
      updateWalletState({
        ethereum: {
          connected: true,
          address,
          provider
        }
      });
    } catch (error) {
      console.error('Failed to connect Ethereum:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectCosmos = async () => {
    setIsLoading(true);
    try {
      const { address, client } = await blockchainManager.connectCosmos();
      updateWalletState({
        cosmos: {
          connected: true,
          address,
          client
        }
      });
    } catch (error) {
      console.error('Failed to connect Cosmos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    blockchainManager.disconnect();
    setWalletState({
      ethereum: { connected: false },
      cosmos: { connected: false }
    });
  };

  const value: BlockchainContextType = {
    walletState,
    isLoading,
    updateWalletState,
    connectEthereum,
    connectCosmos,
    disconnect
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
} 