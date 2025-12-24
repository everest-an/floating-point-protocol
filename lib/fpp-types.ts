// 完整的FPP类型定义

// 游离随机数点 - 每个代表$10 USD
export interface FloatingPoint {
  id: string
  value: number // 固定为10 USD
  commitment: string // Pedersen承诺 C = g^v * h^r
  nullifier: string | null // 花费标记(花费时生成)
  createdAt: number // 创建时间戳
  isSpent: boolean // 是否已花费
  mass: number // 质量(影响重力选择概率)
  gravityWeight: number // 计算的重力权重
  owner: string // 所有者地址(加密存储)
  secret?: string // 随机数私钥(只有所有者知道)
  encryptedSecret?: string // 用接收方公钥加密的密钥
}

// 交易状态
export type TransactionStatus =
  | "pending"
  | "generating_nullifier"
  | "generating_commitment"
  | "generating_proof"
  | "generating_ring_signature"
  | "signing"
  | "broadcasting"
  | "confirming"
  | "confirmed"
  | "failed"

// 交易类型
export type TransactionType = "deposit" | "payment" | "withdrawal"

// 完整交易记录
export interface Transaction {
  id: string
  type: TransactionType
  pointIds: string[] // 涉及的点ID
  amount: number // 金额(USD)
  timestamp: number
  status: TransactionStatus

  // 隐私证明
  zkProof?: string // ZK-SNARK证明
  ringSignature?: string // 环签名
  nullifiers?: string[] // 无效化器列表
  outputCommitments?: string[] // 输出承诺列表
  merkleRoot?: string // 添加Merkle根
  keyImage?: string // 添加密钥镜像

  // 交易详情
  recipient?: string // 接收方地址(仅支付)
  txHash?: string // 链上交易哈希
  blockNumber?: number // 确认区块号
  gasUsed?: string // 消耗的Gas

  ringSize?: number
  anonymityScore?: number
  unlockTime?: number // 提款解锁时间

  // 错误信息
  error?: string
}

// 钱包状态
export interface WalletState {
  address: string | null
  balance: number
  points: FloatingPoint[]
  isConnected: boolean
  chainId?: number
  publicKey?: string
  _sessionKey?: string // 临时会话密钥，不持久化
}

// 协议统计
export interface ProtocolStats {
  tvl: number // 总锁仓价值
  activePoints: number // 活跃点数
  volume24h: number // 24小时交易量
  privacyScore: number // 隐私评分(匿名集大小)
  totalTransactions: number // 总交易数
  averageRingSize: number // 平均环大小
  nullifierCount: number // 已使用无效化器数
}

// 支付请求
export interface PaymentRequest {
  recipientAddress: string
  recipientPublicKey: string
  amount: number
  selectedPoints: FloatingPoint[]
  memo?: string // 加密备注
}

// 点动画
export interface PointAnimation {
  id: string
  pointId: string
  type: "emit" | "absorb" | "transfer" | "pulse"
  startTime: number
  duration: number
  startX: number
  startY: number
  endX: number
  endY: number
  color?: string
}

// 智能合约配置
export interface ContractConfig {
  address: string
  chainId: number
  name: string
  version: string
  deployedAt: number
  stablecoinAddress: string
  stablecoinSymbol: "USDT" | "USDC"
  treasuryAddress: string
  feeRecipientAddress: string
  depositFeeBps: number
  withdrawFeeBps: number
}

// 默认合约配置 (Ethereum Mainnet)
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  address: "0x0000000000000000000000000000000000000000", // 部署后填入
  chainId: 1,
  name: "Floating Point Protocol",
  version: "1.0.0",
  deployedAt: 0,
  stablecoinAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Mainnet
  stablecoinSymbol: "USDT",
  treasuryAddress: "0x0000000000000000000000000000000000000000", // Treasury地址
  feeRecipientAddress: "0x0000000000000000000000000000000000000000", // 费用接收地址
  depositFeeBps: 10, // 0.1%
  withdrawFeeBps: 10, // 0.1%
}

// ZK证明数据
export interface ZKProofData {
  proof: string
  publicSignals: string[]
  nullifiers: string[]
  outputCommitments: string[]
  verificationKey: string
}

