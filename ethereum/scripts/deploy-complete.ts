import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Complete deployment script for FPP Protocol
 * Deploys all contracts including mocks for testnet
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("=".repeat(60));
    console.log("FPP Protocol Deployment");
    console.log("=".repeat(60));
    console.log("Network:", network.name, `(chainId: ${chainId})`);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("=".repeat(60));

    const isTestnet = chainId !== 1; // Not mainnet
    const OWNER_ADDRESS = process.env.OWNER_ADDRESS || deployer.address;

    // Multi-sig configuration
    // For production: use real multi-sig addresses
    // For testing: use deployer address multiple times
    const SIGNERS = process.env.MULTISIG_SIGNERS
        ? process.env.MULTISIG_SIGNERS.split(",")
        : [deployer.address, deployer.address];
    const REQUIRED_SIGS = parseInt(process.env.REQUIRED_SIGS || "2");

    let usdtAddress: string;
    let zkVerifierAddress: string;
    let ringVerifierAddress: string;

    // Step 1: Deploy or use existing USDT
    if (isTestnet && !process.env.USDT_ADDRESS) {
        console.log("\n[1/7] Deploying MockUSDT...");
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        const mockUsdt = await MockUSDT.deploy();
        await mockUsdt.waitForDeployment();
        usdtAddress = await mockUsdt.getAddress();
        console.log("✓ MockUSDT deployed to:", usdtAddress);
    } else {
        usdtAddress = process.env.USDT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Mainnet USDT
        console.log("\n[1/7] Using existing USDT:", usdtAddress);
    }

    // Step 2: Deploy Mock Verifiers (for testnet) or skip (for mainnet)
    if (isTestnet) {
        console.log("\n[2/7] Deploying MockZKVerifier...");
        const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
        const zkVerifier = await MockZKVerifier.deploy();
        await zkVerifier.waitForDeployment();
        zkVerifierAddress = await zkVerifier.getAddress();
        console.log("✓ MockZKVerifier deployed to:", zkVerifierAddress);

        console.log("\n[3/7] Deploying MockRingSignatureVerifier...");
        const MockRingVerifier = await ethers.getContractFactory("MockRingSignatureVerifier");
        const ringVerifier = await MockRingVerifier.deploy();
        await ringVerifier.waitForDeployment();
        ringVerifierAddress = await ringVerifier.getAddress();
        console.log("✓ MockRingSignatureVerifier deployed to:", ringVerifierAddress);
    } else {
        // For mainnet, verifiers must be pre-deployed
        zkVerifierAddress = process.env.ZK_VERIFIER_ADDRESS || "";
        ringVerifierAddress = process.env.RING_VERIFIER_ADDRESS || "";
        if (!zkVerifierAddress || !ringVerifierAddress) {
            throw new Error("Mainnet deployment requires ZK_VERIFIER_ADDRESS and RING_VERIFIER_ADDRESS");
        }
        console.log("\n[2/7] Using existing ZKVerifier:", zkVerifierAddress);
        console.log("[3/7] Using existing RingVerifier:", ringVerifierAddress);
    }

    // Step 4: Deploy FPToken
    console.log("\n[4/7] Deploying FPToken...");
    const FPToken = await ethers.getContractFactory("FPToken");
    const fpToken = await FPToken.deploy(OWNER_ADDRESS);
    await fpToken.waitForDeployment();
    const fpTokenAddress = await fpToken.getAddress();
    console.log("✓ FPToken deployed to:", fpTokenAddress);

    // Step 5: Deploy TreasuryManager
    console.log("\n[5/7] Deploying TreasuryManager...");
    const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
    const treasury = await TreasuryManager.deploy(
        usdtAddress,
        OWNER_ADDRESS,
        SIGNERS,
        REQUIRED_SIGS
    );
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("✓ TreasuryManager deployed to:", treasuryAddress);

    // Step 6: Deploy FloatingPointProtocol
    console.log("\n[6/7] Deploying FloatingPointProtocol...");
    const FloatingPointProtocol = await ethers.getContractFactory("FloatingPointProtocol");
    const fpp = await FloatingPointProtocol.deploy(
        usdtAddress,
        treasuryAddress,
        SIGNERS,
        REQUIRED_SIGS
    );
    await fpp.waitForDeployment();
    const fppAddress = await fpp.getAddress();
    console.log("✓ FloatingPointProtocol deployed to:", fppAddress);

    // Step 7: Setup Permissions
    console.log("\n[7/7] Setting up permissions...");

    if (deployer.address.toLowerCase() === OWNER_ADDRESS.toLowerCase()) {
        // Set FPToken minter
        console.log("  → Setting FPToken minter...");
        const tx1 = await fpToken.setMinter(fppAddress);
        await tx1.wait();
        console.log("  ✓ FPToken minter set to FPP");

        // Set Treasury FPP contract
        console.log("  → Setting Treasury FPP contract...");
        const tx2 = await treasury.setFPPContract(fppAddress);
        await tx2.wait();
        console.log("  ✓ Treasury FPP contract set");

        // Set Verifiers (requires multi-sig in production)
        if (isTestnet) {
            console.log("  → Setting verifiers (testnet mode)...");
            // For testnet, we need to go through multi-sig process
            // Since deployer is both signers in test mode, we can approve quickly
            const actionHash = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["string", "address", "address"],
                    ["setVerifiers", zkVerifierAddress, ringVerifierAddress]
                )
            );

            // Propose and approve (in production this would be separate transactions by different signers)
            const tx3 = await fpp.proposeMultiSigAction(actionHash, "setVerifiers");
            await tx3.wait();
            console.log("  ✓ Multi-sig action proposed");

            // Note: In test mode with same signer, we need to modify contract or use different approach
            // For now, verifiers will need to be set manually or contract modified for testing
            console.log("  ⚠ Verifiers need to be set via multi-sig process");
        }
    } else {
        console.log("  ⚠ Deployer is not owner. Manual permission setup required:");
        console.log(`  1. Call fpToken.setMinter(${fppAddress})`);
        console.log(`  2. Call treasury.setFPPContract(${fppAddress})`);
        console.log(`  3. Call fpp.setVerifiers(${zkVerifierAddress}, ${ringVerifierAddress}, actionHash)`);
    }

    // Output deployment summary
    const deploymentInfo = {
        network: network.name,
        chainId: chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            usdt: usdtAddress,
            fpToken: fpTokenAddress,
            treasury: treasuryAddress,
            fpp: fppAddress,
            zkVerifier: zkVerifierAddress,
            ringVerifier: ringVerifierAddress,
        },
        config: {
            owner: OWNER_ADDRESS,
            signers: SIGNERS,
            requiredSignatures: REQUIRED_SIGS,
        }
    };

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log("-".repeat(40));
    console.log("USDT:".padEnd(25), usdtAddress);
    console.log("FPToken:".padEnd(25), fpTokenAddress);
    console.log("TreasuryManager:".padEnd(25), treasuryAddress);
    console.log("FloatingPointProtocol:".padEnd(25), fppAddress);
    console.log("ZKVerifier:".padEnd(25), zkVerifierAddress);
    console.log("RingVerifier:".padEnd(25), ringVerifierAddress);
    console.log("-".repeat(40));

    // Save deployment info to file
    const deploymentPath = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true });
    }
    const filename = `deployment-${chainId}-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(deploymentPath, filename),
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\n✓ Deployment info saved to: deployments/${filename}`);

    // Generate frontend config update suggestion
    console.log("\n" + "=".repeat(60));
    console.log("FRONTEND CONFIG UPDATE");
    console.log("=".repeat(60));
    console.log("\nUpdate lib/fpp-contract-client.ts CONTRACT_ADDRESSES:");
    console.log(`
  ${chainId === 1 ? 'mainnet' : 'sepolia'}: {
    fpp: "${fppAddress}",
    fpToken: "${fpTokenAddress}",
    treasury: "${treasuryAddress}",
    usdt: "${usdtAddress}",
  },
`);

    return deploymentInfo;
}

main().catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exitCode = 1;
});
