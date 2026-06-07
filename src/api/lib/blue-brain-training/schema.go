// KONTROL BLUE AI — COGNITIVE LEARNING REGISTRY (GO MODEL)
// Path: /src/api/lib/blue-brain-training/schema.go
// Implements concurrent-safe learning schemas and signature verification for Go backend nodes.

package training

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

type TrainingSource string

const (
	SystemAutomated TrainingSource = "SYSTEM"
	UserFeedback    TrainingSource = "USER_FEEDBACK"
	ExpertInjection TrainingSource = "EXPERT_INJECTION"
)

// BlueBrainTrainingPair represents any learned pattern vector
type BlueBrainTrainingPair struct {
	ID           string         `json:"id" db:"id"`
	Prompt       string         `json:"prompt" db:"prompt"`
	Response     string         `json:"response" db:"response"`
	Category     string         `json:"category" db:"category"`
	Source       TrainingSource `json:"source" db:"source"`
	Confidence   float64        `json:"confidence" db:"confidence"`
	SecurityHash string         `json:"security_hash" db:"security_hash"`
	CreatedAt    int64          `json:"created_at" db:"created_at"`
}

// CognitiveIndex gauges current real-time data sync indicators
type CognitiveIndex struct {
	ID            string `json:"id" db:"id"`
	ModuleKey     string `json:"module_key" db:"module_key"`
	IndexName     string `json:"index_name" db:"index_name"`
	RecordCount   int    `json:"record_count" db:"record_count"`
	LastIndexedAt int64  `json:"last_indexed_at" db:"last_indexed_at"`
}

// SecurityShield provides secure validation routines for training collections
type SecurityShield struct{}

// VerifySignature validates a learning frame's signature to block untrusted inputs
func (s *SecurityShield) VerifySignature(pair *BlueBrainTrainingPair, secretKey string) bool {
	h := hmac.New(sha256.New, []byte(secretKey))
	
	// Create secure validation message representation
	message := fmt.Sprintf("%s:%s:%s:%s", pair.ID, pair.Prompt, pair.Response, pair.Source)
	h.Write([]byte(message))
	
	expectedSignature := hex.EncodeToString(h.Sum(nil))
	
	// Safe byte comparison to deter timing attacks
	return hmac.Equal([]byte(pair.SecurityHash), []byte(expectedSignature))
}
