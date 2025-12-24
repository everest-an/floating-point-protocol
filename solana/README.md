# Floating Point Protocol - Solana Program

Privacy-preserving payment protocol implementation for Solana blockchain.

## Features

- **Privacy-Preserving Deposits**: Create floating point commitments with zero-knowledge proofs
- **Anonymous Payments**: Transfer value using ring signatures and ZK proofs
- **Time-Locked Withdrawals**: 24-hour withdrawal delay for security
- **Fee Management**: Configurable deposit and withdrawal fees
- **Multi-Sig Admin**: Protocol governance with multi-signature requirements

## Program Structure

```
solana/
├── src/
│   ├── lib.rs           # Program entry point
│   ├── error.rs         # Custom error types
│   ├── state.rs         # Account state structures
│   ├── instruction.rs   # Instruction definitions
│   └── processor.rs     # Business logic implementation
├── Cargo.toml           # Rust dependencies
└── package.json         # TypeScript SDK dependencies
```

## Building the Program

### Prerequisites

- Rust 1.70+
- Solana CLI 1.17+
- Anchor Framework (optional)

### Build Commands

```bash
# Build the Solana program
cargo build-bpf

# Run tests
cargo test-bpf

# Deploy to devnet
solana program deploy target/deploy/floating_point_protocol_solana.so
```

## TypeScript SDK

The TypeScript client provides a simple interface to interact with the Solana program:

```typescript
import { FPPSolanaClient } from './lib/solana/fpp-solana-client';
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Initialize client
const connection = new Connection(clusterApiUrl('devnet'));
const client = new FPPSolanaClient(connection);

// Deposit USDT
const commitments = [new Uint8Array(32)]; // Your commitments
await client.deposit(userKeypair, 10_000_000, commitments, usdtMint);

// Request withdrawal
await client.requestWithdrawal(userKeypair, [pointPDA], [nullifier]);

// Complete withdrawal (after delay)
await client.completeWithdrawal(userKeypair, withdrawalPDA, usdtMint);
```

## Instructions

### Initialize

Initialize the protocol with treasury and fee configuration.

### Deposit

Deposit USDT tokens and create floating point commitments.

### PrivacyPayment

Execute zero-knowledge payment with ring signatures (not fully implemented yet).

### RequestWithdrawal

Request to withdraw floating points back to USDT (starts 24h delay).

### CompleteWithdrawal

Complete withdrawal after delay period.

### CancelWithdrawal

Cancel a pending withdrawal request.

## Security Features

- **Time Locks**: 12-second point lock after creation
- **Withdrawal Delays**: 24-hour timelock for withdrawals
- **Rate Limiting**: Transaction rate limits per user
- **Flash Loan Protection**: Same-block deposit/withdrawal prevention
- **Nullifier Tracking**: Prevent double-spending
- **Multi-Sig**: Administrative actions require multiple signatures

## Account Structure

### ProtocolState (103 bytes)

- Authority, treasury, and USDT mint addresses
- Total deposited/withdrawn/fees statistics
- Fee rate configuration
- Pause state

### FloatingPoint (90 bytes)

- Commitment hash
- Creation timestamp and lock time
- Mass and active status
- Creator address

### WithdrawalRequest (66 bytes)

- Requester address
- Amount and timestamps
- Completion/cancellation status

## Constants

- `POINT_VALUE`: 10 USDT (10,000,000 lamports with 6 decimals)
- `WITHDRAWAL_DELAY`: 24 hours (86,400 seconds)
- `MIN_DEPOSIT`: 10 USDT
- `MAX_DEPOSIT`: 100,000 USDT
- `DEFAULT_FEE_RATE`: 0.1% (10 basis points)

## Development Status

✅ **Complete**:

- Core account structures
- Deposit/withdrawal logic
- Fee calculation
- Time-lock mechanisms
- TypeScript SDK

⚠️ **TODO**:

- Full ZK proof verification integration
- Ring signature verification
- Commitment tree management
- Production deployment scripts
- Comprehensive test suite

## License

MIT
