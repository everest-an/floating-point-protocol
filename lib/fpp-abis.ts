export const ERC20_ABI = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
        outputs: [{ type: "bool" }],
    },
] as const;

export const FPP_ABI = [
    // Core Functions
    {
        name: "deposit",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "commitments", type: "bytes32[]" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
        ],
        outputs: [],
    },
    {
        name: "privacyPayment",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "inputNullifiers", type: "bytes32[]" },
            { name: "outputCommitments", type: "bytes32[]" },
            { name: "inputPointIds", type: "bytes32[]" },
            { name: "recipient", type: "address" },
            { name: "keyImage", type: "bytes32" },
            { name: "ringMembers", type: "bytes32[]" },
            { name: "zkProof", type: "bytes" },
            { name: "ringSignature", type: "bytes" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
        ],
        outputs: [],
    },
    // View Functions
    {
        name: "totalDeposited",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "totalFees",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "totalPoints",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "paused",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "bool" }],
    },
    {
        name: "getUserNonce",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "user", type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "isNullifierUsed",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "nullifier", type: "bytes32" }],
        outputs: [{ type: "bool" }],
    },
    // Withdrawal functions
    {
        name: "requestWithdrawal",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "pointIds", type: "bytes32[]" },
            { name: "nullifiers", type: "bytes32[]" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
        ],
        outputs: [],
    },
    {
        name: "completeWithdrawal",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "requestId", type: "bytes32" }],
        outputs: [],
    },
    {
        name: "cancelWithdrawal",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "requestId", type: "bytes32" },
            { name: "permanent", type: "bool" },
        ],
        outputs: [],
    },
] as const;

export const TREASURY_ABI = [
    {
        name: "getProtocolStats",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "reserve", type: "uint256" },
            { name: "revenue", type: "uint256" },
            { name: "yield_", type: "uint256" },
            { name: "yieldDeployed", type: "uint256" },
            { name: "reserveRatio", type: "uint256" },
        ],
    },
] as const;
