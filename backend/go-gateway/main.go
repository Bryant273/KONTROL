package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type GatewayResponse struct {
	Authorized bool   `json:"authorized"`
	ShieldUID  string `json:"shield_uid"`
	Node       string `json:"active_node"`
	Latency    string `json:"latency"`
	Protected  bool   `json:"protected"`
	Message    string `json:"message,omitempty"`
}

type ClientLimiter struct {
	lastChecked time.Time
	tokens      float64
	capacity    float64
	rate        float64
}

type HardenedGateway struct {
	mu        sync.RWMutex
	limits    map[string]*ClientLimiter
	secretKey []byte
}

func NewHardenedGateway(secret string) *HardenedGateway {
	return &HardenedGateway{
		limits:    make(map[string]*ClientLimiter),
		secretKey: []byte(secret),
	}
}

// CheckLimit checks rate limit concurrently for high throughput using a dynamic token bucket.
func (g *HardenedGateway) CheckLimit(ip string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	limiter, exists := g.limits[ip]
	if !exists {
		limiter = &ClientLimiter{
			lastChecked: time.Now(),
			tokens:      10.0,
			capacity:    10.0,
			rate:        2.0, // 2 tokens per second
		}
		g.limits[ip] = limiter
	}

	now := time.Now()
	elapsed := now.Sub(limiter.lastChecked).Seconds()
	limiter.lastChecked = now

	limiter.tokens += elapsed * limiter.rate
	if limiter.tokens > limiter.capacity {
		limiter.tokens = limiter.capacity
	}

	if limiter.tokens >= 1.0 {
		limiter.tokens -= 1.0
		return true
	}
	return false
}

// GenerateHMAC creates a timing-secure signed token bound to IP and Timestamp
func (g *HardenedGateway) GenerateHMAC(ip string, timestamp int64) string {
	mac := hmac.New(sha256.New, g.secretKey)
	mac.Write([]byte(fmt.Sprintf("%s:%d", ip, timestamp)))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyHMAC validates the incoming token using constant-time comparison to prevent side-channel leaks
func (g *HardenedGateway) VerifyHMAC(ip string, timestamp int64, providedSig string) bool {
	// Replay defense window (limit signature validity to 5 minutes)
	if time.Now().Unix()-timestamp > 300 || timestamp-time.Now().Unix() > 300 {
		return false
	}

	expectedSigBytes := hmac.New(sha256.New, g.secretKey)
	expectedSigBytes.Write([]byte(fmt.Sprintf("%s:%d", ip, timestamp)))
	expectedSig := hex.EncodeToString(expectedSigBytes.Sum(nil))

	return subtle.ConstantTimeCompare([]byte(providedSig), []byte(expectedSig)) == 1
}

func main() {
	gateway := NewHardenedGateway("KONTROL-SHIELD-AES-KEY-2026-PRODUCTION-SECRET-STRING")
	mux := http.NewServeMux()

	// Hardened authentication, token issuance and gateway intercept
	mux.HandleFunc("/api/gateway/shield/identify", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Get real IP (handling reverse proxy if applicable)
		clientIP := r.Header.Get("X-Forwarded-For")
		if clientIP == "" {
			clientIP = r.RemoteAddr
		}
		// Clean port if present
		if idx := strings.LastIndex(clientIP, ":"); idx != -1 {
			clientIP = clientIP[:idx]
		}

		// Rate Limiting
		if !gateway.CheckLimit(clientIP) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(GatewayResponse{
				Authorized: false,
				Node:       "GO-GATEWAY-EDGE-01",
				Latency:    time.Since(start).String(),
				Protected:  true,
				Message:    "Rate limit exceeded. System is under high-frequency shield protection.",
			})
			return
		}

		// Defensive input sanitation against HTTP Header Injection / Manipulation
		userAgent := r.Header.Get("User-Agent")
		for _, invalidChar := range []string{"\r", "\n", "\x00"} {
			if strings.Contains(userAgent, invalidChar) {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
		}

		// Timed, identity-bound token generation
		nowTimestamp := time.Now().Unix()
		signature := gateway.GenerateHMAC(clientIP, nowTimestamp)
		shieldToken := fmt.Sprintf("KONTROL-SEC-v3-%d-%s", nowTimestamp, signature)

		resp := GatewayResponse{
			Authorized: true,
			ShieldUID:  shieldToken,
			Node:       "GO-GATEWAY-EDGE-01",
			Latency:    time.Since(start).String(),
			Protected:  true,
		}

		w.Header().Set("X-KONTROL-SHIELD", shieldToken)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		json.NewEncoder(w).Encode(resp)
	})

	log.Println("KONTROL Go Gateway (Shield Service) starting on port 8081...")
	if err := http.ListenAndServe(":8081", mux); err != nil {
		log.Fatal(err)
	}
}
