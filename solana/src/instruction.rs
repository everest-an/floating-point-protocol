use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum FPPInstruction {
    /// Initialize the protocol
    /// 
    /// Accounts expected:
    /// 0. `[signer, writable]` Protocol authority
    /// 1. `[writable]` Protocol state account
    /// 2. `[]` Treasury account
    /// 3. `[]` USDT mint
    /// 4. `[]` System program
    /// 5. `[]` Rent sysvar
    Initialize {
        deposit_fee_rate: u16,
        withdrawal_fee_rate: u16,
    },
    
    /// Deposit USDT and create floating points
    /// 
    /// Accounts expected:
    /// 0. `[signer]` User account
    /// 1. `[writable]` User USDT token account
    /// 2. `[writable]` Treasury USDT token account
    /// 3. `[writable]` Protocol state account
    /// 4. `[writable]` New floating point account (PDA)
    /// 5. `[]` USDT mint
    /// 6. `[]` Token program
    /// 7. `[]` System program
    /// 8. `[]` Clock sysvar
    Deposit {
        amount: u64,
        commitments: Vec<[u8; 32]>,
    },
    
    /// Privacy payment using zero-knowledge proof
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Sender account
    /// 1. `[writable]` Protocol state account
    /// 2. `[]` Recipient account
    /// 3-N. `[writable]` Input point accounts
    /// N+1-M. `[writable]` Output point accounts (PDAs)
    /// M+1. `[]` ZK verifier program
    /// M+2. `[]` System program
    /// M+3. `[]` Clock sysvar
    PrivacyPayment {
        input_nullifiers: Vec<[u8; 32]>,
        output_commitments: Vec<[u8; 32]>,
        proof: Vec<u8>,
        ring_signature: Vec<u8>,
    },
    
    /// Request withdrawal
    /// 
    /// Accounts expected:
    /// 0. `[signer]` User account
    /// 1. `[writable]` Protocol state account
    /// 2. `[writable]` Withdrawal request account (PDA)
    /// 3-N. `[writable]` Point accounts to withdraw
    /// N+1. `[]` System program
    /// N+2. `[]` Clock sysvar
    RequestWithdrawal {
        point_ids: Vec<Pubkey>,
        nullifiers: Vec<[u8; 32]>,
    },
    
    /// Complete withdrawal after delay
    /// 
    /// Accounts expected:
    /// 0. `[signer]` User account
    /// 1. `[writable]` User USDT token account
    /// 2. `[writable]` Treasury USDT token account
    /// 3. `[writable]` Protocol state account
    /// 4. `[writable]` Withdrawal request account
    /// 5. `[]` Treasury authority (PDA)
    /// 6. `[]` Token program
    /// 7. `[]` Clock sysvar
    CompleteWithdrawal,
    
    /// Cancel withdrawal
    /// 
    /// Accounts expected:
    /// 0. `[signer]` User account
    /// 1. `[writable]` Withdrawal request account
    /// 2-N. `[writable]` Point accounts
    CancelWithdrawal {
        permanent: bool,
    },
    
    /// Update protocol fees (admin only)
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Protocol authority
    /// 1. `[writable]` Protocol state account
    UpdateFees {
        deposit_fee_rate: u16,
        withdrawal_fee_rate: u16,
    },
    
    /// Pause/unpause protocol (admin only)
    /// 
    /// Accounts expected:
    /// 0. `[signer]` Protocol authority
    /// 1. `[writable]` Protocol state account
    SetPaused {
        paused: bool,
    },
}
