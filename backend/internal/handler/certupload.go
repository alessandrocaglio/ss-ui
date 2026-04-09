package handler

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"ss-ui/internal/certprovider"
)

type CertUploadHandler struct {
	manager *certprovider.CertManager
}

func NewCertUploadHandler(m *certprovider.CertManager) *CertUploadHandler {
	return &CertUploadHandler{manager: m}
}

func (h *CertUploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB limit

	var pemBytes []byte
	var err error

	contentType := r.Header.Get("Content-Type")
	if contentType == "application/json" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Use text/plain or multipart/form-data")
		return
	}

	if err := r.ParseMultipartForm(1 << 20); err == nil {
		file, _, errFile := r.FormFile("cert")
		if errFile != nil {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Missing cert field in form data")
			return
		}
		defer file.Close()
		pemBytes, err = io.ReadAll(file)
	} else {
		pemBytes, err = io.ReadAll(r.Body)
	}

	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Failed to read request body")
		return
	}

	if err := h.manager.SetUploadedCert(pemBytes); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_CERT", err.Error())
		return
	}

	cert, _ := h.manager.GetActiveCert(r.Context())
	fingerprint := fmt.Sprintf("SHA256:%x", sha256.Sum256(cert.Raw))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"source":      "upload",
		"fingerprint": fingerprint,
		"expiresAt":   cert.NotAfter.Format(time.RFC3339),
	})
}
