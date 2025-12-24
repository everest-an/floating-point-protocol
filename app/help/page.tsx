import Link from "next/link"
import { ArrowLeft, MessageCircle, Mail, FileText, BookOpen, Shield, HelpCircle, ExternalLink } from "lucide-react"

export default function HelpCenterPage() {
  const helpCategories = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics of using Floating Point Protocol",
      links: [
        { label: "How to Connect Your Wallet", href: "/guide#connect" },
        { label: "Making Your First Deposit", href: "/guide#deposit" },
        { label: "Understanding Floating Points", href: "/whitepaper#overview" },
      ],
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Understand how your privacy is protected",
      links: [
        { label: "How ZK Proofs Work", href: "/whitepaper#zk-proofs" },
        { label: "Ring Signature Explained", href: "/whitepaper#ring-signatures" },
        { label: "Security Best Practices", href: "/security" },
      ],
    },
    {
      icon: FileText,
      title: "Transactions",
      description: "Learn about deposits, transfers, and withdrawals",
      links: [
        { label: "How to Send Private Payments", href: "/guide#payment" },
        { label: "Withdrawal Process & Timelock", href: "/guide#withdraw" },
        { label: "Understanding Fees", href: "/tokenomics#fees" },
      ],
    },
    {
      icon: HelpCircle,
      title: "Troubleshooting",
      description: "Solutions for common issues",
      links: [
        { label: "Transaction Failed", href: "#tx-failed" },
        { label: "Wallet Connection Issues", href: "#wallet-issues" },
        { label: "Withdrawal Pending", href: "#withdrawal-pending" },
      ],
    },
  ]

  const troubleshooting = [
    {
      id: "tx-failed",
      title: "Transaction Failed",
      solutions: [
        "Ensure you have enough ETH for gas fees",
        "Check that you have approved USDT spending",
        "Verify your wallet is connected to Ethereum Mainnet",
        "Try increasing gas limit in your wallet settings",
      ],
    },
    {
      id: "wallet-issues",
      title: "Wallet Connection Issues",
      solutions: [
        "Refresh the page and try connecting again",
        "Clear your browser cache and cookies",
        "Make sure your wallet extension is up to date",
        "Try using a different browser",
        "Disable other wallet extensions that might conflict",
      ],
    },
    {
      id: "withdrawal-pending",
      title: "Withdrawal Pending",
      solutions: [
        "Withdrawals have a 24-hour timelock for security",
        "Check the withdrawal status in Transaction History",
        "After 24 hours, click 'Complete Withdrawal' to receive USDT",
        "If stuck after 24 hours, contact support",
      ],
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
          <h1 className="text-sm font-medium text-white/80">Help Center</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">Help Center</h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Find answers to common questions, learn how to use the protocol, and get support when you need it.
          </p>
        </div>

        {/* Search */}
        <div className="mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help..."
              className="w-full px-4 py-3 pl-12 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
            />
            <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          </div>
        </div>

        {/* Help Categories */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helpCategories.map((category, i) => (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <category.icon className="w-6 h-6 text-violet-400" />
                  <div>
                    <h3 className="font-medium text-white/90">{category.title}</h3>
                    <p className="text-xs text-white/40">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.links.map((link, j) => (
                    <li key={j}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/60 hover:text-violet-400 transition-colors flex items-center gap-2"
                      >
                        <span className="w-1 h-1 rounded-full bg-violet-400/50" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Troubleshooting</h2>
          <div className="space-y-4">
            {troubleshooting.map((item) => (
              <div key={item.id} id={item.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="font-medium text-white/90 mb-4">{item.title}</h3>
                <ul className="space-y-2">
                  {item.solutions.map((solution, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="text-violet-400 mt-1">•</span>
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/whitepaper"
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center hover:border-violet-500/30 transition-colors"
            >
              <FileText className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <span className="text-sm text-white/70">Whitepaper</span>
            </Link>
            <Link
              href="/guide"
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center hover:border-violet-500/30 transition-colors"
            >
              <BookOpen className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <span className="text-sm text-white/70">User Guide</span>
            </Link>
            <Link
              href="/faq"
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center hover:border-violet-500/30 transition-colors"
            >
              <HelpCircle className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <span className="text-sm text-white/70">FAQ</span>
            </Link>
            <Link
              href="/security"
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center hover:border-violet-500/30 transition-colors"
            >
              <Shield className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <span className="text-sm text-white/70">Security</span>
            </Link>
          </div>
        </section>

        {/* Contact Support */}
        <section>
          <h2 className="text-xl font-semibold text-white/80 mb-6">Still Need Help?</h2>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-6">
            <p className="text-white/60 mb-6">
              Can not find what you are looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Join Discord Community
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="mailto:support@fpp.protocol"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/[0.1] text-white/70 hover:border-violet-500/30 hover:text-violet-400 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email Support
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
