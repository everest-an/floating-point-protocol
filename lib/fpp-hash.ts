// Pure JavaScript implementation of crypto functions to replace viem
// This allows the app to work in v0 environment without viem dependency

// Keccak-256 implementation
const KECCAK_ROUNDS = 24
const KECCAK_RC = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
]

const KECCAK_ROTC = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44]

const KECCAK_PILN = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1]

function rotl64(x: bigint, y: number): bigint {
  return ((x << BigInt(y)) | (x >> BigInt(64 - y))) & 0xffffffffffffffffn
}

function keccakF(state: bigint[]): void {
  for (let round = 0; round < KECCAK_ROUNDS; round++) {
    // Theta
    const c: bigint[] = []
    for (let x = 0; x < 5; x++) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
    }
    const d: bigint[] = []
    for (let x = 0; x < 5; x++) {
      d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1)
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + y * 5] ^= d[x]
      }
    }

    // Rho and Pi
    let t = state[1]
    for (let i = 0; i < 24; i++) {
      const j = KECCAK_PILN[i]
      const temp = state[j]
      state[j] = rotl64(t, KECCAK_ROTC[i])
      t = temp
    }

    // Chi
    for (let y = 0; y < 5; y++) {
      const t0 = state[y * 5]
      const t1 = state[y * 5 + 1]
      const t2 = state[y * 5 + 2]
      const t3 = state[y * 5 + 3]
      const t4 = state[y * 5 + 4]
      state[y * 5] = t0 ^ (~t1 & t2)
      state[y * 5 + 1] = t1 ^ (~t2 & t3)
      state[y * 5 + 2] = t2 ^ (~t3 & t4)
      state[y * 5 + 3] = t3 ^ (~t4 & t0)
      state[y * 5 + 4] = t4 ^ (~t0 & t1)
    }

    // Iota
    state[0] ^= KECCAK_RC[round]
  }
}

export function keccak256(input: string | Uint8Array): `0x${string}` {
  // Convert input to Uint8Array
  let data: Uint8Array
  if (typeof input === "string") {
    if (input.startsWith("0x")) {
      const hex = input.slice(2)
      data = new Uint8Array(hex.length / 2)
      for (let i = 0; i < hex.length; i += 2) {
        data[i / 2] = Number.parseInt(hex.substr(i, 2), 16)
      }
    } else {
      data = new TextEncoder().encode(input)
    }
  } else {
    data = input
  }

  // Keccak-256 parameters
  const rate = 136 // 1088 bits = 136 bytes
  const outputLen = 32 // 256 bits = 32 bytes

  // Initialize state
  const state = new Array(25).fill(0n)

  // Absorb
  const padded = new Uint8Array(Math.ceil((data.length + 1) / rate) * rate)
  padded.set(data)
  padded[data.length] = 0x01
  padded[padded.length - 1] |= 0x80

  for (let i = 0; i < padded.length; i += rate) {
    for (let j = 0; j < rate && i + j < padded.length; j += 8) {
      if (j / 8 < 25) {
        let lane = 0n
        for (let k = 0; k < 8 && i + j + k < padded.length; k++) {
          lane |= BigInt(padded[i + j + k]) << BigInt(k * 8)
        }
        state[j / 8] ^= lane
      }
    }
    keccakF(state)
  }

  // Squeeze
  const output = new Uint8Array(outputLen)
  for (let i = 0; i < outputLen; i += 8) {
    const lane = state[i / 8]
    for (let j = 0; j < 8 && i + j < outputLen; j++) {
      output[i + j] = Number((lane >> BigInt(j * 8)) & 0xffn)
    }
  }

  // Convert to hex
  return `0x${Array.from(output)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`
}

export function toHex(value: string | number | bigint | Uint8Array): `0x${string}` {
  if (typeof value === "string") {
    if (value.startsWith("0x")) return value as `0x${string}`
    return `0x${Array.from(new TextEncoder().encode(value))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return `0x${BigInt(value).toString(16)}`
  }
  if (value instanceof Uint8Array) {
    return `0x${Array.from(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`
  }
  return "0x0"
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.substr(i, 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`
}

export function encodePacked(types: string[], values: (string | number | bigint)[]): `0x${string}` {
  let result = "0x"
  for (let i = 0; i < types.length; i++) {
    const type = types[i]
    const value = values[i]

    if (type === "address") {
      const addr = String(value).toLowerCase().replace("0x", "")
      result += addr.padStart(40, "0")
    } else if (type.startsWith("uint")) {
      const bits = Number.parseInt(type.replace("uint", "")) || 256
      const hex = BigInt(value).toString(16)
      result += hex.padStart(bits / 4, "0")
    } else if (type.startsWith("int")) {
      const bits = Number.parseInt(type.replace("int", "")) || 256
      let val = BigInt(value)
      if (val < 0n) {
        val = (1n << BigInt(bits)) + val
      }
      result += val.toString(16).padStart(bits / 4, "0")
    } else if (type === "bytes32") {
      const hex = String(value).replace("0x", "")
      result += hex.padStart(64, "0")
    } else if (type === "string") {
      result += Array.from(new TextEncoder().encode(String(value)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    } else if (type === "bytes") {
      result += String(value).replace("0x", "")
    } else if (type === "bool") {
      result += value ? "01" : "00"
    }
  }
  return result as `0x${string}`
}

export function isAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function getAddress(address: string): `0x${string}` {
  if (!isAddress(address)) {
    throw new Error("Invalid address")
  }
  // Simple checksum implementation
  const addr = address.toLowerCase().replace("0x", "")
  const hash = keccak256(addr).slice(2)
  let checksummed = "0x"
  for (let i = 0; i < 40; i++) {
    if (Number.parseInt(hash[i], 16) >= 8) {
      checksummed += addr[i].toUpperCase()
    } else {
      checksummed += addr[i]
    }
  }
  return checksummed as `0x${string}`
}

// Random bytes generation
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return bytes
}

export function randomHex(length: number): `0x${string}` {
  return bytesToHex(randomBytes(length))
}
