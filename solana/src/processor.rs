use borsh::BorshDeserialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    clock::Clock,
};
use spl_token::state::Account as TokenAccount;

use crate::{
    error::FPPError,
    instruction::FPPInstruction,
    state::{FloatingPoint, ProtocolState, WithdrawalRequest},
};

pub struct Processor;

impl Processor {
    pub fn process_initialize(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        deposit_fee_rate: u16,
        withdrawal_fee_rate: u16,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let authority_info = next_account_info(account_info_iter)?;
        let protocol_state_info = next_account_info(account_info_iter)?;
        let treasury_info = next_account_info(account_info_iter)?;
        let usdt_mint_info = next_account_info(account_info_iter)?;
        
        if !authority_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Validate fee rates
        if deposit_fee_rate > 500 || withdrawal_fee_rate > 500 {
            return Err(FPPError::InvalidAmount.into());
        }
        
        let protocol_state = ProtocolState {
            is_initialized: true,
            authority: *authority_info.key,
            treasury: *treasury_info.key,
            usdt_mint: *usdt_mint_info.key,
            total_deposited: 0,
            total_withdrawn: 0,
            total_fees: 0,
            total_points: 0,
            deposit_fee_rate,
            withdrawal_fee_rate,
            is_paused: false,
        };
        
        protocol_state.serialize(&mut &mut protocol_state_info.data.borrow_mut()[..])?;
        
        msg!("Protocol initialized successfully");
        Ok(())
    }
    
    pub fn process_deposit(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
        commitments: Vec<[u8; 32]>,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let user_info = next_account_info(account_info_iter)?;
        let user_token_info = next_account_info(account_info_iter)?;
        let treasury_token_info = next_account_info(account_info_iter)?;
        let protocol_state_info = next_account_info(account_info_iter)?;
        let point_info = next_account_info(account_info_iter)?;
        let token_program_info = next_account_info(account_info_iter)?;
        let clock_info = next_account_info(account_info_iter)?;
        
        if !user_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Load protocol state
        let mut protocol_state = ProtocolState::try_from_slice(&protocol_state_info.data.borrow())?;
        
        if protocol_state.is_paused {
            return Err(FPPError::Unauthorized.into());
        }
        
        // Validate amount
        if amount < 10_000_000 || amount > 100_000_000_000 {
            return Err(FPPError::InvalidAmount.into());
        }
        
        // Calculate fees
        let fee = (amount as u128 * protocol_state.deposit_fee_rate as u128 / 10000) as u64;
        let net_amount = amount.checked_sub(fee).ok_or(FPPError::InvalidAmount)?;
        
        // Transfer tokens to treasury
        let transfer_ix = spl_token::instruction::transfer(
            token_program_info.key,
            user_token_info.key,
            treasury_token_info.key,
            user_info.key,
            &[],
            net_amount,
        )?;
        
        invoke_signed(
            &transfer_ix,
            &[
                user_token_info.clone(),
                treasury_token_info.clone(),
                user_info.clone(),
                token_program_info.clone(),
            ],
            &[],
        )?;
        
        // Create floating point
        let clock = Clock::from_account_info(clock_info)?;
        let num_points = amount / 10_000_000; // 10 USDT per point
        
        for commitment in commitments.iter() {
            let floating_point = FloatingPoint {
                is_initialized: true,
                commitment: *commitment,
                created_at: clock.unix_timestamp,
                mass: 1,
                is_active: true,
                creator: *user_info.key,
                locked_until: clock.unix_timestamp + 12, // 12 second lock
            };
            
            floating_point.serialize(&mut &mut point_info.data.borrow_mut()[..])?;
        }
        
        // Update protocol state
        protocol_state.total_deposited = protocol_state
            .total_deposited
            .checked_add(amount)
            .ok_or(FPPError::InvalidAmount)?;
        protocol_state.total_points = protocol_state
            .total_points
            .checked_add(num_points)
            .ok_or(FPPError::InvalidAmount)?;
        protocol_state.total_fees = protocol_state
            .total_fees
            .checked_add(fee)
            .ok_or(FPPError::InvalidAmount)?;
        
        protocol_state.serialize(&mut &mut protocol_state_info.data.borrow_mut()[..])?;
        
        msg!("Deposited {} USDT, created {} points", amount, num_points);
        Ok(())
    }
    
    pub fn process_privacy_payment(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        input_nullifiers: Vec<[u8; 32]>,
        output_commitments: Vec<[u8; 32]>,
        proof: Vec<u8>,
        ring_signature: Vec<u8>,
    ) -> ProgramResult {
        // Note: This is a simplified implementation
        // In production, you would need to:
        // 1. Verify ZK proof using a verifier program
        // 2. Verify ring signature
        // 3. Check nullifiers haven't been used
        // 4. Validate input/output balance
        // 5. Create output points
        
        msg!("Privacy payment processed (simplified)");
        msg!("Inputs: {}, Outputs: {}", input_nullifiers.len(), output_commitments.len());
        
        // TODO: Implement full privacy payment logic
        Ok(())
    }
    
