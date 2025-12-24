// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * FPP Protocol Deployment Script
 * 
 * 部署顺序:
 * 1. 部署 FPToken (owner = 项目方地址)
 * 2. 部署 TreasuryManager (owner = 项目方地址)
 * 3. 部署 FloatingPointProtocol (连接 USDT, Treasury, 多签)
 * 4. 设置 FPToken.setMinter(FPP地址)
 * 5. 设置 TreasuryManager.setFPPContract(FPP地址)
 * 
 * 项目方地址: 0x3d0ab53241a2913d7939ae02f7083169fe7b823b
 */

import "./FPToken.sol";
import "./TreasuryManager.sol";
import "./FloatingPointProtocol.sol";

contract DeployFPP {
    // 项目方地址
    address constant OWNER = 0x3d0ab53241a2913d7939ae02f7083169fe7b823b;
    
    // USDT地址
    address constant USDT_MAINNET = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant USDT_SEPOLIA = 0x0000000000000000000000000000000000000000; // 测试网USDT地址
    
    // 部署结果
    FPToken public fpToken;
    TreasuryManager public treasury;
    FloatingPointProtocol public fpp;
    
    event Deployed(
        address fpToken,
        address treasury,
        address fpp,
        address owner
    );
    
    /**
     * @notice 一键部署所有合约
     * @param usdt USDT合约地址
     * @param isMainnet 是否主网
     */
    function deploy(address usdt, bool isMainnet) external returns (
        address fpTokenAddr,
        address treasuryAddr,
        address fppAddr
    ) {
        require(msg.sender == OWNER, "Only owner can deploy");
        
        // 多签配置 - 暂时使用单签(项目方自己)
        address[] memory signers = new address[](3);
        signers[0] = OWNER;
        signers[1] = OWNER; // 可以后续添加其他签名者
        signers[2] = OWNER;
        uint256 requiredSigs = 1; // 单签模式
        
        // 1. 部署 FPToken
        fpToken = new FPToken(OWNER);
        
        // 2. 部署 TreasuryManager
        treasury = new TreasuryManager(
            usdt,
            OWNER,
            signers,
            2 // Treasury需要2签
        );
        
        // 3. 部署 FloatingPointProtocol
        fpp = new FloatingPointProtocol(
            usdt,
            address(treasury),
            signers,
            requiredSigs
        );
        
        // 4. 设置 FPToken minter
        fpToken.setMinter(address(fpp));
        
        // 5. 设置 Treasury 的 FPP合约
        treasury.setFPPContract(address(fpp));
        
        emit Deployed(
            address(fpToken),
            address(treasury),
            address(fpp),
            OWNER
        );
        
        return (address(fpToken), address(treasury), address(fpp));
    }
    
    /**
     * @notice 验证部署配置
     */
    function verifyDeployment() external view returns (
        bool fpTokenOk,
        bool treasuryOk,
        bool fppOk,
        string memory status
    ) {
        // 检查FPToken
        fpTokenOk = fpToken.owner() == OWNER && 
                    fpToken.minter() == address(fpp);
        
        // 检查Treasury
        treasuryOk = treasury.owner() == OWNER &&
                     treasury.fppContract() == address(fpp);
        
        // 检查FPP
        fppOk = fpp.owner() == OWNER &&
                fpp.treasury() == address(treasury);
        
        if (fpTokenOk && treasuryOk && fppOk) {
            status = "All contracts deployed and configured correctly";
        } else {
            status = "Some contracts need configuration";
        }
        
        return (fpTokenOk, treasuryOk, fppOk, status);
    }
    
    /**
     * @notice 获取部署地址摘要
     */
    function getDeploymentSummary() external view returns (
        string memory summary
    ) {
        return string(abi.encodePacked(
            "FPP Protocol Deployment Summary\n",
            "================================\n",
            "Owner: ", toHexString(OWNER), "\n",
            "FPToken: ", toHexString(address(fpToken)), "\n",
            "Treasury: ", toHexString(address(treasury)), "\n",
            "FPP Main: ", toHexString(address(fpp)), "\n",
            "================================\n",
            "IMPORTANT: Save these addresses!"
        ));
    }
    
    function toHexString(address addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(uint160(addr) >> (8 * (19 - i)) >> 4)];
            str[3 + i * 2] = alphabet[uint8(uint160(addr) >> (8 * (19 - i))) & 0xf];
        }
        return string(str);
    }
}

/**
 * 部署后需要做的事情:
 * 
 * 1. 保存所有合约地址
 * 2. 更新 lib/fpp-contract-client.ts 中的 CONTRACT_ADDRESSES
 * 3. 更新 lib/fpp-types.ts 中的地址
 * 4. 验证合约在 Etherscan
 * 5. 测试基本功能:
 *    - Approve USDT
 *    - Deposit
 *    - Privacy Payment
 *    - Withdrawal
 *    - Owner fee withdrawal
 * 
 * 项目方权限总结:
 * - FPToken: 可以ownerMint(从1000万预留), pause/unpause
 * - Treasury: 可以withdrawRevenue(手续费), 设置生息策略
 * - FPP: 可以withdrawFees, pause/unpause, 更新验证器
 */
