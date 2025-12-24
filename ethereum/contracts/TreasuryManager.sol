// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TreasuryManager - 项目方资金管理
 * @notice 管理协议收入、储备金和生息策略
 */
contract TreasuryManager is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============ 状态变量 ============
    
    IERC20 public immutable usdt;
    address public owner;
    address public pendingOwner;
    
    // 多签配置
    address[] public multiSigSigners;
    mapping(address => bool) public isMultiSigSigner;
    uint256 public requiredSignatures;
    
    // 储备金管理
    uint256 public totalReserve; // 用户抵押的USDT总额
    uint256 public protocolRevenue; // 协议收入(手续费)
    uint256 public yieldEarned; // 生息收益
    
    // 生息策略
    address public yieldStrategy; // 生息策略合约
    uint256 public yieldAllocation; // 可用于生息的比例 (基点, 最大5000 = 50%)
    uint256 public constant MAX_YIELD_ALLOCATION = 5000; // 50%最大
    uint256 public constant MIN_RESERVE_RATIO = 5000; // 50%最小储备
    
    // 时间锁
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    mapping(bytes32 => uint256) public timelockExpiry;
    mapping(bytes32 => bool) public timelockExecuted;
    
    // 多签操作
    mapping(bytes32 => mapping(address => bool)) public multiSigApprovals;
    mapping(bytes32 => uint256) public multiSigApprovalCount;
    
    // 授权的FPP合约
    address public fppContract;
    
    // ============ 事件 ============
    
    event ReserveDeposited(address indexed from, uint256 amount);
    event ReserveWithdrawn(address indexed to, uint256 amount);
    event RevenueCollected(uint256 amount);
    event RevenueWithdrawn(address indexed to, uint256 amount);
    event YieldDeposited(uint256 amount);
    event YieldWithdrawn(uint256 amount);
    event YieldStrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event YieldAllocationUpdated(uint256 oldAllocation, uint256 newAllocation);
    event TimelockInitiated(bytes32 indexed actionHash, uint256 expiry);
    event OwnershipTransferInitiated(address indexed newOwner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    
    // ============ 错误 ============
    
    error OnlyOwner();
    error OnlyFPPContract();
    error OnlyMultiSig();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientReserve();
    error InsufficientRevenue();
    error InvalidAllocation();
    error TimelockNotExpired();
    error TimelockAlreadyExecuted();
    error InsufficientSignatures();
    error AlreadySigned();
    error TransferFailed();
    
    // ============ 修饰器 ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyFPP() {
        if (msg.sender != fppContract) revert OnlyFPPContract();
        _;
    }
    
    modifier requireMultiSig(bytes32 actionHash) {
        if (multiSigApprovalCount[actionHash] < requiredSignatures) {
            revert InsufficientSignatures();
        }
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _usdt,
        address _owner,
        address[] memory _signers,
        uint256 _requiredSigs
    ) {
        if (_usdt == address(0) || _owner == address(0)) revert ZeroAddress();
        if (_signers.length < 2) revert InsufficientSignatures();
        if (_requiredSigs < 2 || _requiredSigs > _signers.length) revert InsufficientSignatures();
        
        usdt = IERC20(_usdt);
        owner = _owner;
        requiredSignatures = _requiredSigs;
        
        for (uint256 i = 0; i < _signers.length; i++) {
            if (_signers[i] == address(0)) revert ZeroAddress();
            multiSigSigners.push(_signers[i]);
            isMultiSigSigner[_signers[i]] = true;
        }
    }
    
    // ============ FPP合约调用函数 ============
    
    /**
     * @notice FPP合约存入用户抵押金
     */
    function depositReserve(uint256 amount) external onlyFPP nonReentrant {
        if (amount == 0) revert ZeroAmount();
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        totalReserve += amount;
        emit ReserveDeposited(msg.sender, amount);
    }
    
    /**
     * @notice FPP合约提取用户赎回金
     */
    function withdrawReserve(address to, uint256 amount) external onlyFPP nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        
        // 检查可用储备(减去生息部分)
        uint256 availableReserve = getAvailableReserve();
        if (amount > availableReserve) revert InsufficientReserve();
        
        totalReserve -= amount;
        usdt.safeTransfer(to, amount);
        emit ReserveWithdrawn(to, amount);
    }
    
    /**
     * @notice FPP合约存入手续费收入
     */
    function collectRevenue(uint256 amount) external onlyFPP nonReentrant {
        if (amount == 0) revert ZeroAmount();
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        protocolRevenue += amount;
        emit RevenueCollected(amount);
    }
    
    // ============ 项目方管理函数 ============
    
    /**
     * @notice 提取协议收入(手续费) - 需要多签
     */
    function withdrawRevenue(
        address to,
        uint256 amount,
        bytes32 actionHash
    ) external requireMultiSig(actionHash) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > protocolRevenue) revert InsufficientRevenue();
        
        // 验证actionHash
        bytes32 expectedHash = keccak256(abi.encodePacked("withdrawRevenue", to, amount));
        if (actionHash != expectedHash) revert InsufficientSignatures();
        
        protocolRevenue -= amount;
        usdt.safeTransfer(to, amount);
        emit RevenueWithdrawn(to, amount);
        
        // 清理多签状态
        _clearMultiSig(actionHash);
    }
    
    /**
     * @notice 将储备金投入生息策略 - 需要多签和时间锁
     */
    function deployToYield(
        uint256 amount,
        bytes32 actionHash
    ) external requireMultiSig(actionHash) nonReentrant {
        if (yieldStrategy == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // 检查时间锁
        if (timelockExpiry[actionHash] == 0) {
            // 首次调用，设置时间锁
            timelockExpiry[actionHash] = block.timestamp + TIMELOCK_DURATION;
            emit TimelockInitiated(actionHash, timelockExpiry[actionHash]);
            return;
        }
        
        if (block.timestamp < timelockExpiry[actionHash]) revert TimelockNotExpired();
        if (timelockExecuted[actionHash]) revert TimelockAlreadyExecuted();
        
        // 检查不超过最大分配比例
        uint256 maxYield = (totalReserve * yieldAllocation) / 10000;
        uint256 currentYield = getYieldDeployed();
        if (currentYield + amount > maxYield) revert InvalidAllocation();
        
        timelockExecuted[actionHash] = true;
        
        // 批准生息策略使用USDT
        usdt.safeApprove(yieldStrategy, amount);
        
        // 调用生息策略存入
        (bool success,) = yieldStrategy.call(
            abi.encodeWithSignature("deposit(uint256)", amount)
        );
        if (!success) revert TransferFailed();
        
        emit YieldDeposited(amount);
        _clearMultiSig(actionHash);
    }
    
    /**
     * @notice 从生息策略提取资金
     */
    function withdrawFromYield(
        uint256 amount,
        bytes32 actionHash
    ) external requireMultiSig(actionHash) nonReentrant {
        if (yieldStrategy == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // 调用生息策略提取
        (bool success,) = yieldStrategy.call(
            abi.encodeWithSignature("withdraw(uint256)", amount)
        );
        if (!success) revert TransferFailed();
        
        emit YieldWithdrawn(amount);
        _clearMultiSig(actionHash);
    }
    
    /**
     * @notice 收割生息收益
     */
    function harvestYield(bytes32 actionHash) external requireMultiSig(actionHash) nonReentrant {
        if (yieldStrategy == address(0)) revert ZeroAddress();
        
        uint256 balanceBefore = usdt.balanceOf(address(this));
        
        // 调用生息策略收割
        (bool success,) = yieldStrategy.call(
            abi.encodeWithSignature("harvest()")
        );
        if (!success) revert TransferFailed();
        
        uint256 balanceAfter = usdt.balanceOf(address(this));
        uint256 harvested = balanceAfter - balanceBefore;
        
        yieldEarned += harvested;
        protocolRevenue += harvested; // 收益归入协议收入
        
        _clearMultiSig(actionHash);
    }
    
    // ============ 配置函数 ============
    
    function setFPPContract(address _fpp) external onlyOwner {
        if (_fpp == address(0)) revert ZeroAddress();
        fppContract = _fpp;
    }
    
    function setYieldStrategy(
        address _strategy,
        bytes32 actionHash
    ) external requireMultiSig(actionHash) {
        // 需要时间锁
        if (timelockExpiry[actionHash] == 0) {
            timelockExpiry[actionHash] = block.timestamp + TIMELOCK_DURATION;
            emit TimelockInitiated(actionHash, timelockExpiry[actionHash]);
            return;
        }
        
        if (block.timestamp < timelockExpiry[actionHash]) revert TimelockNotExpired();
        if (timelockExecuted[actionHash]) revert TimelockAlreadyExecuted();
        
        timelockExecuted[actionHash] = true;
        address oldStrategy = yieldStrategy;
        yieldStrategy = _strategy;
        
        emit YieldStrategyUpdated(oldStrategy, _strategy);
        _clearMultiSig(actionHash);
    }
    
    function setYieldAllocation(
        uint256 _allocation,
        bytes32 actionHash
    ) external requireMultiSig(actionHash) {
        if (_allocation > MAX_YIELD_ALLOCATION) revert InvalidAllocation();
        
        uint256 oldAllocation = yieldAllocation;
        yieldAllocation = _allocation;
        
        emit YieldAllocationUpdated(oldAllocation, _allocation);
        _clearMultiSig(actionHash);
    }
    
    // ============ 多签函数 ============
    
    function approveAction(bytes32 actionHash) external {
        if (!isMultiSigSigner[msg.sender]) revert OnlyMultiSig();
        if (multiSigApprovals[actionHash][msg.sender]) revert AlreadySigned();
        
        multiSigApprovals[actionHash][msg.sender] = true;
        multiSigApprovalCount[actionHash]++;
    }
    
    function _clearMultiSig(bytes32 actionHash) internal {
        for (uint256 i = 0; i < multiSigSigners.length; i++) {
            multiSigApprovals[actionHash][multiSigSigners[i]] = false;
        }
        multiSigApprovalCount[actionHash] = 0;
    }
    
    // ============ 所有权转移 ============
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(newOwner);
    }
    
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert OnlyOwner();
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }
    
    // ============ 视图函数 ============
    
    function getAvailableReserve() public view returns (uint256) {
        uint256 yieldDeployed = getYieldDeployed();
        if (yieldDeployed >= totalReserve) return 0;
        return totalReserve - yieldDeployed;
    }
    
    function getYieldDeployed() public view returns (uint256) {
        if (yieldStrategy == address(0)) return 0;
        
        (bool success, bytes memory data) = yieldStrategy.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        
        if (!success || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }
    
    function getReserveRatio() external view returns (uint256) {
        if (totalReserve == 0) return 10000;
        return (getAvailableReserve() * 10000) / totalReserve;
    }
    
    function getTotalValue() external view returns (uint256) {
        return totalReserve + protocolRevenue + getYieldDeployed();
    }
    
    function getProtocolStats() external view returns (
        uint256 reserve,
        uint256 revenue,
        uint256 yield_,
        uint256 yieldDeployed,
        uint256 reserveRatio
    ) {
        return (
            totalReserve,
            protocolRevenue,
            yieldEarned,
            getYieldDeployed(),
            this.getReserveRatio()
        );
    }
    
    // ============ 紧急函数 ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice 紧急提取所有生息资金回储备
     */
    function emergencyWithdrawYield() external onlyOwner whenPaused {
        if (yieldStrategy == address(0)) return;
        
        (bool success,) = yieldStrategy.call(
            abi.encodeWithSignature("emergencyWithdraw()")
        );
        // 即使失败也不revert，可能已经没有资金了
        if (success) {
            emit YieldWithdrawn(getYieldDeployed());
        }
    }
}
