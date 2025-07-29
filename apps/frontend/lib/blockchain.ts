import { ethers } from 'ethers';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { EnhancedHTLC, OneInchQuote, oneInchUtils } from './1inch-integration';

// Type declarations for window objects
declare global {
  interface Window {
    ethereum?: any;
    keplr?: any;
  }
}

// HTLC ABI for Ethereum contract
const HTLC_ABI = [
  "function createHTLC(bytes32 hashlock, uint256 timelock, address recipient) external payable",
  "function claimHTLC(bytes32 hashlock, string memory secret) external",
  "function refundHTLC(bytes32 hashlock) external",
  "function checkHTLCExists(bytes32 hashlock) external view returns (bool)",
  "function getHTLC(bytes32 hashlock) external view returns (address sender, address recipient, uint256 amount, uint256 timelock, bool withdrawn, bool refunded)",
  "event HTLCCreated(bytes32 indexed hashlock, address indexed sender, address indexed recipient, uint256 amount, uint256 timelock)",
  "event HTLCClaimed(bytes32 indexed hashlock, string secret)",
  "event HTLCRefunded(bytes32 indexed hashlock)"
];

// Contract addresses (deployed contracts)
const CONTRACTS = {
  ethereum: {
    htlc: '0xe56f2058AF61E8b5bd8cb0382232CE8Bf6d48985', // Deployed on Sepolia
    rpc: 'https://sepolia.infura.io/v3/adc7abac13ac4130b1412cabb766ed4c'
  },
  cosmos: {
    htlc: '', // TODO: Deploy to Osmosis testnet
    rpc: 'https://rpc-test.osmosis.zone',
    chainId: 'osmo-test-5'
  }
};

// 1inch API Configuration
const ONEINCH_API_KEY = process.env.NEXT_PUBLIC_1INCH_API_KEY || 'c6jROBU7NYwys7yUVE0eVucTqT4pt9vC';

// Token addresses for 1inch integration
const TOKENS = {
  ethereum: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // Native ETH
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Wrapped ETH
    USDC: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C', // USDC
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  },
  cosmos: {
    ATOM: 'uatom', // Native ATOM
    OSMO: 'uosmo', // Native OSMO
  }
};

export interface WalletState {
  ethereum: {
    connected: boolean;
    address?: string;
    provider?: any;
  };
  cosmos: {
    connected: boolean;
    address?: string;
    client?: any;
  };
}

export interface CrossChainSwapResult {
  ethereumTx?: any;
  cosmosTx?: any;
  fusionOrder?: any;
  success: boolean;
  error?: string;
}

export class BlockchainManager {
  private ethereumProvider: any;
  private cosmosClient: any;
  private enhancedHTLC: EnhancedHTLC;

  constructor() {
    this.enhancedHTLC = new EnhancedHTLC(
      ONEINCH_API_KEY,
      null, // Will be set when connected
      null  // Will be set when connected
    );
  }

  // Connect to Ethereum with MetaMask
  async connectEthereum(): Promise<{ address: string; provider: any }> {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Check if MetaMask is specifically installed
        if (!window.ethereum.isMetaMask) {
          throw new Error('MetaMask is not installed. Please install MetaMask extension.');
        }

        // Request accounts specifically from MetaMask
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please connect MetaMask.');
        }

        const address = accounts[0];
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        this.ethereumProvider = provider;
        this.enhancedHTLC = new EnhancedHTLC(
          ONEINCH_API_KEY,
          provider,
          this.cosmosClient
        );

