import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function FAQPage() {
  const faqs = [
    {
      q: "What is a Floating Point (FP)?",
      a: "A Floating Point is a privacy-preserving token with a fixed value of $10 USDT. Each FP is backed 1:1 by USDT collateral stored in the Treasury smart contract.",
    },
    {
      q: "How does privacy work?",
      a: "FPP uses a combination of Zero-Knowledge Proofs (ZKP) and Ring Signatures. ZK proofs verify transaction validity without revealing amounts, while ring signatures hide the sender among a group of decoy signers.",
    },
    {
      q: "Why is there a 24-hour withdrawal delay?",
      a: "The timelock provides security against potential attacks. If suspicious activity is detected, the protocol can pause withdrawals before funds leave the system.",
    },
    {
      q: "Can I trade FP tokens on exchanges?",
      a: "No. FP tokens are designed for private payments, not speculation. They can only be minted by depositing USDT and burned by redeeming USDT through the protocol.",
    },
    {
      q: "What happens if I lose my private keys?",
      a: "Your Floating Points are controlled by your wallet. If you lose access to your wallet, you lose access to your FP tokens. Always backup your wallet securely.",
    },
    {
      q: "Is the protocol audited?",
      a: "Yes. The smart contracts have been audited by independent security firms. Audit reports are available on the Security page.",
    },
    {
      q: "How are the decoy points selected?",
      a: "FPP uses a gravity-weighted random selection algorithm. Points with higher 'mass' (age × value) have a higher probability of being selected as decoys, improving privacy.",
    },
    {
      q: "What is the minimum transaction amount?",
      a: "The minimum is 1 FP ($10 USDT). This fixed denomination simplifies the privacy model and prevents amount correlation attacks.",
    },
    {
      q: "Can regulators see my transactions?",
      a: "By default, transactions are private. However, users can optionally enable Audit Mode, which generates view keys that can be shared with authorized parties for compliance.",
    },
    {
      q: "What networks are supported?",
      a: "Currently, FPP is deployed on Ethereum Mainnet. Support for additional EVM-compatible chains is planned for future releases.",
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">FAQ</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">Frequently Asked Questions</h1>
          <p className="text-white/50">Common questions about Floating Point Protocol</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="font-medium text-white/90 mb-3">{faq.q}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
