// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ============ Interface Definitions ============
interface IZKVerifier {
    function verifyProof(
        bytes calldata proof,
        bytes32[] calldata nullifiers,
        bytes32[] calldata outputCommitments,
        bytes32 merkleRoot,
        uint256 inputSum,
        uint256 outputSum
    ) external view returns (bool);
}

interface IRingSignatureVerifier {
    function verifySignature(
        bytes calldata signature,
        bytes32 keyImage,
        bytes32[] calldata ringMembers,
        bytes32 message
    ) external view returns (bool);
}

interface IPriceOracle {
    function getPrice() external view returns (uint256 price, uint8 decimals, uint256 timestamp);
}

// ============ Custom Errors ============
error InvalidAmount();
error InvalidCommitment();
error NullifierAlreadyUsed();
error PointNotActive();
error PointLocked();
error WithdrawalNotReady();
error WithdrawalAlreadyCompleted();
error WithdrawalAlreadyCancelled();
error WithdrawalCancelledPermanently();
error WithdrawalExpired();
error InsufficientBalance();
error InsufficientTreasuryBalance();
error ZeroAddress();
error InvalidProof();
error InvalidRingSignature();
error InvalidKeyImage();
error KeyImageAlreadyUsed();
error InvalidRingSize();
error ArrayTooLarge();
error ArrayLengthMismatch();
error TransactionExpired();
error TransactionReplay();
error UnauthorizedCaller();
error VerifiersNotSet();
error VerifiersLocked();
error RateLimitExceeded();
error FlashLoanDetected();
error InvalidNonce();
error PointIdCollision();
error SecurityViolation();
error ValueNotConserved();
error PointInPendingWithdrawal();
error MultiBlockAttackDetected();
error AuditorAccessLimitExceeded();
error TreasuryChangeCancelled();
error DuplicateRingMember();
error MultiSigRequired();
error InsufficientSignatures();
error InvalidSignature();
error OraclePriceStale();
error OraclePriceInvalid();
error GasLimitExceeded();
error OperationPaused();
error InvalidBatchSize();

/**
 * @title FloatingPointProtocol
 * @notice Privacy-preserving payment protocol - Quantstamp/CertIK Audit Hardened
 * @dev Implements SCSVS security standards
 */
