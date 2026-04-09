package handler

import (
	"encoding/json"
	"net/http"

	"ss-ui/internal/certprovider"
)

type HealthHandler struct {
	manager *certprovider.CertManager
}

func NewHealthHandler(m *certprovider.CertManager) *HealthHandler {
	return &HealthHandler{manager: m}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":     "ok",
		"version":    "1.0.0",
		"certSource": h.manager.ActiveSourceName(),
	})
}
