package certprovider

import (
	"context"
	"crypto/x509"
)

// CertProvider is the common interface for all certificate sources.
type CertProvider interface {
	Name() string
	IsAvailable() bool
	GetCert(ctx context.Context) (*x509.Certificate, error)
	GetPEM(ctx context.Context) ([]byte, error)
}
