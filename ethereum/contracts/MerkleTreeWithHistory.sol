// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PoseidonHasher.sol";

/**
 * @title MerkleTreeWithHistory
 * @notice Incremental Merkle tree for storing commitments
 * @dev Based on Tornado Cash implementation
 */
abstract contract MerkleTreeWithHistory {
    uint32 public constant LEVELS = 20;
    uint32 public constant ROOT_HISTORY_SIZE = 30;
    uint256 public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant ZERO_VALUE = 21663839004416932945382355908790599225266501822907911457504978515578255421292; // keccak256("fpp") % FIELD_SIZE
    
    uint32 public nextIndex = 0;
    uint32 public currentRootIndex = 0;
    
    mapping(uint256 => bool) public commitments;
    mapping(uint32 => uint256) public filledSubtrees;
    mapping(uint32 => uint256) public roots;
    
    PoseidonHasher public hasher;
    
    event CommitmentInserted(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp);
    
    constructor(address _hasher) {
        hasher = PoseidonHasher(_hasher);
        
        // Initialize subtrees with zero values
        for (uint32 i = 0; i < LEVELS; i++) {
            filledSubtrees[i] = zeros(i);
        }
        
        // Set initial root
        roots[0] = zeros(LEVELS);
    }
    
    /**
     * @notice Hash 2 elements using Poseidon
     */
    function hashLeftRight(uint256 left, uint256 right) public view returns (uint256) {
        return hasher.hash2([left, right]);
    }
    
    /**
     * @notice Get zero value at specific level
     */
    function zeros(uint32 i) public pure returns (uint256) {
        if (i == 0) return ZERO_VALUE;
        else if (i == 1) return 0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c;
        else if (i == 2) return 0x256a6135777eee2fd26f54b8b7037a25439d5235caee224154186d2b8a52e31d;
        else if (i == 3) return 0x1151949895e82ab19924de92c40a3d6f7bcb60d92b00504b8199613683f0c200;
        else if (i == 4) return 0x20121ee811489ff8d61f09fb89e313f14959a0f28bb428a20dba6b0b068b3bdb;
        else if (i == 5) return 0x0a89ca6ffa14cc462cfedb842c30ed221a50a3d6bf022a6a57dc82ab24c157c9;
        else if (i == 6) return 0x24ca05c2b5cd42e890d6be94c68d0689f4f21c9cec9c0f13fe41d566dfb54959;
        else if (i == 7) return 0x1ccb97c932565a92c60156bdba2d08f3bf1377464e025cee765679e604a7315c;
        else if (i == 8) return 0x19156fbd7d1a8bf5cba8909367de1b624534ebab4f0f79e003bccdd1b182bdb4;
        else if (i == 9) return 0x261af8c1f0912e465744641409f622d466c3920ac6e5ff37e36604cb11dfff80;
        else if (i == 10) return 0x0058459724ff6ca5a1652fcbc3e82b93895cf08e975b19beab3f54c217d1c007;
        else if (i == 11) return 0x1f04ef20dee48d39984d8eabe768a70eafa6310ad20849d4573c3c40c2ad1e30;
        else if (i == 12) return 0x1bea3dec5dab51567ce7e200a30f7ba6d4276aeaa53e2686f962a46c66d511e5;
        else if (i == 13) return 0x0ee0f941e2da4b9e31c3ca97a40d8fa9ce68d97c084177071b3cb46cd3372f0f;
        else if (i == 14) return 0x1ca9503e8935884501bbaf20be14eb4c46b89772c97b96e3b2ebf3a36a948bbd;
        else if (i == 15) return 0x133a80e30697cd55d8f7d4b0965b7be24057ba5dc3da898ee2187232446cb108;
        else if (i == 16) return 0x13e6d8fc88839ed76e182c2a779af5b2c0da9dd18c90427a644f7e148a6253b6;
        else if (i == 17) return 0x1eb16b057a477f4bc8f572ea6bee39561098f78f15bfb3699dcbb7bd8db61854;
        else if (i == 18) return 0x0da2cb16a1ceaabf1c16b838f7a9e3f2a3a3088d9e0a6debaa748114620696ea;
        else if (i == 19) return 0x24a3b3d822420b14b5d8cb6c28a574f01e98ea9e940551d2ebd75cee12649f9d;
        else if (i == 20) return 0x198622acbd783d1b0d9064105b1fc8e4d8889de95c4c519b3f635809fe6afc05;
        else revert("Index out of bounds");
    }
    
    /**
     * @notice Insert a new commitment into the tree
     */
    function _insert(uint256 _leaf) internal returns (uint32 insertedIndex) {
        require(_leaf < FIELD_SIZE, "Leaf value too large");
        require(!commitments[_leaf], "Commitment already exists");
        
        uint32 _nextIndex = nextIndex;
        require(_nextIndex != uint32(2)**LEVELS, "Merkle tree is full");
        
        uint256 currentLevelHash = _leaf;
        uint256 left;
        uint256 right;
        
        for (uint32 i = 0; i < LEVELS; i++) {
            if (_nextIndex % 2 == 0) {
                left = currentLevelHash;
                right = zeros(i);
                filledSubtrees[i] = currentLevelHash;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }
            
            currentLevelHash = hashLeftRight(left, right);
            _nextIndex /= 2;
        }
        
        uint32 newRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        currentRootIndex = newRootIndex;
        roots[newRootIndex] = currentLevelHash;
        nextIndex = nextIndex + 1;
        commitments[_leaf] = true;
        
        emit CommitmentInserted(_leaf, nextIndex - 1, block.timestamp);
        
        return nextIndex - 1;
    }
    
    /**
     * @notice Check if a given root is in the history
     */
    function isKnownRoot(uint256 _root) public view returns (bool) {
        if (_root == 0) {
            return false;
        }
        
        uint32 _currentRootIndex = currentRootIndex;
        uint32 i = _currentRootIndex;
        
        do {
            if (_root == roots[i]) {
                return true;
            }
            if (i == 0) {
                i = ROOT_HISTORY_SIZE;
            }
            i--;
        } while (i != _currentRootIndex);
        
        return false;
    }
    
    /**
     * @notice Get the current Merkle root
     */
    function getLastRoot() public view returns (uint256) {
        return roots[currentRootIndex];
    }
}
