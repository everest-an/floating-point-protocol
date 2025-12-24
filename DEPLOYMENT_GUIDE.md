# FPP (Floating Point Protocol) 部署指南

## 项目状态

**当前状态**: 代码完整，准备部署

### 已完成
- [x] 智能合约开发 (FloatingPointProtocol.sol, FPToken.sol, TreasuryManager.sol)
- [x] 前端UI开发
- [x] 安全审计（10轮深度审计）
- [x] 合约客户端集成代码
- [x] Owner Dashboard (仅限 0x3d0ab53241a2913d7939ae02f7083169fe7b823b 访问)

### 待完成
- [ ] 部署智能合约到区块链
- [ ] 更新合约地址配置
- [ ] 第三方正式安全审计

---

## 部署步骤

### 1. 准备工作

\`\`\`bash
# 安装依赖
npm install hardhat @nomicfoundation/hardhat-toolbox

# 配置环境变量
export PRIVATE_KEY="你的部署钱包私钥"
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export ETHERSCAN_API_KEY="你的Etherscan API Key"
\`\`\`

### 2. 部署合约

**部署顺序很重要:**

\`\`\`bash
# 1. 首先部署 FPToken
npx hardhat run scripts/deploy-token.js --network sepolia

# 2. 然后部署 TreasuryManager
npx hardhat run scripts/deploy-treasury.js --network sepolia

# 3. 最后部署 FloatingPointProtocol
npx hardhat run scripts/deploy-fpp.js --network sepolia

# 4. 设置合约关联
npx hardhat run scripts/setup-contracts.js --network sepolia
\`\`\`

### 3. 部署后配置

部署完成后，更新以下文件中的合约地址:

**lib/fpp-contract-client.ts:**
\`\`\`typescript
export const CONTRACT_ADDRESSES = {
  sepolia: {
    fpp: "0x部署后的FPP地址",
    fpToken: "0x部署后的FPToken地址",
    treasury: "0x部署后的Treasury地址",
    usdt: "0x测试USDT地址",
  },
  mainnet: {
    // 主网部署后填入
  },
}
\`\`\`

### 4. 设置权限

```solidity
// 在 FPToken 中设置 minter
fpToken.setMinter(fppContractAddress);

// 在 TreasuryManager 中设置 fppContract
treasury.setFPPContract(fppContractAddress);

// 在 FloatingPointProtocol 中设置关联
fpp.setFPToken(fpTokenAddress);
fpp.setTreasury(treasuryAddress);
