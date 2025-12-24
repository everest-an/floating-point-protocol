use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum FPPError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
    
    #[error("Not Rent Exempt")]
    NotRentExempt,
    
    #[error("Invalid Amount")]
    InvalidAmount,
    
    #[error("Invalid Commitment")]
    InvalidCommitment,
    
    #[error("Nullifier Already Used")]
    NullifierAlreadyUsed,
    
    #[error("Point Not Active")]
    PointNotActive,
    
    #[error("Point Locked")]
    PointLocked,
    
    #[error("Withdrawal Not Ready")]
    WithdrawalNotReady,
    
    #[error("Insufficient Balance")]
    InsufficientBalance,
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Invalid Proof")]
    InvalidProof,
    
    #[error("Invalid Ring Signature")]
    InvalidRingSignature,
    
    #[error("Rate Limit Exceeded")]
    RateLimitExceeded,
    
    #[error("Flash Loan Detected")]
    FlashLoanDetected,
    
    #[error("Invalid Account")]
    InvalidAccount,
    
    #[error("Account Already Initialized")]
    AccountAlreadyInitialized,
    
    #[error("Account Not Initialized")]
    AccountNotInitialized,
}

impl From<FPPError> for ProgramError {
    fn from(e: FPPError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
