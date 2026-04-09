package handler

import (
	"context"
	"crypto/rsa"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"ss-ui/internal/certprovider"
	"ss-ui/internal/sealer"
)

type SealHandler struct {
	manager *certprovider.CertManager
	sealer  *sealer.SealerImpl
}

func NewSealHandler(m *certprovider.CertManager, s *sealer.SealerImpl) *SealHandler {
	return &SealHandler{manager: m, sealer: s}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]interface{}{
			"code":    code,
			"message": message,
		},
	})
}

func (h *SealHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req sealer.SealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid JSON payload")
		return
	}

	if req.SecretYaml == "" && (req.Name == "" || req.Namespace == "") {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and Namespace are required unless secretYaml is provided")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cert, err := h.manager.GetActiveCert(ctx)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "CERT_UNAVAILABLE", "No certificate source configured. Upload one via the UI or set CERT_FILE / CERT_URL.")
		return
	}

	pubKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		writeError(w, http.StatusInternalServerError, "SEAL_FAILED", "Active certificate does not contain an RSA public key")
		return
	}

	yamlOutput, encryptedData, err := h.sealer.Seal(ctx, req, pubKey)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "SEAL_FAILED", err.Error())
		return
	}

	// Filename derived from name
	filename := fmt.Sprintf("%s-sealed-secret.yaml", req.Name)
	if req.Name == "" {
		filename = "sealed-secret.yaml"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"yaml":          string(yamlOutput),
		"filename":      filename,
		"name":          req.Name,
		"encryptedData": encryptedData,
	})
}
