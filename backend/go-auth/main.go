package main

import (
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

func handleAuth(w http.ResponseWriter, r *http.Request) {
	// Simple simulated auth token service
	token := fmt.Sprintf("KONTROL_%d", time.Now().UnixNano())
	resp := TokenResponse{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
		Status:    "AUTHORIZED_BY_GO_KERNEL",
	}

	w.Header().Set("Content-Type", "application/json")
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
