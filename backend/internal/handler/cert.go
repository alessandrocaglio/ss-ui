package handler

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"ss-ui/internal/certprovider"
)

type CertHandler struct {
	manager *certprovider.CertManager
}

func NewCertHandler(m *certprovider.CertManager) *CertHandler {
	return &CertHandler{manager: m}
}

func (h *CertHandler) GetCert(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cert, err := h.manager.GetActiveCert(ctx)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "CERT_UNAVAILABLE", "No certificate source is available.")
		return
	}

	pemBytes, _ := h.manager.GetActivePEM(ctx)
	fingerprint := fmt.Sprintf("SHA256:%x", sha256.Sum256(cert.Raw))

	resp := map[string]interface{}{
		"source":           h.manager.ActiveSourceName(),
		"pem":              string(pemBytes),
		"fingerprint":      fingerprint,
		"expiresAt":        cert.NotAfter.Format(time.RFC3339),
		"availableSources": h.manager.AvailableSources(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *CertHandler) SwitchSource(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Source string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid JSON payload")
		return
	}

	if err := h.manager.SetSource(req.Source); err != nil {
		writeError(w, http.StatusBadRequest, "CERT_SOURCE_NOT_AVAILABLE", err.Error())
		return
	}

	h.GetCert(w, r)
}
