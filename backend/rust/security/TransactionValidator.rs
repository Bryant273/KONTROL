use std::sync::atomic::{AtomicU64, Ordering};

// Global telemetry registry tracked concurrently with zero locking bottleneck
pub static TOTAL_VALIDATED_CENTIMES: AtomicU64 = AtomicU64::new(0);
pub static REJECTED_TX_ATTEMPTS: AtomicU64 = AtomicU64::new(0);

// Rust Security Validator: High-Frequency, Lock-Free Transaction Check
pub fn validate_transaction_payload(amount: f64, tx_type: &str) -> bool {
    if amount <= 0.0 { 
        REJECTED_TX_ATTEMPTS.fetch_add(1, Ordering::Relaxed);
        return false; 
    }
    if tx_type != "INCOME" && tx_type != "EXPENSE" { 
        REJECTED_TX_ATTEMPTS.fetch_add(1, Ordering::Relaxed);
        return false; 
    }
    
    // Represent as integer copper/centimes (u64) to prevent professional IEEE-754 decimal drift
    let centimes = (amount * 100.0).round() as u64;
    
    // Thread-safe update utilizing SeqCst memory ordering guarantees
    TOTAL_VALIDATED_CENTIMES.fetch_add(centimes, Ordering::SeqCst);
    true
}

