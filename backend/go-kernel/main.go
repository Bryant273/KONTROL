package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// KONTROL Go Kernel - Core Orchestrator & Auth Service
// This service handles token generation, session management, and caching.

type AuthRequest struct {
	UserID   string `json:"userId"`
	Password string `json:"password"` // Simulated
}

type AuthResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	Status    string    `json:"status"`
	Role      string    `json:"role"`
}

type HealthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Uptime    string    `json:"uptime"`
	Timestamp time.Time `json:"timestamp"`
}

var startTime = time.Now()

func main() {
	http.HandleFunc("/api/v1/auth/login", handleLogin)
	http.HandleFunc("/api/v1/system/health", handleHealth)
	http.HandleFunc("/api/v1/cache/set", handleCacheSet)
	http.HandleFunc("/api/v1/cache/get", handleCacheGet)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("[GO-KERNEL] KONTROL Engine booting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Secret KONTROL Token Logic
	token := fmt.Sprintf("KONTROL_%s_%d", req.UserID, time.Now().Unix())
	
	resp := AuthResponse{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		Status:    "HARDENED",
		Role:      "ADMINISTRATOR",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	resp := HealthResponse{
		Status:    "OPTIMAL",
		Service:   "KONTROL-GO-KERNEL",
		Uptime:    time.Since(startTime).String(),
		Timestamp: time.Now(),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

var inMemoryCache = make(map[string]string)

func handleCacheSet(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	val := r.URL.Query().Get("val")
	if key != "" && val != "" {
		inMemoryCache[key] = val
		fmt.Fprintf(w, "OK")
		return
	}
	http.Error(w, "Key/Val required", http.StatusBadRequest)
}

func handleCacheGet(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if val, ok := inMemoryCache[key]; ok {
		fmt.Fprintf(w, val)
		return
	}
	http.NotFound(w, r)
}
