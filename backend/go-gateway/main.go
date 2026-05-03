package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

type GatewayResponse struct {
	Authorized bool   `json:"authorized"`
	ShieldUID  string `json:"shield_uid"`
	Node       string `json:"active_node"`
	Latency    string `json:"latency"`
}

// Go Gateway: Définit les politiques de sécurité pour Admin et Client
func main() {
	mux := http.NewServeMux()

	// Intercepteur Global de Sécurité
	mux.HandleFunc("/api/gateway/check", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		authHeader := r.Header.Get("Authorization")
		shieldToken := r.Header.Get("X-KONTROL-SHIELD")
		
		isAuthorized := false
		// Validation renforcée : on exige le Shield Token pour les accès sensibles
		if strings.HasPrefix(r.URL.Path, "/admin") && shieldToken == "HARDENED" {
			isAuthorized = true
		} else if authHeader != "" {
			isAuthorized = true
		}

		resp := GatewayResponse{
			Authorized: isAuthorized,
			ShieldUID:  "RUST-INT-GUARD-0x99",
			Node:       "GO-GATEWAY-A1",
			Latency:    time.Since(start).String(),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	log.Println("Go Gateway Server ready on port 8081")
}
