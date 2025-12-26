pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";

/*
 * Deposit Circuit
 * Proves knowledge of (nullifier, secret) that hash to a given commitment
 */
template Deposit() {
    signal input nullifier;
    signal input secret;
    signal output commitment;
    
    // Compute commitment = Poseidon(nullifier, secret)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    
    commitment <== commitmentHasher.out;
}

component main = Deposit();