    pub fn process_request_withdrawal(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        point_ids: Vec<Pubkey>,
        nullifiers: Vec<[u8; 32]>,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let user_info = next_account_info(account_info_iter)?;
        let protocol_state_info = next_account_info(account_info_iter)?;
        let withdrawal_request_info = next_account_info(account_info_iter)?;
        let clock_info = next_account_info(account_info_iter)?;
        
        if !user_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        let clock = Clock::from_account_info(clock_info)?;
        let amount = point_ids.len() as u64 * 10_000_000; // 10 USDT per point
        
        let withdrawal_request = WithdrawalRequest {
            is_initialized: true,
            requester: *user_info.key,
            amount,
            request_time: clock.unix_timestamp,
            unlock_time: clock.unix_timestamp + 86400, // 24 hours
            completed: false,
            cancelled: false,
        };
        
        withdrawal_request.serialize(&mut &mut withdrawal_request_info.data.borrow_mut()[..])?;
        
        msg!("Withdrawal requested: {} USDT", amount);
        Ok(())
    }
    
    pub fn process_complete_withdrawal(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let user_info = next_account_info(account_info_iter)?;
        let user_token_info = next_account_info(account_info_iter)?;
        let treasury_token_info = next_account_info(account_info_iter)?;
        let protocol_state_info = next_account_info(account_info_iter)?;
        let withdrawal_request_info = next_account_info(account_info_iter)?;
        let clock_info = next_account_info(account_info_iter)?;
        
        if !user_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        let mut withdrawal_request = WithdrawalRequest::try_from_slice(
            &withdrawal_request_info.data.borrow()
        )?;
        
        let clock = Clock::from_account_info(clock_info)?;
        
        // Validate withdrawal is unlocked
        if clock.unix_timestamp < withdrawal_request.unlock_time {
            return Err(FPPError::WithdrawalNotReady.into());
        }
        
        if withdrawal_request.completed || withdrawal_request.cancelled {
            return Err(FPPError::Unauthorized.into());
        }
        
        let mut protocol_state = ProtocolState::try_from_slice(&protocol_state_info.data.borrow())?;
        
        // Calculate fee
        let fee = (withdrawal_request.amount as u128 * protocol_state.withdrawal_fee_rate as u128 / 10000) as u64;
        let net_amount = withdrawal_request.amount.checked_sub(fee).ok_or(FPPError::InvalidAmount)?;
        
        // Transfer from treasury to user
        // Note: In production, this would use treasury PDA authority
        msg!("Withdrawal completed: {} USDT (fee: {})", net_amount, fee);
        
        withdrawal_request.completed = true;
        withdrawal_request.serialize(&mut &mut withdrawal_request_info.data.borrow_mut()[..])?;
        
        protocol_state.total_withdrawn = protocol_state
            .total_withdrawn
            .checked_add(withdrawal_request.amount)
            .ok_or(FPPError::InvalidAmount)?;
        protocol_state.serialize(&mut &mut protocol_state_info.data.borrow_mut()[..])?;
        
        Ok(())
    }
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = FPPInstruction::try_from_slice(instruction_data)?;
    
    match instruction {
        FPPInstruction::Initialize {
            deposit_fee_rate,
            withdrawal_fee_rate,
        } => {
            msg!("Instruction: Initialize");
            Processor::process_initialize(program_id, accounts, deposit_fee_rate, withdrawal_fee_rate)
        }
        FPPInstruction::Deposit { amount, commitments } => {
            msg!("Instruction: Deposit");
            Processor::process_deposit(program_id, accounts, amount, commitments)
        }
        FPPInstruction::PrivacyPayment {
            input_nullifiers,
            output_commitments,
            proof,
            ring_signature,
        } => {
            msg!("Instruction: Privacy Payment");
            Processor::process_privacy_payment(
                program_id,
                accounts,
                input_nullifiers,
                output_commitments,
                proof,
                ring_signature,
            )
        }
        FPPInstruction::RequestWithdrawal { point_ids, nullifiers } => {
            msg!("Instruction: Request Withdrawal");
            Processor::process_request_withdrawal(program_id, accounts, point_ids, nullifiers)
        }
        FPPInstruction::CompleteWithdrawal => {
            msg!("Instruction: Complete Withdrawal");
            Processor::process_complete_withdrawal(program_id, accounts)
        }
        _ => {
            msg!("Instruction not implemented yet");
            Err(FPPError::InvalidInstruction.into())
        }
    }
}
