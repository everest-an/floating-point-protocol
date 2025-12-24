use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

/// Main protocol state account
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ProtocolState {
    pub is_initialized: bool,
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub usdt_mint: Pubkey,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub total_fees: u64,
    pub total_points: u64,
    pub deposit_fee_rate: u16,  // basis points (100 = 1%)
    pub withdrawal_fee_rate: u16,
    pub is_paused: bool,
}

impl ProtocolState {
    pub const LEN: usize = 1 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 2 + 2 + 1;
}

/// Floating Point NFT state
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct FloatingPoint {
    pub is_initialized: bool,
    pub commitment: [u8; 32],
    pub created_at: i64,
    pub mass: u64,
    pub is_active: bool,
    pub creator: Pubkey,
    pub locked_until: i64,
}

impl FloatingPoint {
    pub const LEN: usize = 1 + 32 + 8 + 8 + 1 + 32 + 8;
}

/// Withdrawal request state
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct WithdrawalRequest {
    pub is_initialized: bool,
    pub requester: Pubkey,
    pub amount: u64,
    pub request_time: i64,
    pub unlock_time: i64,
    pub completed: bool,
    pub cancelled: bool,
}

impl WithdrawalRequest {
    pub const LEN: usize = 1 + 32 + 8 + 8 + 8 + 1 + 1;
}

/// Nullifier tracking account
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct NullifierSet {
    pub is_initialized: bool,
    pub nullifier: [u8; 32],
    pub used: bool,
    pub timestamp: i64,
}

impl NullifierSet {
    pub const LEN: usize = 1 + 32 + 1 + 8;
}