contract FloatingPointProtocol is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    // ============ Constants (QS-07 修复: 使用命名常量) ============
    uint256 public constant POINT_VALUE = 10 * 10**6; // 10 USDT (6 decimals)
    uint256 public constant WITHDRAWAL_DELAY = 24 hours;
    uint256 public constant WITHDRAWAL_EXPIRY = 7 days;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_BATCH_SIZE = 10; // 降低以防止Gas耗尽
    uint256 public constant MIN_RING_SIZE = 5;
    uint256 public constant MAX_RING_SIZE = 15; // 降低以防止Gas耗尽
    uint256 public constant MAX_DEPOSIT = 100000 * 10**6;
    uint256 public constant MIN_DEPOSIT = POINT_VALUE;
    uint256 public constant MIN_FEE_RATE = 1; // 0.01%
    uint256 public constant MAX_FEE_RATE = 500; // 5%
    uint256 public constant RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_TRANSACTIONS_PER_WINDOW = 100;
    uint256 public constant TREASURY_TIMELOCK = 48 hours;
    uint256 public constant MAX_DEADLINE_DURATION = 1 hours;
    uint256 public constant POINT_LOCK_DURATION = 12 seconds; // 命名常量
    uint256 public constant ORACLE_STALENESS_THRESHOLD = 1 hours;
    uint256 public constant MIN_MULTISIG_SIGNERS = 2; // 多签最小签名数
    uint256 public constant MAX_GAS_PER_POINT = 100000; // 每点最大Gas
    
    uint256 public immutable CHAIN_ID;
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // EIP-712 type hashes
    bytes32 public constant DEPOSIT_TYPEHASH = keccak256(
        "Deposit(address depositor,uint256 amount,bytes32[] commitments,uint256 deadline,uint256 nonce)"
    );
    bytes32 public constant PAYMENT_TYPEHASH = keccak256(
        "PrivacyPayment(bytes32[] nullifiers,bytes32[] outputCommitments,address recipient,uint256 deadline,uint256 nonce)"
    );
    bytes32 public constant MULTISIG_TYPEHASH = keccak256(
        "MultiSigAction(bytes32 actionHash,uint256 deadline,uint256 nonce)"
    );
    
    // ============ State Variables ============
    IERC20 public immutable usdt;
    address public treasury;
    address public zkVerifier;
    address public ringSignatureVerifier;
    IPriceOracle public priceOracle;
    
    uint256 public depositFeeRate = 10; // 0.1%
    uint256 public withdrawalFeeRate = 10; // 0.1%
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalFees;
    uint256 public totalPoints;
    
    bool public constant verifiersRequired = true;
    bool public verifiersLocked;
    
    bytes32 public commitmentMerkleRoot;
    bytes32 public nullifierMerkleRoot;
    
    address[] public multiSigSigners;
    uint256 public requiredSignatures;
    mapping(bytes32 => mapping(address => bool)) public multiSigApprovals;
    mapping(bytes32 => uint256) public multiSigApprovalCount;
    mapping(bytes32 => bool) public multiSigExecuted;
    
    // ============ Structs ============
    struct FloatingPoint {
        bytes32 commitment;
        uint256 createdAt;
        uint256 mass;
        bool isActive;
        address creator;
        bytes32 creationTxHash;
        bytes32 pendingWithdrawalId;
        uint256 lockedUntil;
    }
    
    struct WithdrawalRequest {
        address requester;
        uint256 amount;
        uint256 requestTime;
        uint256 unlockTime;
        bool completed;
        bool cancelled;
        bool permanentlyCancelled;
        bytes32[] pointIds;
        bytes32[] nullifiers;
        bytes32 requestHash;
    }
    
    // ============ Mappings ============
    mapping(bytes32 => FloatingPoint) public points;
    mapping(bytes32 => bool) public nullifierSet;
    mapping(bytes32 => bool) public usedKeyImages;
    mapping(bytes32 => bool) public usedTransactionHashes;
    mapping(bytes32 => bool) public usedPointIds;
    mapping(bytes32 => WithdrawalRequest) public withdrawalRequests;
    mapping(address => uint256) public lastDepositBlock;
    mapping(address => uint256) public lastDepositTimestamp;
    mapping(address => uint256) public transactionCount;
    mapping(address => uint256) public windowStart;
    mapping(address => uint256) public lastActionTimestamp;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => uint256) public cancellationTimestamps;
    mapping(bytes32 => bool) public permanentlyUsedNullifiers;
    mapping(bytes32 => bool) private _tempRingMemberCheck;
    
    // ============ Events ============
    event PointCreated(bytes32 indexed pointId, bytes32 commitment, address indexed creator, bytes32 txHash);
    event PrivacyPaymentExecuted(bytes32 indexed txHash, uint256 ringSize, bytes32 keyImage, uint256 inputCount, uint256 outputCount);
    event WithdrawalRequested(bytes32 indexed requestId, address indexed requester, uint256 amount, uint256 unlockTime);
    event WithdrawalCompleted(bytes32 indexed requestId, address indexed requester, uint256 amount, uint256 fee);
    event WithdrawalCancelledEvent(bytes32 indexed requestId, address indexed requester, bool permanent);
    event SecurityAlert(string alertType, address indexed user, bytes32 data);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event MultiSigActionProposed(bytes32 indexed actionHash, address indexed proposer, string actionType);
    event MultiSigActionApproved(bytes32 indexed actionHash, address indexed signer, uint256 approvalCount);
    event MultiSigActionExecuted(bytes32 indexed actionHash, address indexed executor);
    event OraclePriceUpdated(uint256 price, uint256 timestamp);
    event FeesWithdrawn(address indexed to, uint256 amount);
    
    // ============ Modifiers ============
    modifier noContractCaller() {
        if (msg.sender != tx.origin) revert UnauthorizedCaller();
        uint256 size;
        address sender = msg.sender;
        assembly { size := extcodesize(sender) }
        if (size > 0) revert UnauthorizedCaller();
        _;
    }
    
    modifier flashLoanProtection() {
        if (lastDepositBlock[msg.sender] == block.number) revert FlashLoanDetected();
        if (block.timestamp - lastDepositTimestamp[msg.sender] < POINT_LOCK_DURATION) revert FlashLoanDetected();
        _;
    }
    
    modifier rateLimited() {
        if (block.timestamp > windowStart[msg.sender] + RATE_LIMIT_WINDOW) {
            windowStart[msg.sender] = block.timestamp;
            transactionCount[msg.sender] = 0;
        }
        if (transactionCount[msg.sender] >= MAX_TRANSACTIONS_PER_WINDOW) revert RateLimitExceeded();
        transactionCount[msg.sender]++;
        _;
    }
    
    modifier requireVerifiers() {
        if (zkVerifier == address(0) || ringSignatureVerifier == address(0)) revert VerifiersNotSet();
        _;
    }
    
    modifier validDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert TransactionExpired();
        if (deadline > block.timestamp + MAX_DEADLINE_DURATION) revert TransactionExpired();
        _;
    }
    
    modifier validNonce(uint256 nonce) {
        if (nonce != userNonces[msg.sender]) revert InvalidNonce();
        userNonces[msg.sender]++;
        _;
    }
    
    modifier validArrays(uint256 len, uint256 maxLen) {
        if (len == 0) revert InvalidBatchSize();
        if (len > maxLen) revert ArrayTooLarge();
        // Gas检查
        if (len * MAX_GAS_PER_POINT > gasleft()) revert GasLimitExceeded();
        _;
    }
    
    modifier requireMultiSig(bytes32 actionHash) {
        if (multiSigApprovalCount[actionHash] < requiredSignatures) revert InsufficientSignatures();
        if (multiSigExecuted[actionHash]) revert TransactionReplay();
        multiSigExecuted[actionHash] = true;
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address _usdt, 
        address _treasury,
        address[] memory _multiSigSigners,
        uint256 _requiredSignatures
    ) Ownable(msg.sender) {
        if (_usdt == address(0) || _treasury == address(0)) revert ZeroAddress();
        if (_multiSigSigners.length < MIN_MULTISIG_SIGNERS) revert InsufficientSignatures();
        if (_requiredSignatures < MIN_MULTISIG_SIGNERS || _requiredSignatures > _multiSigSigners.length) {
            revert InvalidAmount();
        }
        
        usdt = IERC20(_usdt);
        treasury = _treasury;
        multiSigSigners = _multiSigSigners;
        requiredSignatures = _requiredSignatures;
        
        CHAIN_ID = block.chainid;
        
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("FloatingPointProtocol"),
            keccak256("2.0"),
            block.chainid,
            address(this)
        ));
    }
    
    // ============ Multi-Sig Functions (QS-02 修复) ============
    
    function proposeMultiSigAction(bytes32 actionHash, string calldata actionType) external {
        _requireSigner(msg.sender);
        if (multiSigExecuted[actionHash]) revert TransactionReplay();
        
        multiSigApprovals[actionHash][msg.sender] = true;
        multiSigApprovalCount[actionHash] = 1;
        
        emit MultiSigActionProposed(actionHash, msg.sender, actionType);
    }
    
    function approveMultiSigAction(bytes32 actionHash) external {
        _requireSigner(msg.sender);
        if (multiSigExecuted[actionHash]) revert TransactionReplay();
        if (multiSigApprovals[actionHash][msg.sender]) revert TransactionReplay();
        
        multiSigApprovals[actionHash][msg.sender] = true;
        multiSigApprovalCount[actionHash]++;
        
        emit MultiSigActionApproved(actionHash, msg.sender, multiSigApprovalCount[actionHash]);
    }
    
    function _requireSigner(address account) internal view {
        bool isSigner = false;
        for (uint256 i = 0; i < multiSigSigners.length; i++) {
            if (multiSigSigners[i] == account) {
                isSigner = true;
                break;
            }
        }
        if (!isSigner) revert UnauthorizedCaller();
    }
    
    // ============ Core Functions ============
    
    function deposit(
        bytes32[] calldata commitments,
        uint256 deadline,
        uint256 nonce
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        noContractCaller
        rateLimited
        validDeadline(deadline)
        validNonce(nonce)
        validArrays(commitments.length, MAX_BATCH_SIZE)
    {
        uint256 numPoints = commitments.length;
        uint256 totalAmount = numPoints * POINT_VALUE;
        
        if (totalAmount < MIN_DEPOSIT || totalAmount > MAX_DEPOSIT) revert InvalidAmount();
        
        uint256 fee = _safeFeeMul(totalAmount, depositFeeRate);
        uint256 netAmount;
        unchecked {
            netAmount = totalAmount - fee; // Safe: fee <= totalAmount
        }
        
        uint256 userBalance = usdt.balanceOf(msg.sender);
        if (userBalance < totalAmount) revert InsufficientBalance();
        
        usdt.safeTransferFrom(msg.sender, treasury, netAmount);
        if (fee > 0) {
            usdt.safeTransferFrom(msg.sender, address(this), fee);
            totalFees += fee;
        }
        
        bytes32 batchTxHash = keccak256(abi.encodePacked(
            msg.sender, block.timestamp, block.number, nonce, CHAIN_ID, blockhash(block.number - 1)
        ));
        
        for (uint256 i = 0; i < numPoints;) {
            if (commitments[i] == bytes32(0)) revert InvalidCommitment();
            
            bytes32 pointId = keccak256(abi.encodePacked(
                commitments[i], block.timestamp, block.number, msg.sender, i, CHAIN_ID, batchTxHash
            ));
            
            if (usedPointIds[pointId]) {
                emit SecurityAlert("POINT_ID_COLLISION", msg.sender, pointId);
                revert PointIdCollision();
            }
            usedPointIds[pointId] = true;
            
            points[pointId] = FloatingPoint({
                commitment: commitments[i],
                createdAt: block.timestamp,
                mass: 1,
                isActive: true,
                creator: msg.sender,
                creationTxHash: batchTxHash,
                pendingWithdrawalId: bytes32(0),
                lockedUntil: block.timestamp + POINT_LOCK_DURATION
            });
            
            emit PointCreated(pointId, commitments[i], msg.sender, batchTxHash);
            
            unchecked { ++i; } // Gas优化
        }
        
        unchecked {
            totalPoints += numPoints;
            totalDeposited += totalAmount;
        }
        
        lastDepositBlock[msg.sender] = block.number;
        lastDepositTimestamp[msg.sender] = block.timestamp;
        lastActionTimestamp[msg.sender] = block.timestamp;
    }

    function privacyPayment(
        bytes32[] calldata inputNullifiers,
        bytes32[] calldata outputCommitments,
        bytes32[] calldata inputPointIds,
        address recipient,
        bytes32 keyImage,
        bytes32[] calldata ringMembers,
        bytes calldata zkProof,
        bytes calldata ringSignature,
        uint256 deadline,
        uint256 nonce
    )
        external
        nonReentrant
        whenNotPaused
        noContractCaller
        flashLoanProtection
        rateLimited
        requireVerifiers
        validDeadline(deadline)
        validNonce(nonce)
        validArrays(inputNullifiers.length, MAX_BATCH_SIZE)
    {
        // 验证基本参数
        if (outputCommitments.length == 0 || outputCommitments.length > MAX_BATCH_SIZE) revert ArrayTooLarge();
        if (inputPointIds.length != inputNullifiers.length) revert ArrayLengthMismatch();
        if (ringMembers.length < MIN_RING_SIZE || ringMembers.length > MAX_RING_SIZE) revert InvalidRingSize();
        if (recipient == address(0)) revert ZeroAddress();
        if (recipient == msg.sender) revert UnauthorizedCaller();
        if (keyImage == bytes32(0)) revert InvalidKeyImage();
        if (inputNullifiers.length != outputCommitments.length) revert ValueNotConserved();
        
        _verifyUniqueRingMembers(ringMembers);
        
        // Check key image
        if (usedKeyImages[keyImage]) revert KeyImageAlreadyUsed();
        
        for (uint256 i = 0; i < inputPointIds.length;) {
            FloatingPoint storage point = points[inputPointIds[i]];
            
            if (!point.isActive) revert PointNotActive();
            if (block.timestamp < point.lockedUntil) revert PointLocked();
            if (point.pendingWithdrawalId != bytes32(0)) revert PointInPendingWithdrawal();
            
            bytes32 nullifier = inputNullifiers[i];
            if (permanentlyUsedNullifiers[nullifier]) revert NullifierAlreadyUsed();
            if (nullifierSet[nullifier]) revert NullifierAlreadyUsed();
            if (nullifier == bytes32(0)) revert InvalidCommitment();
            
            unchecked { ++i; }
        }
        
        for (uint256 i = 0; i < outputCommitments.length;) {
            if (outputCommitments[i] == bytes32(0)) revert InvalidCommitment();
            unchecked { ++i; }
        }
        
        bytes32 txHash = keccak256(abi.encodePacked(
            inputNullifiers, outputCommitments, recipient, block.timestamp, CHAIN_ID, nonce, keyImage
        ));
        
        if (usedTransactionHashes[txHash]) revert TransactionReplay();
        
        uint256 inputSum;
        uint256 outputSum;
        unchecked {
            inputSum = inputNullifiers.length * POINT_VALUE;
            outputSum = outputCommitments.length * POINT_VALUE;
        }
        
        // 验证ZK证明
        bool zkValid = IZKVerifier(zkVerifier).verifyProof(
            zkProof, inputNullifiers, outputCommitments, commitmentMerkleRoot, inputSum, outputSum
        );
        if (!zkValid) revert InvalidProof();
        
        // 验证环签名
        bool ringValid = IRingSignatureVerifier(ringSignatureVerifier).verifySignature(
            ringSignature, keyImage, ringMembers, txHash
        );
        if (!ringValid) revert InvalidRingSignature();
        
        // 状态变更 (CEI模式)
        for (uint256 i = 0; i < inputNullifiers.length;) {
            nullifierSet[inputNullifiers[i]] = true;
            permanentlyUsedNullifiers[inputNullifiers[i]] = true;
            points[inputPointIds[i]].isActive = false;
            unchecked { ++i; }
        }
        
        usedKeyImages[keyImage] = true;
        usedTransactionHashes[txHash] = true;
        
        // 创建输出点
        for (uint256 i = 0; i < outputCommitments.length;) {
            bytes32 newPointId = keccak256(abi.encodePacked(
                outputCommitments[i], block.timestamp, block.number, recipient, i, CHAIN_ID, txHash
            ));
            
            if (usedPointIds[newPointId]) {
                newPointId = keccak256(abi.encodePacked(newPointId, blockhash(block.number - 1)));
            }
            usedPointIds[newPointId] = true;
            
            points[newPointId] = FloatingPoint({
                commitment: outputCommitments[i],
                createdAt: block.timestamp,
                mass: 1,
                isActive: true,
                creator: recipient,
                creationTxHash: txHash,
                pendingWithdrawalId: bytes32(0),
                lockedUntil: block.timestamp + POINT_LOCK_DURATION
            });
            
            unchecked { ++i; }
        }
        
        lastActionTimestamp[msg.sender] = block.timestamp;
        
        emit PrivacyPaymentExecuted(txHash, ringMembers.length, keyImage, inputNullifiers.length, outputCommitments.length);
    }
    
    function _verifyUniqueRingMembers(bytes32[] calldata ringMembers) internal {
        for (uint256 i = 0; i < ringMembers.length;) {
            if (_tempRingMemberCheck[ringMembers[i]]) revert DuplicateRingMember();
            _tempRingMemberCheck[ringMembers[i]] = true;
            unchecked { ++i; }
        }
        // 清理临时mapping
        for (uint256 i = 0; i < ringMembers.length;) {
            delete _tempRingMemberCheck[ringMembers[i]];
            unchecked { ++i; }
        }
    }

    function _safeFeeMul(uint256 amount, uint256 feeRate) internal pure returns (uint256) {
        if (feeRate == 0) return 0;
        if (amount == 0) return 0;
        
        // 检查乘法溢出
        uint256 numerator = amount * feeRate;
        if (numerator / amount != feeRate) revert InvalidAmount();
        
        // 安全除法
        return numerator / FEE_DENOMINATOR;
    }
    
    // ============ 新增: 手续费管理 ============
    
    /**
     * @notice 提取协议手续费到指定地址 - 需要多签
     * @param to 接收地址
     * @param amount 提取金额
     * @param actionHash 多签操作哈希
     */
    function withdrawFees(
        address to,
        uint256 amount,
        bytes32 actionHash
    ) 
        external 
        nonReentrant 
        requireMultiSig(actionHash) 
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (amount > totalFees) revert InsufficientBalance();
        
        // 验证actionHash
        bytes32 expectedHash = keccak256(abi.encodePacked("withdrawFees", to, amount));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        totalFees -= amount;
        usdt.safeTransfer(to, amount);
        
        emit FeesWithdrawn(to, amount);
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    /**
     * @notice 获取可提取的手续费余额
     */
    function getAvailableFees() external view returns (uint256) {
        return totalFees;
    }
    
    // ============ 提款函数 ============
    
    /**
     * @notice 请求提款 - 将点转换回USDT
     * @param pointIds 要提取的点ID数组
     * @param nullifiers 点对应的nullifier数组
     * @param deadline 截止时间
     * @param nonce 用户nonce
     */
    function requestWithdrawal(
        bytes32[] calldata pointIds,
        bytes32[] calldata nullifiers,
        uint256 deadline,
        uint256 nonce
    )
        external
        nonReentrant
        whenNotPaused
        noContractCaller
        rateLimited
        validDeadline(deadline)
        validNonce(nonce)
        validArrays(pointIds.length, MAX_BATCH_SIZE)
    {
        if (pointIds.length != nullifiers.length) revert ArrayLengthMismatch();
        
        uint256 totalAmount = pointIds.length * POINT_VALUE;
        
        // 验证并锁定点
        for (uint256 i = 0; i < pointIds.length;) {
            FloatingPoint storage point = points[pointIds[i]];
            
            if (!point.isActive) revert PointNotActive();
            if (point.creator != msg.sender) revert UnauthorizedCaller();
            if (point.pendingWithdrawalId != bytes32(0)) revert PointInPendingWithdrawal();
            if (block.timestamp < point.lockedUntil) revert PointLocked();
            
            // 验证nullifier
            bytes32 nullifier = nullifiers[i];
            if (permanentlyUsedNullifiers[nullifier]) revert NullifierAlreadyUsed();
            if (nullifierSet[nullifier]) revert NullifierAlreadyUsed();
            if (nullifier == bytes32(0)) revert InvalidCommitment();
            
            unchecked { ++i; }
        }
        
        // 生成提款请求ID
        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender, block.timestamp, block.number, nonce, CHAIN_ID, pointIds
        ));
        
        // 创建提款请求
        withdrawalRequests[requestId] = WithdrawalRequest({
            requester: msg.sender,
            amount: totalAmount,
            requestTime: block.timestamp,
            unlockTime: block.timestamp + WITHDRAWAL_DELAY,
            completed: false,
            cancelled: false,
            permanentlyCancelled: false,
            pointIds: pointIds,
            nullifiers: nullifiers,
            requestHash: requestId
        });
        
        // 标记点为待提款状态并标记nullifier
        for (uint256 i = 0; i < pointIds.length;) {
            points[pointIds[i]].pendingWithdrawalId = requestId;
            nullifierSet[nullifiers[i]] = true;
            unchecked { ++i; }
        }
        
        lastActionTimestamp[msg.sender] = block.timestamp;
        
        emit WithdrawalRequested(requestId, msg.sender, totalAmount, block.timestamp + WITHDRAWAL_DELAY);
    }
    
    /**
     * @notice 完成提款 - 在延迟期后完成
     * @param requestId 提款请求ID
     */
    function completeWithdrawal(bytes32 requestId)
        external
        nonReentrant
        whenNotPaused
    {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        
        if (request.requester != msg.sender) revert UnauthorizedCaller();
        if (request.completed) revert WithdrawalAlreadyCompleted();
        if (request.cancelled || request.permanentlyCancelled) revert WithdrawalAlreadyCancelled();
        if (block.timestamp < request.unlockTime) revert WithdrawalNotReady();
        if (block.timestamp > request.unlockTime + WITHDRAWAL_EXPIRY) revert WithdrawalExpired();
        
        request.completed = true;
        
        // 计算手续费
        uint256 fee = _safeFeeMul(request.amount, withdrawalFeeRate);
        uint256 netAmount = request.amount - fee;
        
        // 停用点并永久标记nullifier
        for (uint256 i = 0; i < request.pointIds.length;) {
            points[request.pointIds[i]].isActive = false;
            permanentlyUsedNullifiers[request.nullifiers[i]] = true;
            unchecked { ++i; }
        }
        
        // 更新统计
        unchecked {
            totalPoints -= request.pointIds.length;
            totalWithdrawn += request.amount;
            totalFees += fee;
        }
        
        // 从Treasury提取资金给用户
        // 注意: 需要TreasuryManager合约已授权此合约调用withdrawReserve
        (bool success, ) = treasury.call(
            abi.encodeWithSignature("withdrawReserve(address,uint256)", msg.sender, netAmount)
        );
        if (!success) revert InsufficientTreasuryBalance();
        
        emit WithdrawalCompleted(requestId, msg.sender, netAmount, fee);
    }
    
    /**
     * @notice 取消提款请求
     * @param requestId 提款请求ID
     * @param permanent 是否永久取消(永久取消后nullifier仍被标记)
     */
    function cancelWithdrawal(bytes32 requestId, bool permanent)
        external
        nonReentrant
    {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        
        if (request.requester != msg.sender) revert UnauthorizedCaller();
        if (request.completed) revert WithdrawalAlreadyCompleted();
        if (request.permanentlyCancelled) revert WithdrawalCancelledPermanently();
        
        if (permanent) {
            request.permanentlyCancelled = true;
            // 永久取消: 点失效，nullifier保持已使用
            for (uint256 i = 0; i < request.pointIds.length;) {
                points[request.pointIds[i]].isActive = false;
                permanentlyUsedNullifiers[request.nullifiers[i]] = true;
                unchecked { ++i; }
            }
        } else {
            request.cancelled = true;
            // 临时取消: 恢复点，清除nullifier
            for (uint256 i = 0; i < request.pointIds.length;) {
                points[request.pointIds[i]].pendingWithdrawalId = bytes32(0);
                nullifierSet[request.nullifiers[i]] = false;
                unchecked { ++i; }
            }
        }
        
        cancellationTimestamps[requestId] = block.timestamp;
        
        emit WithdrawalCancelledEvent(requestId, msg.sender, permanent);
    }
    
    /**
     * @notice 获取提款请求详情
     */
    function getWithdrawalRequest(bytes32 requestId) external view returns (WithdrawalRequest memory) {
        return withdrawalRequests[requestId];
    }
    
    // ============ 多签管理函数 (QS-02修复) ============
    
    function setTreasury(address newTreasury, bytes32 actionHash) 
        external 
        requireMultiSig(actionHash) 
    {
        if (newTreasury == address(0)) revert ZeroAddress();
        
        // 验证actionHash匹配
        bytes32 expectedHash = keccak256(abi.encodePacked("setTreasury", newTreasury));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    function setVerifiers(
        address _zkVerifier, 
        address _ringVerifier,
        bytes32 actionHash
    ) 
        external 
        requireMultiSig(actionHash)
    {
        if (verifiersLocked) revert VerifiersLocked();
        if (_zkVerifier == address(0) || _ringVerifier == address(0)) revert ZeroAddress();
        
        bytes32 expectedHash = keccak256(abi.encodePacked("setVerifiers", _zkVerifier, _ringVerifier));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        zkVerifier = _zkVerifier;
        ringSignatureVerifier = _ringVerifier;
        
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    function lockVerifiers(bytes32 actionHash) external requireMultiSig(actionHash) {
        bytes32 expectedHash = keccak256(abi.encodePacked("lockVerifiers"));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        verifiersLocked = true;
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    function pause(bytes32 actionHash) external requireMultiSig(actionHash) {
        bytes32 expectedHash = keccak256(abi.encodePacked("pause"));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        _pause();
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    function unpause(bytes32 actionHash) external requireMultiSig(actionHash) {
        bytes32 expectedHash = keccak256(abi.encodePacked("unpause"));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        _unpause();
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    // ============ 价格预言机 (QS-06修复) ============
    
    function setPriceOracle(address _oracle, bytes32 actionHash) external requireMultiSig(actionHash) {
        bytes32 expectedHash = keccak256(abi.encodePacked("setPriceOracle", _oracle));
        if (actionHash != expectedHash) revert InvalidSignature();
        
        priceOracle = IPriceOracle(_oracle);
        emit MultiSigActionExecuted(actionHash, msg.sender);
    }
    
    function getOraclePrice() public view returns (uint256 price, bool isValid) {
        if (address(priceOracle) == address(0)) {
            return (POINT_VALUE, true); // 默认$10
        }
        
        (uint256 oraclePrice, , uint256 timestamp) = priceOracle.getPrice();
        
        // 检查价格是否过期
        if (block.timestamp - timestamp > ORACLE_STALENESS_THRESHOLD) {
            return (POINT_VALUE, false);
        }
        
        return (oraclePrice, true);
    }
    
    // ============ View Functions ============
    
    function getPoint(bytes32 pointId) external view returns (FloatingPoint memory) {
        return points[pointId];
    }
    
    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }
    
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifierSet[nullifier] || permanentlyUsedNullifiers[nullifier];
    }
    
    function getMultiSigSigners() external view returns (address[] memory) {
        return multiSigSigners;
    }
    
    function getRequiredSignatures() external view returns (uint256) {
        return requiredSignatures;
    }
}
