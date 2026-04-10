package handler

import (
	"encoding/json"
	"net/http"

	"ss-ui/internal/certprovider"
)

type HealthHandler struct {
	manager  *certprovider.CertManager
	insecure bool
}

func NewHealthHandler(m *certprovider.CertManager, insecure bool) *HealthHandler {
	return &HealthHandler{manager: m, insecure: insecure}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "ok",
		"version":    "1.0.0",
		"certSource": h.manager.ActiveSourceName(),
		"insecure":   h.insecure,
	})
}
