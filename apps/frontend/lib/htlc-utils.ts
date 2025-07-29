import { ethers } from 'ethers';

export interface HTLCState {
  hashlock: string;
  secret: string;
  timelock: number;
  sender: string;
  recipient: string;
  amount: string;
  ethereumTxHash?: string;
  cosmosTxHash?: string;
}

export interface SwapParams {
  fromToken: 'ETH' | 'ATOM';
  toToken: 'ETH' | 'ATOM';
  amount: string;
  recipient: string;
  timelockHours: number;
}

export function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function calculateHashlock(secret: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(secret));
}

export function calculateTimelock(): number {
  // 24 hours from now
  return Math.floor(Date.now() / 1000) + (24 * 60 * 60);
}

export function createHTLCState(params: SwapParams): HTLCState {
  const secret = generateSecret();
  const hashlock = calculateHashlock(secret);
  const timelock = Math.floor(Date.now() / 1000) + (params.timelockHours * 60 * 60);

  return {
    hashlock,
    secret,
    timelock,
    sender: '', // Will be set when wallet is connected
    recipient: params.recipient,
    amount: params.amount
  };
}

export function calculateAtomAmount(ethAmount: string): string {
  // Simplified exchange rate: 1 ETH = 10 ATOM
  const ethValue = parseFloat(ethAmount);
  return (ethValue * 10).toFixed(6);
}

export function calculateEthAmount(atomAmount: string): string {
  // Simplified exchange rate: 1 ATOM = 0.1 ETH
  const atomValue = parseFloat(atomAmount);
  return (atomValue * 0.1).toFixed(6);
}

export function validateSwapParams(params: SwapParams): { valid: boolean; error?: string } {
  if (!params.amount || parseFloat(params.amount) <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (!params.recipient || params.recipient.trim() === '') {
    return { valid: false, error: 'Recipient address is required' };
  }

  if (params.fromToken === params.toToken) {
    return { valid: false, error: 'From and to tokens must be different' };
  }

  if (params.timelockHours < 1 || params.timelockHours > 168) {
    return { valid: false, error: 'Timelock must be between 1 and 168 hours' };
  }

  return { valid: true };
}

export function formatAmount(amount: string, decimals: number = 6): string {
  const value = parseFloat(amount);
  return value.toFixed(decimals);
}

export function getTokenInfo(token: 'ETH' | 'ATOM') {
  switch (token) {
    case 'ETH':
      return {
        name: 'Ethereum',
        symbol: 'ETH',
        network: 'Sepolia',
        color: 'bg-blue-500',
        decimals: 18
      };
    case 'ATOM':
      return {
        name: 'Cosmos',
        symbol: 'ATOM',
        network: 'Osmosis',
        color: 'bg-purple-500',
        decimals: 6
      };
    default:
      throw new Error(`Unknown token: ${token}`);
  }
} 