// 环签名数据
export interface RingSignatureData {
  signature: string
  keyImage: string
  ringMembers: string[]
  ringSize: number
}

// 审计记录(可选合规功能)
export interface AuditRecord {
  transactionId: string
  viewKey: string // 加密的查看密钥
  regulatorAddress: string
  timestamp: number
  expiresAt: number
}

// 面额类型(支持多面额)
export interface Denomination {
  value: number // USD值
  color: string // 显示颜色
  minMass: number
  maxMass: number
}

// 默认面额配置
export const DENOMINATIONS: Denomination[] = [
  { value: 10, color: "#a855f7", minMass: 0.5, maxMass: 2.0 },
  { value: 1, color: "#8b5cf6", minMass: 0.3, maxMass: 1.0 },
  { value: 100, color: "#7c3aed", minMass: 1.0, maxMass: 3.0 },
]

// 安全配置类型
export interface SecurityConfig {
  minRingSize: number
  maxRingSize: number
  maxBatchSize: number
  transactionDeadlineMs: number
  withdrawalDelayMs: number
  rateLimitPerHour: number
  nonceExpiryMs: number
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  minRingSize: 5,
  maxRingSize: 20,
  maxBatchSize: 50,
  transactionDeadlineMs: 30 * 60 * 1000, // 30分钟
  withdrawalDelayMs: 24 * 60 * 60 * 1000, // 24小时
  rateLimitPerHour: 10,
  nonceExpiryMs: 60 * 60 * 1000, // 1小时
}

// 隐私交易验证结果
export interface PrivacyValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  privacyScore: number
  ringSize: number
  nullifiersValid: boolean
  zkProofValid: boolean
  ringSignatureValid: boolean
}

// 协议常量
export const PROTOCOL_CONSTANTS = {
  POINT_VALUE: 10,
  USDT_DECIMALS: 6,
  MAX_BATCH_SIZE: 50, // 降低以提高安全性
  WITHDRAWAL_DELAY: 24 * 60 * 60 * 1000,
  WITHDRAWAL_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 添加7天过期
  GRAVITY_CONSTANT: 1000,
  MIN_POINT_AGE: 60 * 60 * 1000,
  MIN_RING_SIZE: 5,
  MAX_RING_SIZE: 20,
  TRANSACTION_DEADLINE: 30 * 60 * 1000, // 添加30分钟截止
}

// 项目方/Treasury配置
export interface OwnerConfig {
  ownerAddress: string
  treasuryAddress: string
  multiSigSigners: string[]
  requiredSignatures: number
  feeRecipient: string
}

// 生息策略配置
export interface YieldStrategyConfig {
  strategyAddress: string
  strategyName: string
  apy: number
  maxAllocation: number // 基点, 5000 = 50%
  minReserveRatio: number // 基点, 5000 = 50%
  timelockDuration: number // 秒
}

// Treasury状态
export interface TreasuryState {
  totalReserve: number
  protocolRevenue: number
  yieldEarned: number
  yieldDeployed: number
  reserveRatio: number
  lastHarvestTime: number
}

// 多签操作
export interface MultiSigAction {
  actionHash: string
  actionType: "withdrawRevenue" | "deployYield" | "setStrategy" | "setTreasury"
  description: string
  proposer: string
  approvals: string[]
  requiredApprovals: number
  timelockExpiry: number
  executed: boolean
  createdAt: number
}

// 默认项目方配置
export const DEFAULT_OWNER_CONFIG: OwnerConfig = {
  ownerAddress: "0x0000000000000000000000000000000000000000", // 部署时设置
  treasuryAddress: "0x0000000000000000000000000000000000000000", // 部署时设置
  multiSigSigners: [], // 部署时设置
  requiredSignatures: 2,
  feeRecipient: "0x0000000000000000000000000000000000000000", // 部署时设置
}

// 默认生息策略配置
export const DEFAULT_YIELD_CONFIG: YieldStrategyConfig = {
  strategyAddress: "0x0000000000000000000000000000000000000000",
  strategyName: "Aave USDT",
  apy: 5.2,
  maxAllocation: 5000, // 50%
  minReserveRatio: 5000, // 50%
  timelockDuration: 48 * 60 * 60, // 48小时
}
