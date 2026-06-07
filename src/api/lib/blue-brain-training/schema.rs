// KONTROL BLUE AI — COGNITIVE LEARNING REGISTRY (RUST MODEL)
// Path: /src/api/lib/blue-brain-training/schema.rs
// Implements secure, memory-safe, and immutable learning nodes for Rust-based system pipelines.

use serde::{Serialize, Deserialize};
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TrainingSource {
    SystemAutomated,
    UserFeedback,
    ExpertInjection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlueBrainTrainingPair {
    pub id: String,
    pub prompt: String,
    pub response: String,
    pub category: String,
    pub source: TrainingSource,
    pub confidence: f64,
    pub security_hash: String, // Validates payload with Rust cryptographic signature
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveIndex {
    pub id: String,
    pub module_key: String,
    pub index_name: String,
    pub record_count: u32,
    pub last_indexed_at: u64,
}

pub struct SecurityShield;

impl SecurityShield {
    /// Validates the training pair integrity using a secure cryptographic SHA256 checksum
    /// preventing malicious injections into Blue's core long-term neural memory.
    pub fn verify_signature(pair: &BlueBrainTrainingPair, secret_key: &str) -> bool {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;

        type HmacSha256 = Hmac<Sha256>;

        let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
            .expect("HMAC keys can be of any size");
        
        let payload = format!("{}:{}:{}:{:?}", pair.id, pair.prompt, pair.response, pair.source);
        mac.update(payload.as_bytes());
        
        let result = mac.finalize();
        let expected_bytes = result.into_bytes();
        let expected_hex = hex::encode(expected_bytes);

        pair.security_hash == expected_hex
    }
}
