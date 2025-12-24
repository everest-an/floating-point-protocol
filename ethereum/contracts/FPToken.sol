// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FPToken - Floating Point Protocol ERC20 Token
 * @notice FPP协议的官方ERC20代币
 * @dev Owner拥有完整控制权，可以设置minter或直接铸造
 */
contract FPToken is ERC20, ERC20Burnable, Pausable, Ownable {
    // 授权的铸造者(FPP主合约)
    address public minter;
    
    // 代币精度
    uint8 private constant _decimals = 6;
    
    // 总供应量上限 (1亿 FP)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**6;
    
    uint256 public constant OWNER_RESERVE = 10_000_000 * 10**6; // 1000万 FP
    uint256 public ownerMinted;
    
    // 事件
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event OwnerMint(address indexed to, uint256 amount);
    
    // 错误
    error OnlyMinter();
    error MaxSupplyExceeded();
    error OwnerReserveExceeded();
    error ZeroAddress();
    
    constructor(address _owner) ERC20("Floating Point Token", "FP") Ownable(_owner) {
        if (_owner == address(0)) revert ZeroAddress();
    }
    
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @notice 设置授权铸造者(FPP主合约)
     * @param _minter 新的铸造者地址
     */
    function setMinter(address _minter) external onlyOwner {
        if (_minter == address(0)) revert ZeroAddress();
        address oldMinter = minter;
        minter = _minter;
        emit MinterUpdated(oldMinter, _minter);
    }
    
    /**
     * @notice 铸造代币 - 只有授权铸造者可调用
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert OnlyMinter();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
    
    /**
     * @notice 项目方铸造代币 - 只有Owner可调用
     * @dev 从预留额度中铸造，用于团队分配、激励等
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function ownerMint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (ownerMinted + amount > OWNER_RESERVE) revert OwnerReserveExceeded();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        
        ownerMinted += amount;
        _mint(to, amount);
        
        emit OwnerMint(to, amount);
    }
    
    /**
     * @notice 获取项目方剩余可铸造额度
     */
    function getOwnerRemainingMint() external view returns (uint256) {
        return OWNER_RESERVE - ownerMinted;
    }
    
    /**
     * @notice 销毁代币 - 只有授权铸造者可调用
     * @param from 销毁地址
     * @param amount 销毁数量
     */
    function burnFrom(address from, uint256 amount) public override {
        if (msg.sender != minter) {
            super.burnFrom(from, amount);
        } else {
            _burn(from, amount);
        }
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
