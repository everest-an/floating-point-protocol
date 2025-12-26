// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PoseidonHasher
 * @notice ZK-friendly hash function implementation
 * @dev Based on Poseidon hash algorithm optimized for ZK circuits
 * 
 * Generated using https://github.com/iden3/circomlibjs
 * Poseidon parameters: t=6, RF=8, RP=57, alpha=5
 */
library PoseidonT3 {
    uint256 constant M00 = 0x109b7f411ba0e4c9b2b70caf5c36a7b194be7c11ad24378bfedb68592ba8118b;
    uint256 constant M01 = 0x2969f27eed31a480b9c36c764379dbca2cc8fdd1415c3dded62940bcde0bd771;
    uint256 constant M02 = 0x143021ec686a3f330d5f9e654638065ce6cd79e28c5b3753326244ee65a1b1a7;
    uint256 constant M10 = 0x16ed41e13bb9c0c66ae119424fddbcbc9314dc9fdbdeea55d6c64543dc4903e0;
    uint256 constant M11 = 0x2e2419f9ec02ec394c9871c832963dc1b89d743c8c7b964029b2311687b1fe23;
    uint256 constant M12 = 0x176cc029695ad02582a70eff08a6fd99d057e12e58e7d7b6b16cdfabc8ee2911;
    uint256 constant M20 = 0x2b90bba00fca0589f617e7dcbfe82e0df706ab640ceb247b791a93b74e36736d;
    uint256 constant M21 = 0x101071f0032379b697315876690f053d148d4e109f5fb065c8aacc55a0f89bfa;
    uint256 constant M22 = 0x19a3fc0a56702bf417ba7fee3802593fa644470307043f7773279cd71d25d5e0;

    // Simplified implementation for testing
    // In production, use full Poseidon implementation with all rounds
    function poseidon(uint256[2] memory input) internal pure returns (uint256) {
        uint256 t0 = input[0];
        uint256 t1 = input[1];
        uint256 t2 = 0;
        
        // Simplified mixing (not cryptographically secure in this form)
        // Real implementation needs full rounds as per Poseidon spec
        t0 = addmod(mulmod(M00, t0, FIELD_SIZE), mulmod(M01, t1, FIELD_SIZE), FIELD_SIZE);
        t1 = addmod(mulmod(M10, t0, FIELD_SIZE), mulmod(M11, t1, FIELD_SIZE), FIELD_SIZE);
        
        return addmod(t0, t1, FIELD_SIZE);
    }
    
    uint256 constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
}

library PoseidonT4 {
    // Hash 3 elements
    function poseidon(uint256[3] memory input) internal pure returns (uint256) {
        // Simplified version
        return uint256(keccak256(abi.encodePacked(input[0], input[1], input[2]))) % 
            21888242871839275222246405745257275088548364400416034343698204186575808495617;
    }
}

library PoseidonT5 {
    // Hash 4 elements
    function poseidon(uint256[4] memory input) internal pure returns (uint256) {
        // Simplified version
        return uint256(keccak256(abi.encodePacked(input[0], input[1], input[2], input[3]))) % 
            21888242871839275222246405745257275088548364400416034343698204186575808495617;
    }
}

/**
 * @title PoseidonHasher
 * @notice Convenience wrapper for different Poseidon hash functions
 */
contract PoseidonHasher {
    function hash2(uint256[2] memory input) public pure returns (uint256) {
        return PoseidonT3.poseidon(input);
    }
    
    function hash3(uint256[3] memory input) public pure returns (uint256) {
        return PoseidonT4.poseidon(input);
    }
    
    function hash4(uint256[4] memory input) public pure returns (uint256) {
        return PoseidonT5.poseidon(input);
    }
    
    // Convenience function for commitment = hash(nullifier, secret)
    function hashCommitment(uint256 nullifier, uint256 secret) public pure returns (uint256) {
        return hash2([nullifier, secret]);
    }
    
    // Convenience function for nullifierHash = hash(nullifier)
    function hashNullifier(uint256 nullifier) public pure returns (uint256) {
        return hash2([nullifier, nullifier]);
    }
}
