import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">Privacy Policy</h1>
          <p className="text-white/50">Last updated: January 2025</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">1. Introduction</h2>
            <p className="text-white/60 leading-relaxed">
              Floating Point Protocol (&quot;FPP&quot;) is designed with privacy as a core principle. This Privacy
              Policy explains what information we collect, how we use it, and your rights regarding your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white/70 mb-2">On-Chain Data</h3>
                <p className="text-white/60 leading-relaxed">
                  The Protocol operates on a public blockchain. While transactions are designed to be private through ZK
                  proofs and ring signatures, certain data is publicly visible:
                </p>
                <ul className="list-disc list-inside text-white/60 space-y-1 mt-2">
                  <li>Deposit transactions (wallet address, amount)</li>
                  <li>Withdrawal transactions (wallet address, amount)</li>
                  <li>Cryptographic commitments (but not the underlying values)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white/70 mb-2">Off-Chain Data</h3>
                <p className="text-white/60 leading-relaxed">We do not collect or store:</p>
                <ul className="list-disc list-inside text-white/60 space-y-1 mt-2">
                  <li>Personal identification information</li>
                  <li>Email addresses or phone numbers</li>
                  <li>IP addresses (our frontend does not log requests)</li>
                  <li>Private keys or nullifier secrets</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">3. How Privacy is Protected</h2>
            <p className="text-white/60 leading-relaxed mb-4">
              FPP uses advanced cryptographic techniques to protect your transaction privacy:
            </p>
            <ul className="list-disc list-inside text-white/60 space-y-2">
              <li>
                <strong className="text-white/70">Zero-Knowledge Proofs:</strong> Verify transaction validity without
                revealing amounts or participants
              </li>
              <li>
                <strong className="text-white/70">Ring Signatures:</strong> Hide the sender among a group of decoy
                signers
              </li>
              <li>
                <strong className="text-white/70">Pedersen Commitments:</strong> Cryptographically hide values while
                preserving verifiability
              </li>
              <li>
                <strong className="text-white/70">Stealth Addresses:</strong> Generate one-time addresses for recipients
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">4. Third-Party Services</h2>
            <p className="text-white/60 leading-relaxed">
              To interact with the Protocol, you may use third-party services such as wallet providers (MetaMask, etc.)
              and RPC providers. These services have their own privacy policies that govern their data collection
              practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">5. Audit Mode (Optional)</h2>
            <p className="text-white/60 leading-relaxed">
              Users can optionally enable Audit Mode, which generates view keys that can be shared with authorized
              parties (e.g., regulators, auditors). This is entirely opt-in and under user control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">6. Your Rights</h2>
            <p className="text-white/60 leading-relaxed">
              Since we do not collect personal data, traditional data subject rights (access, deletion, etc.) do not
              apply in the conventional sense. You have full control over your on-chain assets through your private
              keys.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">7. Contact</h2>
            <p className="text-white/60 leading-relaxed">
              For questions about this Privacy Policy, please contact us at privacy@fpp.protocol
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