        console.log('✅ Connected to MetaMask:', address);
        return { address, provider };
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        throw error;
      }
    } else {
      throw new Error('MetaMask not found. Please install MetaMask extension.');
    }
  }

  // Connect to Cosmos with Keplr
  async connectCosmos(): Promise<{ address: string; client: any }> {
    if (typeof window !== 'undefined' && window.keplr) {
      try {
        await window.keplr.enable(CONTRACTS.cosmos.chainId);
        const offlineSigner = window.keplr.getOfflineSigner(CONTRACTS.cosmos.chainId);
        const accounts = await offlineSigner.getAccounts();
        const client = await SigningStargateClient.connectWithSigner(
          CONTRACTS.cosmos.rpc,
          offlineSigner
        );

        this.cosmosClient = client;
        this.enhancedHTLC = new EnhancedHTLC(
          ONEINCH_API_KEY,
          this.ethereumProvider,
          client
        );

        return { address: accounts[0].address, client };
      } catch (error) {
        console.error('Error connecting to Cosmos:', error);
        throw error;
      }
    } else {
      throw new Error('Keplr not found');
    }
  }

  // Get optimal swap route using 1inch Fusion+
  async getOptimalRoute(
    fromToken: string,
    toToken: string,
    amount: string,
    chainId: number = 1
  ): Promise<OneInchQuote> {
    try {
      return await this.enhancedHTLC.getOptimalRoute(fromToken, toToken, amount, chainId);
    } catch (error) {
      console.error('Error getting optimal route:', error);
      throw error;
    }
  }

  // Execute cross-chain swap with 1inch Fusion+ optimization
  async executeCrossChainSwap(
    fromChain: 'ethereum' | 'cosmos',
    toChain: 'ethereum' | 'cosmos',
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string,
    slippage: number = 1
  ): Promise<CrossChainSwapResult> {
    try {
      // Use 1inch Fusion+ for optimal execution
      const result = await this.enhancedHTLC.executeCrossChainSwap(
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        userAddress,
        slippage
      );

      // Execute transactions if available
      if (result.ethereumTx && this.ethereumProvider) {
        const signer = await this.ethereumProvider.getSigner();
        const tx = await signer.sendTransaction(result.ethereumTx);
        await tx.wait();
      }

      if (result.cosmosTx && this.cosmosClient) {
        // Execute Cosmos transaction
        const cosmosResult = await this.cosmosClient.signAndBroadcast(
          userAddress,
          [result.cosmosTx],
          'auto'
        );
      }

      return {
        ...result,
        success: true
      };
    } catch (error) {
      console.error('Error executing cross-chain swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create HTLC with 1inch optimized parameters
  async createHTLC(
    hashlock: string,
    timelock: number,
    recipient: string,
    amount: string,
    chain: 'ethereum' | 'cosmos'
  ): Promise<any> {
    try {
      if (chain === 'ethereum' && this.ethereumProvider) {
        const signer = await this.ethereumProvider.getSigner();
        const contract = new ethers.Contract(CONTRACTS.ethereum.htlc, HTLC_ABI, signer);
        
        // Get optimal gas estimation from 1inch
        const quote = await this.getOptimalRoute(
          TOKENS.ethereum.ETH,
          TOKENS.ethereum.WETH,
          amount
        );

        const tx = await contract.createHTLC(hashlock, timelock, recipient, {
          value: amount,
          gasLimit: quote.estimatedGas * 1.2 // Add 20% buffer
        });

        return await tx.wait();
      } else if (chain === 'cosmos' && this.cosmosClient) {
        // Create HTLC on Cosmos with optimized parameters
        const msg = {
          typeUrl: '/nebulaswap.htlc.MsgCreateHTLC',
          value: {
            hashlock,
            timelock,
            recipient,
            amount,
            sender: recipient // Will be set to actual sender
          }
        };

        return await this.cosmosClient.signAndBroadcast(
          recipient,
          [msg],
          'auto'
        );
      }
    } catch (error) {
      console.error('Error creating HTLC:', error);
      throw error;
    }
  }

  // Claim HTLC with 1inch integration
  async claimHTLC(
    hashlock: string,
    secret: string,
    chain: 'ethereum' | 'cosmos'
  ): Promise<any> {
    try {
      if (chain === 'ethereum' && this.ethereumProvider) {
        const signer = await this.ethereumProvider.getSigner();
        const contract = new ethers.Contract(CONTRACTS.ethereum.htlc, HTLC_ABI, signer);
        
        const tx = await contract.claimHTLC(hashlock, secret);
        return await tx.wait();
      } else if (chain === 'cosmos' && this.cosmosClient) {
        const msg = {
          typeUrl: '/nebulaswap.htlc.MsgClaimHTLC',
          value: {
            hashlock,
            secret
          }
        };

        return await this.cosmosClient.signAndBroadcast(
          '', // Will be set to actual sender
          [msg],
          'auto'
        );
      }
    } catch (error) {
      console.error('Error claiming HTLC:', error);
      throw error;
    }
  }

  // Get real-time price feeds from 1inch
  async getPriceFeeds(
    tokens: string[],
    chainId: number = 1
  ): Promise<Record<string, any>> {
    try {
      return await this.enhancedHTLC.getPriceFeeds(tokens, chainId);
    } catch (error) {
      console.error('Error getting price feeds:', error);
      throw error;
    }
  }

  // Get supported tokens from 1inch
  async getSupportedTokens(chainId: number = 1): Promise<Record<string, any>> {
    try {
      return await this.enhancedHTLC.getSupportedTokens(chainId);
    } catch (error) {
      console.error('Error getting supported tokens:', error);
      throw error;
    }
  }

  // Check HTLC status
  async checkHTLCStatus(hashlock: string, chain: 'ethereum' | 'cosmos'): Promise<any> {
    try {
      if (chain === 'ethereum' && this.ethereumProvider) {
        const provider = new ethers.JsonRpcProvider(CONTRACTS.ethereum.rpc);
        const contract = new ethers.Contract(CONTRACTS.ethereum.htlc, HTLC_ABI, provider);
        
        const exists = await contract.checkHTLCExists(hashlock);
        if (exists) {
          return await contract.getHTLC(hashlock);
        }
        return null;
      } else if (chain === 'cosmos' && this.cosmosClient) {
        // Query Cosmos HTLC status
        const queryClient = await this.cosmosClient.getQueryClient();
        return await queryClient.htlc.getHTLC({ hashlock });
      }
    } catch (error) {
      console.error('Error checking HTLC status:', error);
      throw error;
    }
  }

  // Refund HTLC after timelock expiry
  async refundHTLC(hashlock: string, chain: 'ethereum' | 'cosmos'): Promise<string> {
    try {
      if (chain === 'ethereum' && this.ethereumProvider) {
        const signer = await this.ethereumProvider.getSigner();
        const contract = new ethers.Contract(CONTRACTS.ethereum.htlc, HTLC_ABI, signer);
        
        const tx = await contract.refundHTLC(hashlock);
        await tx.wait();
        
        console.log('✅ Ethereum HTLC refunded:', tx.hash);
        return tx.hash;
      } else if (chain === 'cosmos' && this.cosmosClient) {
        const msg = {
          refund: {
            hashlock: hashlock
          }
        };

        const fee = {
          amount: [{ denom: 'uosmo', amount: '5000' }],
          gas: '200000',
        };

        const result = await this.cosmosClient.execute(
          await this.cosmosClient.getSignerAddress(),
          CONTRACTS.cosmos.htlc,
          msg,
          fee,
          'Refund HTLC',
          []
        );

        console.log('✅ Cosmos HTLC refunded:', result.transactionHash);
        return result.transactionHash;
      }
      
      throw new Error(`Unsupported chain: ${chain}`);
    } catch (error) {
      console.error('Error refunding HTLC:', error);
      throw error;
    }
  }

  // Disconnect wallets
  disconnect(): void {
    this.ethereumProvider = null;
    this.cosmosClient = null;
  }
}

// Create singleton instance
export const blockchainManager = new BlockchainManager(); 