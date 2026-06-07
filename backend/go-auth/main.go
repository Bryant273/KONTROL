package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type TokenResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expiresAt"`
	Status    string `json:"status"`
}

type CacheStore struct {
	mu    sync.RWMutex
	items map[string]string
}

func (c *CacheStore) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = value
}

func (c *CacheStore) Get(key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	val, ok := c.items[key]
	return val, ok
}

var globalCache = &CacheStore{items: make(map[string]string)}

// GenerateSecureToken creates a crytographically secure random 256-bit base64-encoded token.
func GenerateSecureToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func handleAuth(w http.ResponseWriter, r *http.Request) {
	// Crytographically secure crypt/rand token generation
	token, err := GenerateSecureToken()
	if err != nil {
		http.Error(w, "Failed to generate security context: secure entropy failure", http.StatusInternalServerError)
		return
	}

	resp := TokenResponse{
		Token:     fmt.Sprintf("KONTROL_SECURE_%s", token),
		ExpiresAt: time.Now().Add(12 * time.Hour).Unix(),
		Status:    "AUTHORIZED_BY_SECURE_GO_KERNEL",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	json.NewEncoder(w).Encode(resp)
}

func handleCache(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if r.Method == "POST" {
		var body map[string]string
		json.NewDecoder(r.Body).Decode(&body)
		if val, ok := body["value"]; ok {
			globalCache.Set(key, val)
			w.WriteHeader(http.StatusOK)
			return
		}
	} else if r.Method == "GET" {
		val, ok := globalCache.Get(key)
		if ok {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"value": val})
			return
		}
	}
	w.WriteHeader(http.StatusNotFound)
}

func main() {
	http.HandleFunc("/auth", handleAuth)
	http.HandleFunc("/cache", handleCache)
	
	port := "4000"
	fmt.Printf("[GO-KERNEL] Starting Auth & Cache Service on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
