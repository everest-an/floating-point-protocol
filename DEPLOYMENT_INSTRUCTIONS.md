# FPP 部署指南

## 安全警告

**永远不要在任何聊天、网站或公共渠道分享您的私钥！**

---

## 部署步骤

### 1. 准备环境

\`\`\`bash
# 进入 hardhat 目录
cd hardhat

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
\`\`\`

### 2. 配置私钥

编辑 `.env` 文件，填入您的私钥：

\`\`\`
PRIVATE_KEY=您的私钥（不带0x前缀）
\`\`\`

### 3. 获取测试 ETH

Sepolia 测试网水龙头：
- https://sepoliafaucet.com/
- https://sepolia-faucet.pk910.de/

### 4. 部署合约

\`\`\`bash
# 部署到 Sepolia 测试网
npm run deploy:sepolia

# 或部署到主网（需要真实ETH）
npm run deploy:mainnet
\`\`\`

### 5. 更新前端

部署成功后，将输出的合约地址复制到：
`lib/fpp-contract-client.ts`

### 6. 验证合约（可选）

\`\`\`bash
npx hardhat verify --network sepolia <合约地址> <构造函数参数>
\`\`\`

---

## 合约功能

| 合约 | 功能 |
|------|------|
| FloatingPointProtocol | 主协议合约，处理存款、支付、提款 |
| FPToken | ERC20代币，用于表示用户余额 |
| TreasuryManager | 资金管理，处理手续费和生息策略 |

---

## Owner 权限

您的地址 `0x3d0ab53241a2913d7939ae02f7083169fe7b823b` 拥有：

- 提取协议手续费
- 铸造 FP 代币（从预留额度）
- 暂停/恢复合约
- 更新 Treasury（需要时间锁）
- 管理生息策略

---

## 手续费

| 类型 | 费率 |
|------|------|
| 存款 | 0.1% |
| 提款 | 0.1% |
| 隐私支付 | 0% |

手续费自动存入合约，您可以通过 Owner Dashboard 提取。

---

## 安全建议

1. 使用硬件钱包存储 Owner 私钥
2. 备份所有合约地址
3. 先在 Sepolia 测试网完整测试
4. 主网部署前进行第三方审计
5. 考虑使用多签钱包作为 Owner
