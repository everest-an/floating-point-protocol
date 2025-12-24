// FPP Smart Contract ABI for Ethereum interaction
export const FPP_CONTRACT_ABI = [
  // Read functions
  {
    name: "POINT_VALUE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "pointCounter",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalValueLocked",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getAvailablePointCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "floatingPoints",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "pointId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "commitment", type: "bytes32" },
      { name: "nullifier", type: "bytes32" },
      { name: "createdAt", type: "uint256" },
      { name: "isSpent", type: "bool" },
      { name: "zkProofHash", type: "bytes32" },
      { name: "mass", type: "uint256" },
    ],
  },
  {
    name: "calculateGravityWeight",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "pointId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getWeightedRandomPoints",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "count", type: "uint256" },
      { name: "vrfSeed", type: "bytes32" },
    ],
    outputs: [
      { name: "selectedIds", type: "uint256[]" },
      { name: "totalWeight", type: "uint256" },
    ],
  },
  {
    name: "isNullifierUsed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "nullifier", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "getPointDetails",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "pointId", type: "uint256" }],
    outputs: [
      { name: "value", type: "uint256" },
      { name: "commitment", type: "bytes32" },
      { name: "createdAt", type: "uint256" },
      { name: "isSpent", type: "bool" },
      { name: "mass", type: "uint256" },
      { name: "gravityWeight", type: "uint256" },
    ],
  },
  {
    name: "getAvailablePointsWithWeights",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "uint256[]" },
      { name: "weights", type: "uint256[]" },
      { name: "ages", type: "uint256[]" },
    ],
  },
  {
    name: "pendingWithdrawals",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "withdrawalTimestamp",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },

  // Write functions
  {
    name: "generatePoints",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "numberOfPoints", type: "uint256" },
      { name: "commitments", type: "bytes32[]" },
      { name: "zkProofHashes", type: "bytes32[]" },
      { name: "masses", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    name: "privacyPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "inputPointIds", type: "uint256[]" },
      { name: "inputNullifiers", type: "bytes32[]" },
      { name: "outputCommitments", type: "bytes32[]" },
      { name: "outputMasses", type: "uint256[]" },
      { name: "zkProof", type: "bytes32" },
      { name: "ringSignature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "requestWithdrawal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "pointIds", type: "uint256[]" }],
    outputs: [],
  },
  {
    name: "completeWithdrawal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // Events
  {
    name: "PointGenerated",
    type: "event",
    inputs: [
      { name: "pointId", type: "uint256", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "mass", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PrivacyPaymentExecuted",
    type: "event",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "inputCount", type: "uint256", indexed: false },
      { name: "outputCount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PointSpent",
    type: "event",
    inputs: [
      { name: "pointId", type: "uint256", indexed: true },
      { name: "nullifier", type: "bytes32", indexed: true },
    ],
  },
  {
    name: "WithdrawalRequested",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "availableAt", type: "uint256", indexed: false },
    ],
  },
  {
    name: "WithdrawalCompleted",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const

// Contract addresses for different networks
export const FPP_CONTRACT_ADDRESSES: Record<number, string> = {
  1: "0x0000000000000000000000000000000000000000", // Ethereum Mainnet (deploy pending)
  5: "0x0000000000000000000000000000000000000000", // Goerli Testnet
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia Testnet
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Local Hardhat
}

export const SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum Mainnet", symbol: "ETH" },
  { id: 5, name: "Goerli Testnet", symbol: "ETH" },
  { id: 11155111, name: "Sepolia Testnet", symbol: "ETH" },
  { id: 31337, name: "Localhost", symbol: "ETH" },
]
