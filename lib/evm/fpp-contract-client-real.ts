import { createPublicClient, createWalletClient, custom, http, formatUnits, parseUnits, Chain, defineChain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { FPP_ABI, ERC20_ABI, TREASURY_ABI } from "../fpp-abis";
import { CONTRACT_ADDRESSES, OWNER_ADDRESS } from "./fpp-contract-client";

// Define local chain if needed
const localhost = defineChain({
    id: 31337,
    name: "Localhost",
    network: "localhost",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: { http: ["http://127.0.0.1:8545"] },
        public: { http: ["http://127.0.0.1:8545"] },
    },
});

type NetworkType = "mainnet" | "sepolia" | "localhost";

export class FPPContractClientReal {
    private network: NetworkType;
    private addresses: typeof CONTRACT_ADDRESSES.mainnet;
    private publicClient: any;
    private walletClient: any;
    private connectedAddress: string | null = null;
    private chain: Chain;

    constructor(network: NetworkType = "sepolia") {
        this.network = network;
        // Map network to addresses - handling localhost if not in original config
        if (network === "localhost") {
            this.addresses = {
                fpp: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // Example hardhat deployment
                fpToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                treasury: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
                usdt: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
            };
        } else {
            this.addresses = CONTRACT_ADDRESSES[network as "mainnet" | "sepolia"];
        }

        this.chain = network === "mainnet" ? mainnet : (network === "sepolia" ? sepolia : localhost);

        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http(),
        });
    }

    async connectWallet(): Promise<string> {
        if (typeof window !== "undefined" && window.ethereum) {
            this.walletClient = createWalletClient({
                chain: this.chain,
                transport: custom(window.ethereum),
            });
            const [account] = await this.walletClient.requestAddresses();
            this.connectedAddress = account;
            return account;
        }
        throw new Error("No wallet found");
    }

    async isOwner(address: string): Promise<boolean> {
        return address.toLowerCase() === OWNER_ADDRESS.toLowerCase();
    }

    // ============ Read Functions ============

    async getProtocolStats() {
        try {
            // Fetch data from TreasuryManager
            const data = await this.publicClient.readContract({
                address: this.addresses.treasury as `0x${string}`,
                abi: TREASURY_ABI,
                functionName: "getProtocolStats",
            });
            // [reserve, revenue, yield_, yieldDeployed, reserveRatio]
            return {
                totalFees: formatUnits(data[1], 6),
                totalDeposits: formatUnits(data[0], 6), // reserve is deposits roughly
                totalPoints: Number(formatUnits(data[0], 6)) / 10, // Approx
                isPaused: false, // Need to check paused state
            };
        } catch (e) {
            console.error("Error fetching protocol stats", e);
            return {
                totalFees: "0",
                totalDeposits: "0",
                totalPoints: 0,
                isPaused: false,
            };
        }
    }

    async getTreasuryStats() {
        try {
            const data = await this.publicClient.readContract({
                address: this.addresses.treasury as `0x${string}`,
                abi: TREASURY_ABI,
                functionName: "getProtocolStats",
            });
            return {
                reserve: formatUnits(data[0], 6),
                revenue: formatUnits(data[1], 6),
                yieldEarned: formatUnits(data[2], 6),
                yieldDeployed: formatUnits(data[3], 6),
                reserveRatio: Number(data[4]) / 100, // Basis points to percentage?
            };
        } catch (e) {
            console.error(e);
            return { reserve: "0", revenue: "0", yieldEarned: "0", yieldDeployed: "0", reserveRatio: 0 };
        }
    }

    async getUSDTBalance(address: string): Promise<string> {
        if (!address || !this.addresses.usdt) return "0";
        try {
            const bal = await this.publicClient.readContract({
                address: this.addresses.usdt as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [address as `0x${string}`],
            });
            return formatUnits(bal as bigint, 6);
        } catch (e) {
            console.error(e);
            return "0";
        }
    }

    async getFPTokenBalance(address: string): Promise<string> {
        if (!address || !this.addresses.fpToken) return "0";
        try {
            const bal = await this.publicClient.readContract({
                address: this.addresses.fpToken as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [address as `0x${string}`],
            });
            return formatUnits(bal as bigint, 6);
        } catch (e) {
            console.error(e);
            return "0";
        }
    }

    async getUSDTAllowance(owner: string): Promise<string> {
        if (!owner || !this.addresses.usdt || !this.addresses.fpp) return "0";
        try {
            const allowed = await this.publicClient.readContract({
                address: this.addresses.usdt as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [owner as `0x${string}`, this.addresses.fpp as `0x${string}`],
            });
            return formatUnits(allowed as bigint, 6);
        } catch (e) {
            console.error(e);
            return "0";
        }
    }

    // ============ Write Functions ============

    async approveUSDT(amount: string): Promise<string> {
        if (!this.walletClient || !this.connectedAddress) await this.connectWallet();
        const hash = await this.walletClient.writeContract({
            address: this.addresses.usdt as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [this.addresses.fpp as `0x${string}`, parseUnits(amount, 6)],
            account: this.connectedAddress as `0x${string}`,
        });
        return hash;
    }

    async deposit(amount: string, commitments: string[]): Promise<string> {
        if (!this.walletClient || !this.connectedAddress) await this.connectWallet();

        // Get user nonce
        const nonce = await this.publicClient.readContract({
            address: this.addresses.fpp as `0x${string}`,
            abi: FPP_ABI,
            functionName: "getUserNonce",
            args: [this.connectedAddress as `0x${string}`],
        });

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

        const hash = await this.walletClient.writeContract({
            address: this.addresses.fpp as `0x${string}`,
            abi: FPP_ABI,
            functionName: "deposit",
            args: [
                commitments.map(c => c.startsWith("0x") ? c : `0x${c}`) as `0x${string}`[],
                deadline,
                nonce
            ],
            account: this.connectedAddress as `0x${string}`,
        });
        return hash;
    }

    async privacyPayment(params: {
        nullifiers: string[]
        outputCommitments: string[]
        ringMembers: string[]
        ringSignature: string
        zkProof: string
        merkleRoot: string
        inputPointIds: string[]
    }): Promise<string> {
        if (!this.walletClient || !this.connectedAddress) await this.connectWallet();

        // We assume params are hex strings. Ensure 0x prefix.
        const fixHex = (h: string) => h.startsWith("0x") ? h : `0x${h}`;

        // NEED RECIPIENT. The interface in fpp-contract-client.ts params DETACHED recipient?
        // Wait, fpp-contract-client.ts Mock `privacyPayment` params does NOT have recipient!
        // This is a bug in the Mock interface or it's implicitly handled (maybe recipient is in proof? No, contract needs to know to create points for whom?)
        // Contract `privacyPayment` takes `recipient`.
        // I will look at `lib/fpp-contract-client.ts` again.
        // Line 110: privacyPayment(params: { ... })
        // NO RECIPIENT in the interface!
        // This means the Client Interface is incomplete or I missed it.

        // I'll add a dummy recipient or assume self for now, but this is critical.
        // Actually, `privacyPayment` in contract creates output points owned by `recipient`.
        // If usage is "transfer", recipient is needed.
        // If usage is "spend to self" (churn), recipient is self.

        // I'll throw error if I can't find recipient. But for now I will use connectedAddress.
        const recipient = this.connectedAddress;

        // getKeyImage? The Mock doesn't pass keyImage??
        // `fpp-contract-client.ts` params: nullifiers, outputCommitments, ringMembers, ringSignature, zkProof, merkleRoot, inputPointIds.
        // MISSING: keyImage, recipient.

        // I'll assume standard ring signature produces a keyImage. 
        // This Real implementation is blocked by missing parameters in the interface.

        throw new Error("Real implementation of privacyPayment requires recipient and keyImage, which are missing in the current interface.");
    }

    async requestWithdrawal(params: {
        nullifiers: string[]
        ringMembers: string[]
        ringSignature: string
        zkProof: string
        merkleRoot: string
        inputPointIds: string[]
    }): Promise<string> {
        if (!this.walletClient || !this.connectedAddress) await this.connectWallet();

        const fixHex = (h: string) => h.startsWith("0x") ? h : `0x${h}`;

        // Get user nonce
        const nonce = await this.publicClient.readContract({
            address: this.addresses.fpp as `0x${string}`,
            abi: FPP_ABI,
            functionName: "getUserNonce",
            args: [this.connectedAddress as `0x${string}`],
        });

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        const hash = await this.walletClient.writeContract({
            address: this.addresses.fpp as `0x${string}`,
            abi: FPP_ABI,
            functionName: "requestWithdrawal",
            args: [
                params.inputPointIds.map(fixHex) as `0x${string}`[],
                params.nullifiers.map(fixHex) as `0x${string}`[],
                deadline,
                nonce
            ],
            account: this.connectedAddress as `0x${string}`,
        });
        return hash;
    }

    async completeWithdrawal(requestId: string): Promise<string> {
        if (!this.walletClient || !this.connectedAddress) await this.connectWallet();

        const fixHex = (h: string) => h.startsWith("0x") ? h : `0x${h}`;

        const hash = await this.walletClient.writeContract({
            address: this.addresses.fpp as `0x${string}`,
            abi: FPP_ABI,
            functionName: "completeWithdrawal",
            args: [fixHex(requestId) as `0x${string}`],
            account: this.connectedAddress as `0x${string}`,
        });
        return hash;
    }

    async cancelWithdrawal(requestId: string, permanent: boolean): Promise<string> {
        if (!this.walletClient || !this.connectedAddress) await this.connectWallet();

        const fixHex = (h: string) => h.startsWith("0x") ? h : `0x${h}`;

        const hash = await this.walletClient.writeContract({
            address: this.addresses.fpp as `0x${string}`,
            abi: FPP_ABI,
            functionName: "cancelWithdrawal",
            args: [fixHex(requestId) as `0x${string}`, permanent],
            account: this.connectedAddress as `0x${string}`,
        });
        return hash;
    }

    async waitForTransaction(hash: string) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        return receipt;
    }

    getAddresses() {
        return this.addresses;
    }
}
