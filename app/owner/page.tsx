"use client"

import { useEffect, useState } from "react"
import { OwnerDashboard, OWNER_CONFIG } from "@/components/owner-dashboard"
import { useFPPStore } from "@/lib/fpp-store"
import { notFound } from "next/navigation"

export default function OwnerPage() {
  const { wallet } = useFPPStore()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Check if connected wallet is the owner
    if (!wallet.isConnected || !wallet.address) {
      setIsAuthorized(false)
      return
    }

    const connectedAddress = wallet.address.toLowerCase()
    const ownerAddress = OWNER_CONFIG.primaryOwner.toLowerCase()
    const isOwner = connectedAddress === ownerAddress

    setIsAuthorized(isOwner)
  }, [wallet.isConnected, wallet.address, mounted])

  // Show nothing while checking (prevents flash)
  if (!mounted || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  // Show 404 to unauthorized users - they will never know this page exists
  if (!isAuthorized) {
    notFound()
  }

  return <OwnerDashboard />
}
