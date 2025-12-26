pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/merkle_tree.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";

/*
 * Withdraw Circuit
 * Proves: I know (nullifier, secret) such that:
 * 1. commitment = Poseidon(nullifier, secret) is in the Merkle tree with given root
 * 2. nullifierHash = Poseidon(nullifier) matches public input
 * 3. Without revealing (nullifier, secret)
 */
template Withdraw(levels) {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient; // address as uint256
    signal input relayer;   // address as uint256
    signal input fee;
    signal input refund;
    
    // Private inputs
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    
    // Compute commitment = Poseidon(nullifier, secret)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    signal commitment;
    commitment <== commitmentHasher.out;
    
    // Verify Merkle proof that commitment is in tree with given root
    component merkleProof = MerkleTreeChecker(levels);
    merkleProof.leaf <== commitment;
    merkleProof.root <== root;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }
    
    // Compute nullifier hash = Poseidon(nullifier)
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    
    // Ensure computed nullifierHash matches public input
    nullifierHash === nullifierHasher.out;
    
    // Add dummy constraints for recipient, relayer, fee, refund
    // to prevent optimization removing them
    signal recipientSquared;
    signal relayerSquared;
    signal feeSquared;
    signal refundSquared;
    
    recipientSquared <== recipient * recipient;
    relayerSquared <== relayer * relayer;
    feeSquared <== fee * fee;
    refundSquared <== refund * refund;
}

// Instantiate with 20 levels (supports up to 2^20 = 1,048,576 commitments)
component main {public [root, nullifierHash, recipient, relayer, fee, refund]} = Withdraw(20);
