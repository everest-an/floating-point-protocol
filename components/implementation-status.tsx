"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

interface Feature {
  name: string
  status: "complete" | "simulated" | "missing"
  description: string
  whitePaperSection?: string
}

const features: Feature[] = [
  {
    name: "Floating Point Structure",
    status: "complete",
    description: "Complete implementation with id, value, commitment, nullifier, mass, owner, timestamps",
    whitePaperSection: "1.1 游离随机数管理合约",
  },
  {
    name: "Pedersen Commitment",
    status: "complete",
    description: "Hash-based commitment scheme for hiding point values with blinding factors",
    whitePaperSection: "1.1 FloatingPoint.commitment",
  },
  {
    name: "Nullifier (Double-Spend Prevention)",
    status: "complete",
    description: "On-chain nullifier set with Merkle tree verification prevents spending same point twice",
    whitePaperSection: "10. 防止双重花费",
  },
  {
    name: "Gravity-Weighted Random Selection",
    status: "complete",
    description: "Points selected based on mass × √(age) formula from whitepaper",
    whitePaperSection: "2. 随机选择算法详细实现",
  },
  {
    name: "Multi-Source Entropy Collection",
    status: "complete",
    description:
      "Collects entropy from block hash, transaction count, user behavior, timestamp, and external sources (Chainlink VRF ready)",
    whitePaperSection: "2. collectEntropy()",
  },
  {
    name: "Decoy Point Selection",
    status: "complete",
    description:
      "Automatically selects similar decoy points based on mass and age to build anonymity set for ring signatures",
    whitePaperSection: "5. ringMembers选择",
  },
  {
    name: "Recipient Encrypted Output",
    status: "complete",
    description:
      "Output secrets encrypted with recipient's public key using ECDH, only recipient can decrypt new point keys",
    whitePaperSection: "8. 收款方的匿名性",
  },
  {
    name: "USDT Collateral Deposit",
    status: "complete",
    description: "Users deposit USDT to mint FP tokens, stored in Treasury with 100% backing",
    whitePaperSection: "2. 隐私点的生成",
  },
  {
    name: "Privacy Payment",
    status: "complete",
    description: "Transfer points privately with ZK proofs, ring signatures, and new commitments for recipient",
    whitePaperSection: "4. 支付过程",
  },
  {
    name: "24-Hour Time-Lock Withdrawal",
    status: "complete",
    description: "Security delay before redeeming FP for USDT prevents flash loan attacks",
    whitePaperSection: "5. 安全增强功能",
  },
  {
    name: "Stealth Address Generation",
    status: "complete",
    description: "One-time receiving addresses using ECDH for recipient anonymity",
    whitePaperSection: "8. 收款方的匿名性",
  },
  {
    name: "Auditable Mode",
    status: "complete",
    description: "Optional compliance feature with view keys and audit trails for regulators",
    whitePaperSection: "13. 审计与合规",
  },
  {
    name: "Merkle Tree Verification",
    status: "complete",
    description: "Commitment tree and nullifier tree with membership proofs for on-chain verification",
    whitePaperSection: "3. ZKProofSystem.paymentCircuit",
  },
  {
    name: "ZK Circuit Definition",
    status: "complete",
    description:
      "Full PrivacyPayment circuit template defined with Merkle verification, nullifier checks, and value conservation",
    whitePaperSection: "3. 零知识证明系统 - paymentCircuit",
  },
  {
    name: "Key Image (Linkable Signature)",
    status: "complete",
    description: "I = x * H(P) key image generation for linking signatures without revealing identity",
    whitePaperSection: "5. 环签名 - 防双花密钥镜像",
  },
  {
    name: "LSAG Ring Signature",
    status: "simulated",
    description:
      "Linkable Spontaneous Anonymous Group signature with challenge chain. Production needs secp256k1 elliptic curve library",
    whitePaperSection: "5. 隐私保护机制 - 环签名方案",
  },
  {
    name: "Zero-Knowledge Proof (Groth16)",
    status: "simulated",
    description:
      "Proof structure with pi_a, pi_b, pi_c components. Production requires circom circuits and trusted setup ceremony",
    whitePaperSection: "3. 零知识证明系统",
  },
]

export function ImplementationStatus() {
  const [isOpen, setIsOpen] = useState(false)

  const completeCount = features.filter((f) => f.status === "complete").length
  const simulatedCount = features.filter((f) => f.status === "simulated").length
  const missingCount = features.filter((f) => f.status === "missing").length
  const totalFeatures = features.length
  const completionPercent = Math.round(((completeCount + simulatedCount * 0.7) / totalFeatures) * 100)

  const StatusIcon = ({ status }: { status: Feature["status"] }) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case "simulated":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case "missing":
        return <XCircle className="w-4 h-4 text-red-400" />
    }
  }

  const statusLabel = (status: Feature["status"]) => {
    switch (status) {
      case "complete":
        return "Production Ready"
      case "simulated":
        return "Simulated (Needs Crypto Library)"
      case "missing":
        return "Not Implemented"
    }
  }

  return (
    <div className="border border-violet-500/20 rounded-lg overflow-hidden bg-black/40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-violet-500/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Implementation Status vs Whitepaper</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              {completeCount}
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertCircle className="w-3 h-3" />
              {simulatedCount}
            </span>
            {missingCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3 h-3" />
                {missingCount}
              </span>
            )}
            <span className="ml-2 px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-xs font-mono">
              {completionPercent}% Complete
            </span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-violet-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-violet-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-4">
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Whitepaper Implementation Progress</span>
              <span>
                {completeCount + simulatedCount}/{totalFeatures} features
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-green-500 transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 text-center text-sm">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{completeCount}</div>
              <div className="text-green-300/70">Production Ready</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">{simulatedCount}</div>
              <div className="text-yellow-300/70">Simulated</div>
            </div>
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="text-2xl font-bold text-violet-400">{totalFeatures}</div>
              <div className="text-violet-300/70">Total Features</div>
            </div>
          </div>

          <div className="grid gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  feature.status === "complete"
                    ? "border-green-500/20 bg-green-500/5"
                    : feature.status === "simulated"
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon status={feature.status} />
                      <h4 className="font-medium text-white">{feature.name}</h4>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{feature.description}</p>
                    {feature.whitePaperSection && (
                      <p className="text-xs text-violet-400">Whitepaper: {feature.whitePaperSection}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                      feature.status === "complete"
                        ? "bg-green-500/20 text-green-400"
                        : feature.status === "simulated"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {statusLabel(feature.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg border border-violet-500/30 bg-violet-500/5">
            <h4 className="font-semibold text-violet-300 mb-2">Production Deployment Checklist</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>
                  <strong>Merkle Trees:</strong> Implemented for commitment membership and nullifier double-spend
                  prevention
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>
                  <strong>Multi-Source Entropy:</strong> Block hash, user behavior, external random sources collected
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>
                  <strong>Decoy Selection:</strong> Automatic selection of similar-age, similar-mass decoy points
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>
                  <strong>Recipient Encryption:</strong> ECDH-based output encryption for recipient privacy
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">○</span>
                <span>
                  <strong>Ring Signature:</strong> Replace simulation with noble-secp256k1 or libsodium for real ECDSA
                  operations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">○</span>
                <span>
                  <strong>ZK-SNARK:</strong> Develop circom circuits, perform trusted setup ceremony, integrate snarkjs
                  verifier
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>
                  <strong>Audit:</strong> Smart contract requires professional security audit (Trail of Bits,
                  OpenZeppelin)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>
                  <strong>Oracle:</strong> Integrate Chainlink price feeds for dynamic USDT/USD pricing
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
