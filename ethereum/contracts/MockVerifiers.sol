// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockZKVerifier
 * @notice Mock ZK proof verifier for testing
 * @dev In production, replace with actual ZK verifier (e.g., Groth16, PLONK)
 */
contract MockZKVerifier {
    bool public autoApprove = true;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @notice Set auto-approve mode for testing
     */
    function setAutoApprove(bool _autoApprove) external onlyOwner {
        autoApprove = _autoApprove;
    }

    /**
     * @notice Verify a ZK proof
     * @dev In production, this would verify actual cryptographic proofs
     */
    function verifyProof(
        bytes calldata proof,
        bytes32[] calldata nullifiers,
        bytes32[] calldata outputCommitments,
        bytes32 merkleRoot,
        uint256 inputSum,
        uint256 outputSum
    ) external view returns (bool) {
        // For testing: auto-approve or check basic conditions
        if (autoApprove) {
            return true;
        }
        
        // Basic validation checks
        require(nullifiers.length > 0, "No nullifiers");
        require(outputCommitments.length > 0, "No outputs");
        require(inputSum == outputSum, "Value not conserved");
        require(proof.length > 0, "Empty proof");
        
        return true;
    }
}

/**
 * @title MockRingSignatureVerifier
 * @notice Mock ring signature verifier for testing
 * @dev In production, replace with actual ring signature verification
 */
contract MockRingSignatureVerifier {
    bool public autoApprove = true;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @notice Set auto-approve mode for testing
     */
    function setAutoApprove(bool _autoApprove) external onlyOwner {
        autoApprove = _autoApprove;
    }

    /**
     * @notice Verify a ring signature
     * @dev In production, this would verify actual LSAG/MLSAG signatures
     */
    function verifySignature(
        bytes calldata signature,
        bytes32 keyImage,
        bytes32[] calldata ringMembers,
        bytes32 message
    ) external view returns (bool) {
        // For testing: auto-approve or check basic conditions
        if (autoApprove) {
            return true;
        }
        
        // Basic validation checks
        require(signature.length > 0, "Empty signature");
        require(keyImage != bytes32(0), "Empty key image");
        require(ringMembers.length >= 5, "Ring too small");
        require(message != bytes32(0), "Empty message");
        
        return true;
    }
}
