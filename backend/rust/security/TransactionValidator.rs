// Rust Security Validator: Transaction Check
pub fn validate_transaction_payload(amount: f64, tx_type: &str) -> bool {
    // Rust guarantees that we don't have buffer overflows when handling high-frequency transactions
    if amount == 0.0 { return false; }
    if tx_type != "INCOME" && tx_type != "EXPENSE" { return false; }
    true
}
