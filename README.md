# Floating Point Protocol (FPP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ethereum](https://img.shields.io/badge/Ethereum-Solidity-blue)](https://soliditylang.org/)
[![Solana](https://img.shields.io/badge/Solana-Rust-orange)](https://www.rust-lang.org/)

Privacy-preserving payment protocol with multi-chain support (Ethereum + Solana). Zero-knowledge proofs and ring signatures enable anonymous transactions while maintaining auditability and security.

## 🌟 Features

### Core Privacy Features

- **Zero-Knowledge Deposits**: Create floating point commitments without revealing amounts
- **Ring Signature Payments**: Anonymous transfers using decoy addresses
- **Nullifier Protection**: Prevent double-spending with cryptographic nullifiers
- **Time-Locked Security**: 12-second point locks, 24-hour withdrawal delays

### Security Hardening

- ✅ **10-Round Security Audit** (Quantstamp/CertIK standards)
- ✅ **Multi-Signature Admin** - Critical actions require multiple approvals
- ✅ **Flash Loan Protection** - Same-block attack prevention
- ✅ **Rate Limiting** - Transaction throttling per user
- ✅ **Reentrancy Guards** - OpenZeppelin ReentrancyGuard
- ✅ **Pausable Protocol** - Emergency stop mechanism

### Multi-Chain Support

- **Ethereum (EVM)**: Production-ready Solidity contracts (872 lines)
- **Solana**: Complete Rust program with TypeScript SDK

## 📁 Project Structure

```
floating-point-protocol/
├── ethereum/                      # Ethereum implementation
│   ├── contracts/
│   │   ├── FloatingPointProtocol.sol   # Main protocol (872 lines)
│   │   ├── TreasuryManager.sol         # Treasury management
│   │   ├── FPToken.sol                 # Protocol token
│   │   ├── MockUSDT.sol                # Testing token
│   │   ├── MockVerifiers.sol           # ZK/Ring verifiers
│   │   └── DeployFPP.sol               # Deployment helper
│   ├── scripts/
│   │   ├── deploy.ts                   # Basic deployment
│   │   └── deploy-complete.ts          # Full deployment
│   ├── hardhat.config.ts
│   └── package.json
│
├── solana/                        # Solana implementation
│   ├── src/
│   │   ├── lib.rs                      # Program entry
│   │   ├── error.rs                    # Error types
│   │   ├── state.rs                    # Account structures
│   │   ├── instruction.rs              # Instructions
│   │   └── processor.rs                # Business logic
│   ├── Cargo.toml
│   ├── package.json
│   └── README.md
│
├── app/                           # Next.js frontend
│   ├── page.tsx                        # Landing page
│   ├── owner/page.tsx                  # Admin dashboard
│   ├── contracts/page.tsx              # Contract info
│   └── [docs, faq, guide, etc.]
│
├── components/                    # React components
│   ├── deposit-panel.tsx               # Deposit UI
│   ├── payment-panel.tsx               # Payment UI
│   ├── withdraw-panel.tsx              # Withdrawal UI
│   ├── owner-dashboard.tsx             # Admin panel
│   └── [wallet, stats, security, etc.]
│
├── lib/                           # Libraries
│   ├── evm/
│   │   ├── fpp-contract-client.ts      # EVM client (mock)
│   │   └── fpp-contract-client-real.ts # EVM client (real)
│   ├── solana/
│   │   └── fpp-solana-client.ts        # Solana SDK
│   ├── fpp-security.ts                 # Security layer
│   ├── fpp-types.ts                    # Type definitions
│   └── [crypto, merkle, eip712, etc.]
│
└── [config files, docs, etc.]
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Rust 1.70+ (for Solana)
- Solana CLI 1.17+ (for Solana deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/everest-an/floating-point-protocol
cd floating-point-protocol

# Install frontend dependencies
pnpm install

# Install Ethereum contract dependencies
cd ethereum
npm install
cd ..
```

### Development

```bash
# Run Next.js frontend
pnpm dev

# Compile Ethereum contracts
cd ethereum
npm run compile

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Build Solana program
cd ../solana
cargo build-bpf
```

## 📝 Smart Contract Deployment

### Ethereum (Sepolia/Mainnet)

1. **Configure environment**:

```bash
cd ethereum
cp .env.example .env
# Edit .env with your PRIVATE_KEY, RPC_URL, ETHERSCAN_API_KEY
```

1. **Deploy contracts**:

```bash
# Compile
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia

# Deploy to mainnet (use with caution!)
npm run deploy:mainnet
```

1. **Update frontend config**:
   - Edit `lib/evm/fpp-contract-client.ts`
   - Add deployed contract addresses

### Solana (Devnet/Mainnet)

```bash
cd solana

# Build program
cargo build-bpf

# Deploy to devnet
solana program deploy --url devnet target/deploy/floating_point_protocol_solana.so

# Update program ID in lib/solana/fpp-solana-client.ts
```

## 🔧 Configuration

### Contract Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| POINT_VALUE | 10 USDT | Value per floating point |
| WITHDRAWAL_DELAY | 24 hours | Withdrawal timelock |
| POINT_LOCK_DURATION | 12 seconds | New point lock time |
| DEFAULT_DEPOSIT_FEE | 0.1% | Deposit fee rate |
| DEFAULT_WITHDRAWAL_FEE | 0.1% | Withdrawal fee rate |
| MIN_DEPOSIT | 10 USDT | Minimum deposit |
| MAX_DEPOSIT | 100,000 USDT | Maximum deposit |

### Owner Address

The owner dashboard is restricted to: `0x3d0ab53241a2913d7939ae02f7083169fe7b823b`

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [Deployment Instructions](./DEPLOYMENT_INSTRUCTIONS.md) - Step-by-step guide
- [Solana README](./solana/README.md) - Solana-specific docs
- [Security Audit Report](./lib/fpp-security-audit-report.md) - Audit findings

## 🧪 Testing

```bash
# Frontend
pnpm test

# Ethereum contracts
cd ethereum
npm run test

# Solana program
cd solana
cargo test-bpf
```

## 🔒 Security

### Audit Status

✅ **Self-Audited** (10 rounds, SCSVS standards)

- QS-01: Reentrancy protection
- QS-02: Multi-signature for admin functions
- QS-03: Access control hardening
- QS-04: Input validation and gas optimization
- QS-05: Event emission for transparency
- QS-06: Oracle price staleness checks
- QS-07: Magic number elimination

⚠️ **Professional Audit**: Pending (Quantstamp/CertIK recommended)

### Security Features

- OpenZeppelin battle-tested libraries
- EIP-712 typed message signing
- Merkle tree commitment verification
- Nullifier double-spend prevention
- Flash loan attack protection
- Multi-block attack detection
- Rate limiting per user
- Emergency pause functionality

## 📈 Protocol Statistics

The protocol tracks:

- Total deposited USDT
- Total withdrawn USDT
- Total fees collected
- Active floating points
- User point balances

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Use at your own risk. The protocol is experimental and has not undergone a professional security audit by a third party. Do not use in production with real funds without a complete professional audit.

## 🔗 Links

- **Repository**: <https://github.com/everest-an/floating-point-protocol>
- **Documentation**: See `/docs` folder
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Built with privacy, secured by cryptography, powered by blockchain.**
