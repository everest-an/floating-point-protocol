import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Configuration
    // Use a dummy USDT address for Sepolia or local testing if not provided
    // For Sepolia, we might want a real faucet token, but for now using a placeholder or deploying a mock
    // If this is mainnet, use the real USDT address
    const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06"; // Example USDT on Sepolia
    const OWNER_ADDRESS = process.env.OWNER_ADDRESS || deployer.address;

    // Multi-sig configuration (using deployer as signer for simplicity in this script, but should be real signers)
    const SIGNERS = [deployer.address, deployer.address]; // Needs at least 2 signers based on contract logic if requiredSigs > 1
    const REQUIRED_SIGS = 2;

    console.log("USDT Address:", USDT_ADDRESS);
    console.log("Owner Address:", OWNER_ADDRESS);

    // 1. Deploy FPToken
    console.log("Deploying FPToken...");
    const FPToken = await ethers.getContractFactory("FPToken");
    const fpToken = await FPToken.deploy(OWNER_ADDRESS);
    await fpToken.waitForDeployment();
    const fpTokenAddress = await fpToken.getAddress();
    console.log("FPToken deployed to:", fpTokenAddress);

    // 2. Deploy TreasuryManager
    console.log("Deploying TreasuryManager...");
    const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
    const treasury = await TreasuryManager.deploy(
        USDT_ADDRESS,
        OWNER_ADDRESS,
        SIGNERS,
        REQUIRED_SIGS
    );
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("TreasuryManager deployed to:", treasuryAddress);

    // 3. Deploy FloatingPointProtocol
    console.log("Deploying FloatingPointProtocol...");
    const FloatingPointProtocol = await ethers.getContractFactory("FloatingPointProtocol");
    const fpp = await FloatingPointProtocol.deploy(
        USDT_ADDRESS,
        treasuryAddress,
        SIGNERS,
        REQUIRED_SIGS
    );
    await fpp.waitForDeployment();
    const fppAddress = await fpp.getAddress();
    console.log("FloatingPointProtocol deployed to:", fppAddress);

    // 4. Setup Permissions
    console.log("Setting up permissions...");

    // Set FPToken minter to FPP
    // Note: If deployer is not owner, this will fail. Assuming deployer is owner for initial setup.
    if (deployer.address === OWNER_ADDRESS) {
        console.log("Setting FPToken minter...");
        const tx1 = await fpToken.setMinter(fppAddress);
        await tx1.wait();
        console.log("FPToken minter set.");

        // Set Treasury FPP contract
        console.log("Setting Treasury FPP contract...");
        const tx2 = await treasury.setFPPContract(fppAddress);
        await tx2.wait();
        console.log("Treasury FPP contract set.");
    } else {
        console.log("Deployer is not owner. Please manually set permissions:");
        console.log(`1. Call fpToken.setMinter(${fppAddress})`);
        console.log(`2. Call treasury.setFPPContract(${fppAddress})`);
    }

    console.log("Deployment complete!");
    console.log("----------------------------------------------------");
    console.log("FPToken:", fpTokenAddress);
    console.log("TreasuryManager:", treasuryAddress);
    console.log("FloatingPointProtocol:", fppAddress);
    console.log("----------------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
