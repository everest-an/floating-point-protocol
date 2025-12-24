"use client"

import { FileText, ExternalLink, Download } from "lucide-react"

export function Whitepaper() {
  return (
    <section className="border-t border-white/[0.04] bg-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-violet-400" />
            <h2 className="text-2xl font-semibold text-white/90 tracking-tight">Whitepaper</h2>
          </div>
          <p className="text-sm text-white/40 max-w-2xl mx-auto">
            Technical specification of the Floating Point Protocol - a privacy-preserving payment system built on
            Ethereum.
          </p>
        </div>

        {/* Whitepaper Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Abstract */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">Abstract</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Floating Point Protocol (FPP) introduces a novel approach to blockchain privacy payments through the
              concept of "Floating Random Points" - discrete value units that exist in an anonymous pool. Each point
              represents a fixed value of $10 USDT, fully collateralized and redeemable. By combining Pedersen
              commitments, zero-knowledge proofs, and Linkable Spontaneous Anonymous Group (LSAG) ring signatures, FPP
              achieves strong sender anonymity, receiver anonymity, and amount privacy while maintaining full
              auditability for regulatory compliance when required.
            </p>
          </div>

          {/* 1. Introduction */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">1. Introduction</h3>
            <div className="space-y-4 text-sm text-white/60 leading-relaxed">
              <p>
                Public blockchains like Ethereum provide transparency and immutability, but this transparency comes at
                the cost of financial privacy. Every transaction, balance, and interaction is permanently recorded and
                publicly visible, creating significant privacy concerns for individuals and businesses alike.
              </p>
              <p>
                Existing privacy solutions such as mixers suffer from regulatory uncertainty and often require trust in
                centralized operators. FPP addresses these limitations by creating a fully decentralized, non-custodial
                privacy layer that is compatible with regulatory requirements through optional audit mechanisms.
              </p>
              <p>
                The core innovation of FPP is the "Floating Point" - a cryptographic representation of value that can be
                transferred without revealing the sender, receiver, or amount. Points float in a global pool, selected
                through a gravity-weighted random algorithm that incentivizes liquidity while maintaining strong
                anonymity guarantees.
              </p>
            </div>
          </div>

          {/* 2. System Architecture */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">2. System Architecture</h3>

            <h4 className="text-sm font-medium text-violet-400 mt-4 mb-2">2.1 Floating Point Structure</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-3">
              Each Floating Point contains the following cryptographic components:
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-violet-300/80 mb-4">
              <pre>{`struct FloatingPoint {
  bytes32 id;           // Unique identifier (hash of commitment)
  uint256 value;        // Fixed at 10 USDT (10 * 10^6)
  bytes32 commitment;   // Pedersen commitment: C = vG + rH
  bytes32 nullifierHash;// Hash for double-spend prevention
  uint256 mass;         // Selection weight (increases with age)
  uint256 createdAt;    // Block timestamp of creation
  address owner;        // Commitment to owner (hidden)
}`}</pre>
            </div>

            <h4 className="text-sm font-medium text-violet-400 mt-6 mb-2">2.2 Pedersen Commitments</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-3">
              Values are hidden using Pedersen commitments, which provide both hiding (privacy) and binding (integrity):
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-violet-300/80 mb-2">C = vG + rH</div>
            <p className="text-sm text-white/40 mb-4">
              Where v is the value, r is a random blinding factor, and G, H are generator points on the elliptic curve.
            </p>

            <h4 className="text-sm font-medium text-violet-400 mt-6 mb-2">2.3 Nullifiers</h4>
            <p className="text-sm text-white/60 leading-relaxed">
              Each point has a unique nullifier derived from the owner's secret key. When a point is spent, its
              nullifier is published and stored on-chain. Attempting to spend the same point twice will produce the same
              nullifier, which the contract will reject.
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-violet-300/80 mt-3">
              nullifier = hash(pointId || secretKey)
            </div>
          </div>

          {/* 3. Privacy Mechanisms */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">3. Privacy Mechanisms</h3>

            <h4 className="text-sm font-medium text-violet-400 mt-4 mb-2">3.1 Ring Signatures (LSAG)</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-3">
              FPP uses Linkable Spontaneous Anonymous Group signatures to hide the true sender among a set of decoys.
              The signature proves that one member of the ring authorized the transaction, without revealing which one.
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-violet-300/80 mb-4">
              <pre>{`// Ring signature generation
σ = LSAG.Sign(message, secretKey, ringPublicKeys)

// Verification
LSAG.Verify(message, σ, ringPublicKeys) → true/false

// Key image (linkability tag)
I = secretKey × Hash_p(publicKey)`}</pre>
            </div>
            <p className="text-sm text-white/40">
              The key image I is unique per secret key and allows detection of double-signing without revealing
              identity.
            </p>

            <h4 className="text-sm font-medium text-violet-400 mt-6 mb-2">3.2 Zero-Knowledge Proofs</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-3">
              ZK-SNARKs prove the following statements without revealing any private information:
            </p>
            <ul className="list-disc list-inside text-sm text-white/50 space-y-1 mb-4">
              <li>The sender knows the secret key for one of the input points</li>
              <li>The nullifier is correctly computed from the point and secret</li>
              <li>Input values equal output values (conservation)</li>
              <li>All commitments are correctly formed</li>
            </ul>

            <h4 className="text-sm font-medium text-violet-400 mt-6 mb-2">3.3 Stealth Addresses</h4>
            <p className="text-sm text-white/60 leading-relaxed">
              Recipients generate one-time stealth addresses for each transaction. The sender encrypts the output
              randomness with the recipient's public key, allowing only the recipient to claim the new points.
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-violet-300/80 mt-3">
              <pre>{`// Stealth address generation
r = random()
R = r × G                    // Published ephemeral key
P = Hash(r × recipientPubKey) × G + recipientPubKey`}</pre>
            </div>
          </div>

          {/* 4. Gravity-Weighted Selection */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">4. Gravity-Weighted Selection Algorithm</h3>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              When spending points, the protocol uses a gravity-weighted random selection algorithm. This ensures older
              points are more likely to be selected, improving the anonymity set and encouraging circulation.
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-violet-300/80 mb-4">
              <pre>{`// Weight calculation
weight(point) = mass × √(age + 1) × GRAVITY_CONSTANT

// Selection probability
P(point) = weight(point) / Σ weights

// Where:
//   mass = initial mass (default: 1.0)
//   age = currentTime - createdAt
//   GRAVITY_CONSTANT = 9.81 (configurable)`}</pre>
            </div>
            <p className="text-sm text-white/40">
              This creates a natural "sink" effect where older points gravitate toward selection, while newer points
              gradually increase their probability over time.
            </p>
          </div>

          {/* 5. Tokenomics */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">5. Tokenomics & Value Stability</h3>

            <h4 className="text-sm font-medium text-green-400 mt-4 mb-2">5.1 100% Collateralization</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Every Floating Point is backed 1:1 by USDT held in the Treasury contract. The total value of all
              outstanding FP equals the USDT reserve at all times. This is verifiable on-chain:
            </p>
            <div className="bg-black/50 rounded p-4 font-mono text-xs text-green-300/80 mb-4">
              totalFP × $10 = Treasury.balance()
            </div>

            <h4 className="text-sm font-medium text-green-400 mt-6 mb-2">5.2 Fixed Denomination</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Each FP has a fixed value of $10 USDT. This simplifies privacy by eliminating amount analysis - all points
              are fungible and indistinguishable by value.
            </p>

            <h4 className="text-sm font-medium text-green-400 mt-6 mb-2">5.3 Fee Structure</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="p-3 rounded bg-black/30 border border-white/[0.04]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Deposit Fee</p>
                <p className="text-lg font-mono text-green-400 mt-1">0.1%</p>
                <p className="text-[9px] text-white/40 mt-1">Applied when buying FP</p>
              </div>
              <div className="p-3 rounded bg-black/30 border border-white/[0.04]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Transfer Fee</p>
                <p className="text-lg font-mono text-violet-400 mt-1">0%</p>
                <p className="text-[9px] text-white/40 mt-1">Private transfers are free</p>
              </div>
              <div className="p-3 rounded bg-black/30 border border-white/[0.04]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Withdrawal Fee</p>
                <p className="text-lg font-mono text-amber-400 mt-1">0.1%</p>
                <p className="text-[9px] text-white/40 mt-1">Applied when redeeming</p>
              </div>
            </div>
          </div>

          {/* 6. Security */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">6. Security Model</h3>

            <h4 className="text-sm font-medium text-red-400 mt-4 mb-2">6.1 Threat Model</h4>
            <ul className="list-disc list-inside text-sm text-white/50 space-y-2 mb-4">
              <li>
                <strong className="text-white/70">Double Spending:</strong> Prevented by nullifier set stored on-chain
              </li>
              <li>
                <strong className="text-white/70">Front-running:</strong> Mitigated by commit-reveal scheme in ZK proofs
              </li>
              <li>
                <strong className="text-white/70">Sybil Attacks:</strong> Economic cost of USDT deposit required
              </li>
              <li>
                <strong className="text-white/70">Timing Analysis:</strong> Decoy selection randomized with VRF
              </li>
            </ul>

            <h4 className="text-sm font-medium text-amber-400 mt-6 mb-2">6.2 24-Hour Timelock</h4>
            <p className="text-sm text-white/60 leading-relaxed">
              All withdrawals require a 24-hour waiting period. This provides protection against:
            </p>
            <ul className="list-disc list-inside text-sm text-white/50 space-y-1 mt-2">
              <li>Flash loan attacks attempting to drain the protocol</li>
              <li>Compromised wallets (user can cancel within timelock)</li>
              <li>Smart contract bugs (governance can pause if needed)</li>
            </ul>
          </div>

          {/* 7. Compliance */}
          <div className="p-6 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <h3 className="text-lg font-medium text-white/90 mb-4">7. Regulatory Compliance</h3>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              FPP supports optional compliance features for users who require auditability:
            </p>

            <h4 className="text-sm font-medium text-violet-400 mt-4 mb-2">7.1 View Keys</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Users can generate view keys that allow designated auditors to see their transaction history without
              gaining spending authority.
            </p>

            <h4 className="text-sm font-medium text-violet-400 mt-4 mb-2">7.2 Selective Disclosure</h4>
            <p className="text-sm text-white/60 leading-relaxed">
              Users can prove specific facts about their transactions (e.g., "I sent X to address Y at time T") without
              revealing their entire history, using zero-knowledge proofs.
            </p>
          </div>

          {/* Download Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <a
              href="#"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download PDF</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/60 hover:bg-white/[0.04] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">View on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
