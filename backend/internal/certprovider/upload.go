package certprovider

import (
	"context"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"sync"
	"time"
)

var (
	ErrInvalidCert = errors.New("PEM does not contain a valid RSA certificate")
	ErrCertExpired = errors.New("certificate is expired")
)

type UploadProvider struct {
	mu   sync.RWMutex
	pem  []byte
	cert *x509.Certificate
}

func NewUploadProvider() *UploadProvider {
	return &UploadProvider{}
}

func (p *UploadProvider) Name() string {
	return "upload"
}

func (p *UploadProvider) IsAvailable() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.cert != nil
}

func (p *UploadProvider) GetCert(ctx context.Context) (*x509.Certificate, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.cert, nil
}

func (p *UploadProvider) GetPEM(ctx context.Context) ([]byte, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.pem, nil
}

func (p *UploadProvider) Set(pemBytes []byte) error {
	cert, err := ParseAndValidatePEM(pemBytes)
	if err != nil {
		return err
	}

	p.mu.Lock()
	p.pem = pemBytes
	p.cert = cert
	p.mu.Unlock()
	return nil
}

func (p *UploadProvider) Clear() {
	p.mu.Lock()
	p.pem = nil
	p.cert = nil
	p.mu.Unlock()
}

// ParseAndValidatePEM validates uniform rules across all providers
func ParseAndValidatePEM(pemBytes []byte) (*x509.Certificate, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil || block.Type != "CERTIFICATE" {
		return nil, ErrInvalidCert
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, err
	}

	// Wait, standard crypto/rsa used by bitnami
	// Need to check for RSA pk
	if cert.PublicKeyAlgorithm != x509.RSA {
		return nil, ErrInvalidCert
	}

	if time.Now().After(cert.NotAfter) {
		return nil, ErrCertExpired
	}

	return cert, nil
}
