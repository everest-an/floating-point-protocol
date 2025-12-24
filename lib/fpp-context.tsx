"use client"

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react"
import type { FloatingPoint, Transaction, WalletState } from "./fpp-types"
import { keccak256 } from "./fpp-hash"

// Types
interface FPPState {
  wallet: WalletState
  availablePoints: FloatingPoint[]
  userPoints: FloatingPoint[]
  selectedPointIds: string[]
  activePointDetail: FloatingPoint | null
  transactions: Transaction[]
  animations: FloatingPoint[]
  stats: {
    totalValueLocked: number
    activePoints: number
    transactions24h: number
    privacyScore: number
  }
}

type FPPAction =
  | { type: "SET_WALLET"; payload: Partial<WalletState> }
  | { type: "CONNECT_WALLET"; payload: { address: string; userPoints: FloatingPoint[] } }
  | { type: "DISCONNECT_WALLET" }
  | { type: "SET_SELECTED_POINT_IDS"; payload: string[] }
  | { type: "TOGGLE_POINT_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_ACTIVE_POINT_DETAIL"; payload: FloatingPoint | null }
  | { type: "ADD_TRANSACTION"; payload: Transaction }
  | { type: "UPDATE_STATS"; payload: Partial<FPPState["stats"]> }
  | { type: "ADD_USER_POINTS"; payload: FloatingPoint[] }
  | { type: "REMOVE_USER_POINTS"; payload: string[] }
  | { type: "ADD_ANIMATION"; payload: FloatingPoint }
  | { type: "REMOVE_ANIMATION"; payload: string }

// Helper functions
function generatePointId(): string {
  return keccak256(`point-${Date.now()}-${Math.random()}`).slice(0, 18)
}

function generateInitialPoints(): FloatingPoint[] {
  const points: FloatingPoint[] = []
  for (let i = 0; i < 80; i++) {
    const value = Math.floor(Math.random() * 900) + 100
    const age = Math.floor(Math.random() * 30)
    const id = generatePointId()
    points.push({
      id,
      value,
      age,
      commitment: keccak256(`commitment-${id}-${value}`),
      nullifier: keccak256(`nullifier-${id}-${Date.now()}`),
      status: "active" as const,
      createdAt: Date.now() - age * 24 * 60 * 60 * 1000,
    })
  }
  return points
}

// Initial state
const initialState: FPPState = {
  wallet: {
    address: null,
    isConnected: false,
    balance: 0,
    points: [],
  },
  availablePoints: generateInitialPoints(),
  userPoints: [],
  selectedPointIds: [],
  activePointDetail: null,
  transactions: [],
  animations: [],
  stats: {
    totalValueLocked: 1250000,
    activePoints: 3420,
    transactions24h: 156,
    privacyScore: 98,
  },
}

// Reducer
function fppReducer(state: FPPState, action: FPPAction): FPPState {
  switch (action.type) {
    case "SET_WALLET":
      return {
        ...state,
        wallet: { ...state.wallet, ...action.payload },
      }
    case "CONNECT_WALLET":
      return {
        ...state,
        wallet: {
          address: action.payload.address,
          isConnected: true,
          balance: action.payload.userPoints.reduce((sum, p) => sum + p.value, 0),
          points: action.payload.userPoints,
        },
        userPoints: action.payload.userPoints,
      }
    case "DISCONNECT_WALLET":
      return {
        ...state,
        wallet: {
          address: null,
          isConnected: false,
          balance: 0,
          points: [],
        },
        userPoints: [],
        selectedPointIds: [],
      }
    case "SET_SELECTED_POINT_IDS":
      return { ...state, selectedPointIds: action.payload }
    case "TOGGLE_POINT_SELECTION":
      return {
        ...state,
        selectedPointIds: state.selectedPointIds.includes(action.payload)
          ? state.selectedPointIds.filter((id) => id !== action.payload)
          : [...state.selectedPointIds, action.payload],
      }
    case "CLEAR_SELECTION":
      return { ...state, selectedPointIds: [] }
    case "SET_ACTIVE_POINT_DETAIL":
      return { ...state, activePointDetail: action.payload }
    case "ADD_TRANSACTION":
      return {
        ...state,
        transactions: [action.payload, ...state.transactions].slice(0, 100),
      }
    case "UPDATE_STATS":
      return {
        ...state,
        stats: { ...state.stats, ...action.payload },
      }
    case "ADD_USER_POINTS":
      const newPoints = [...state.userPoints, ...action.payload]
      return {
        ...state,
        userPoints: newPoints,
        wallet: {
          ...state.wallet,
          balance: newPoints.reduce((sum, p) => sum + p.value, 0),
          points: newPoints,
        },
      }
    case "REMOVE_USER_POINTS":
      const remainingPoints = state.userPoints.filter((p) => !action.payload.includes(p.id))
      return {
        ...state,
        userPoints: remainingPoints,
        selectedPointIds: state.selectedPointIds.filter((id) => !action.payload.includes(id)),
        wallet: {
          ...state.wallet,
          balance: remainingPoints.reduce((sum, p) => sum + p.value, 0),
          points: remainingPoints,
        },
      }
    case "ADD_ANIMATION":
      return {
        ...state,
        animations: [...state.animations, action.payload],
      }
    case "REMOVE_ANIMATION":
      return {
        ...state,
        animations: state.animations.filter((a) => a.id !== action.payload),
      }
    default:
      return state
  }
}

