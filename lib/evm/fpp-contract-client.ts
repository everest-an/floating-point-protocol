/**
 * FPP Contract Client - Demo版本（不依赖viem）
 * 用于v0环境的演示模式
 */

// 合约地址配置 - 部署后更新
export const CONTRACT_ADDRESSES = {
  mainnet: {
    fpp: "0x0000000000000000000000000000000000000000",
    fpToken: "0x0000000000000000000000000000000000000000",
    treasury: "0x0000000000000000000000000000000000000000",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  sepolia: {
    fpp: "0x0000000000000000000000000000000000000000",
    fpToken: "0x0000000000000000000000000000000000000000",
    treasury: "0x0000000000000000000000000000000000000000",
    usdt: "0x0000000000000000000000000000000000000000",
  },
}

// 项目方地址
export const OWNER_ADDRESS = "0x3d0ab53241a2913d7939ae02f7083169fe7b823b"

type NetworkType = "mainnet" | "sepolia"

// Demo模式的合约客户端（不需要viem）
export class FPPContractClient {
  private network: NetworkType
  private addresses: typeof CONTRACT_ADDRESSES.mainnet
  private connectedAddress: string | null = null

  constructor(network: NetworkType = "sepolia") {
    this.network = network
    this.addresses = CONTRACT_ADDRESSES[network]
  }

  // 连接钱包（Demo模式）
  async connectWallet(): Promise<string> {
    // Demo模式：模拟钱包连接
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[]
        this.connectedAddress = accounts[0]
        return accounts[0]
      } catch {
        // 如果MetaMask不可用，返回模拟地址
        this.connectedAddress = "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "0")
        return this.connectedAddress
      }
    }
    // 没有钱包时返回模拟地址
    this.connectedAddress = "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "0")
    return this.connectedAddress
  }

  // 检查是否是Owner
  async isOwner(address: string): Promise<boolean> {
    return address.toLowerCase() === OWNER_ADDRESS.toLowerCase()
  }

  // ============ 读取函数（Demo模式返回模拟数据） ============

  async getProtocolStats() {
    return {
      totalFees: "12500.00",
      totalDeposits: "847500.00",
      totalPoints: 84750,
      isPaused: false,
    }
  }

  async getTreasuryStats() {
    return {
      reserve: "847500.00",
      revenue: "12500.00",
      yieldEarned: "5230.00",
      yieldDeployed: "423750.00",
      reserveRatio: 50,
    }
  }

  async getUSDTBalance(address: string): Promise<string> {
    // Demo模式返回模拟余额
    return "10000.00"
  }

  async getFPTokenBalance(address: string): Promise<string> {
    return "500.00"
  }

  async getUSDTAllowance(owner: string): Promise<string> {
    return "1000000.00"
  }

  // ============ 写入函数（Demo模式模拟交易） ============

  async approveUSDT(amount: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 1000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  async deposit(amount: string, commitments: string[]): Promise<string> {
    await new Promise((r) => setTimeout(r, 2000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  async privacyPayment(params: {
    nullifiers: string[]
    outputCommitments: string[]
    ringMembers: string[]
    ringSignature: string
    zkProof: string
    merkleRoot: string
    inputPointIds: string[]
  }): Promise<string> {
    await new Promise((r) => setTimeout(r, 3000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  async requestWithdrawal(params: {
    nullifiers: string[]
    ringMembers: string[]
    ringSignature: string
    zkProof: string
    merkleRoot: string
    inputPointIds: string[]
  }): Promise<string> {
    await new Promise((r) => setTimeout(r, 2000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  async completeWithdrawal(nullifier: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 1500))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  // ============ Owner函数 ============

  async withdrawFees(to: string, amount: string): Promise<string> {
    if (this.connectedAddress?.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
      throw new Error("Only owner can withdraw fees")
    }
    await new Promise((r) => setTimeout(r, 2000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  async ownerMintTokens(to: string, amount: string): Promise<string> {
    if (this.connectedAddress?.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
      throw new Error("Only owner can mint tokens")
    }
    await new Promise((r) => setTimeout(r, 2000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  async withdrawTreasuryRevenue(to: string, amount: string): Promise<string> {
    if (this.connectedAddress?.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
      throw new Error("Only owner can withdraw revenue")
    }
    await new Promise((r) => setTimeout(r, 2000))
    return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")
  }

  // ============ 事件监听（Demo模式不实现） ============

  watchDeposits(callback: (log: unknown) => void) {
    return () => { } // 返回取消函数
  }

  watchPayments(callback: (log: unknown) => void) {
    return () => { }
  }

  async waitForTransaction(hash: string) {
    await new Promise((r) => setTimeout(r, 1000))
    return { status: "success", transactionHash: hash }
  }

  getAddresses() {
    return this.addresses
  }
}

// 单例实例
import { FPPContractClientReal } from "./fpp-contract-client-real"

// 单例实例
let clientInstance: FPPContractClient | FPPContractClientReal | null = null

export function getFPPClient(network: NetworkType = "sepolia"): FPPContractClient | FPPContractClientReal {
  if (!clientInstance) {
    // Check environment variable or config to switch to real client
    // For now, default to Mock unless explicitly requested or env var set
    const useReal = typeof window !== "undefined" &&
      (window as any).__USE_REAL_CLIENT__ === true
    if (useReal) {
      clientInstance = new FPPContractClientReal(network)
    } else {
      clientInstance = new FPPContractClient(network)
    }
  }
  return clientInstance
}

// 声明window.ethereum类型
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