// Context
interface FPPContextValue {
  state: FPPState
  // Wallet actions
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  setWallet: (wallet: Partial<WalletState>) => void
  // Point selection
  setSelectedPointIds: (ids: string[]) => void
  togglePointSelection: (id: string) => void
  clearSelection: () => void
  setActivePointDetail: (point: FloatingPoint | null) => void
  // Transactions
  addTransaction: (tx: Transaction) => void
  updateStats: (stats: Partial<FPPState["stats"]>) => void
  // Core operations
  generatePoints: (usdtAmount: number) => Promise<void>
  executePayment: (
    amount: number,
    recipientType: "wallet" | "email" | "telegram",
    recipient: string,
  ) => Promise<{ txHash: string; newPointId: string }>
  requestWithdrawal: (pointIds: string[], targetAddress: string) => Promise<void>
  // Animation
  addAnimation: (point: FloatingPoint) => void
  removeAnimation: (id: string) => void
}

const FPPContext = createContext<FPPContextValue | null>(null)

// Provider
export function FPPProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fppReducer, initialState)

  const connectWallet = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800))
    const address = "0x" + keccak256(`wallet-${Date.now()}`).slice(2, 42)
    const userPoints: FloatingPoint[] = []
    for (let i = 0; i < 5; i++) {
      const value = Math.floor(Math.random() * 900) + 100
      const id = generatePointId()
      userPoints.push({
        id,
        value,
        age: Math.floor(Math.random() * 30),
        commitment: keccak256(`commitment-${id}-${value}`),
        nullifier: keccak256(`nullifier-${id}-${Date.now()}`),
        status: "active" as const,
        createdAt: Date.now(),
      })
    }
    dispatch({ type: "CONNECT_WALLET", payload: { address, userPoints } })
  }, [])

  const disconnectWallet = useCallback(() => {
    dispatch({ type: "DISCONNECT_WALLET" })
  }, [])

  const setWallet = useCallback((wallet: Partial<WalletState>) => {
    dispatch({ type: "SET_WALLET", payload: wallet })
  }, [])

  const setSelectedPointIds = useCallback((ids: string[]) => {
    dispatch({ type: "SET_SELECTED_POINT_IDS", payload: ids })
  }, [])

  const togglePointSelection = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_POINT_SELECTION", payload: id })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" })
  }, [])

  const setActivePointDetail = useCallback((point: FloatingPoint | null) => {
    dispatch({ type: "SET_ACTIVE_POINT_DETAIL", payload: point })
  }, [])

  const addTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "ADD_TRANSACTION", payload: tx })
  }, [])

  const updateStats = useCallback((stats: Partial<FPPState["stats"]>) => {
    dispatch({ type: "UPDATE_STATS", payload: stats })
  }, [])

  const addAnimation = useCallback((point: FloatingPoint) => {
    dispatch({ type: "ADD_ANIMATION", payload: point })
  }, [])

  const removeAnimation = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ANIMATION", payload: id })
  }, [])

  const generatePoints = useCallback(async (usdtAmount: number) => {
    await new Promise((r) => setTimeout(r, 1500))
    const pointValue = 10
    const numPoints = Math.floor(usdtAmount / pointValue)
    const newPoints: FloatingPoint[] = []

    for (let i = 0; i < numPoints; i++) {
      const id = generatePointId()
      newPoints.push({
        id,
        value: pointValue,
        age: 0,
        commitment: keccak256(`commitment-${id}-${pointValue}`),
        nullifier: keccak256(`nullifier-${id}-${Date.now()}`),
        status: "active" as const,
        createdAt: Date.now(),
      })
    }

    dispatch({ type: "ADD_USER_POINTS", payload: newPoints })
    dispatch({
      type: "ADD_TRANSACTION",
      payload: {
        id: keccak256(`tx-deposit-${Date.now()}`).slice(0, 18),
        type: "deposit",
        amount: usdtAmount,
        timestamp: Date.now(),
        status: "confirmed",
        txHash: "0x" + keccak256(`hash-${Date.now()}`).slice(2, 66),
      },
    })
  }, [])

  const executePayment = useCallback(
    async (
      amount: number,
      recipientType: "wallet" | "email" | "telegram",
      recipient: string,
    ): Promise<{ txHash: string; newPointId: string }> => {
      await new Promise((r) => setTimeout(r, 2000))

      // Find points to spend
      const sortedPoints = [...state.userPoints].sort((a, b) => a.value - b.value)
      let remaining = amount
      const pointsToSpend: string[] = []

      for (const point of sortedPoints) {
        if (remaining <= 0) break
        pointsToSpend.push(point.id)
        remaining -= point.value
      }

      // Remove spent points
      dispatch({ type: "REMOVE_USER_POINTS", payload: pointsToSpend })

      // Create new point for recipient (privacy: no direct link)
      const newPointId = generatePointId()
      const txHash = "0x" + keccak256(`payment-${Date.now()}-${recipient}`).slice(2, 66)

      dispatch({
        type: "ADD_TRANSACTION",
        payload: {
          id: keccak256(`tx-payment-${Date.now()}`).slice(0, 18),
          type: "payment",
          amount,
          timestamp: Date.now(),
          status: "confirmed",
          txHash,
          recipient,
          recipientType,
        },
      })

      return { txHash, newPointId }
    },
    [state.userPoints],
  )

  const requestWithdrawal = useCallback(
    async (pointIds: string[], targetAddress: string) => {
      await new Promise((r) => setTimeout(r, 2000))

      const withdrawAmount = state.userPoints
        .filter((p) => pointIds.includes(p.id))
        .reduce((sum, p) => sum + p.value, 0)

      dispatch({ type: "REMOVE_USER_POINTS", payload: pointIds })

      dispatch({
        type: "ADD_TRANSACTION",
        payload: {
          id: keccak256(`tx-withdraw-${Date.now()}`).slice(0, 18),
          type: "withdrawal",
          amount: withdrawAmount,
          timestamp: Date.now(),
          status: "pending",
          txHash: "0x" + keccak256(`withdraw-${Date.now()}`).slice(2, 66),
          recipient: targetAddress,
        },
      })
    },
    [state.userPoints],
  )

  const value: FPPContextValue = {
    state,
    connectWallet,
    disconnectWallet,
    setWallet,
    setSelectedPointIds,
    togglePointSelection,
    clearSelection,
    setActivePointDetail,
    addTransaction,
    updateStats,
    generatePoints,
    executePayment,
    requestWithdrawal,
    addAnimation,
    removeAnimation,
  }

  return <FPPContext.Provider value={value}>{children}</FPPContext.Provider>
}

// Hook
export function useFPP() {
  const context = useContext(FPPContext)
  if (!context) {
    throw new Error("useFPP must be used within a FPPProvider")
  }
  return context
}

// Compatibility hook (maps to zustand-like interface)
export function useFPPStore<T>(selector: (state: FPPContextValue) => T): T {
  const context = useFPP()
  return selector(context)
}
