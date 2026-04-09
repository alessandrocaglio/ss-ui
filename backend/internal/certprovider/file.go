package certprovider

import (
	"context"
	"crypto/x509"
	"fmt"
	"os"
	"sync"
)

type FileProvider struct {
	mu       sync.RWMutex
	filePath string
	cert     *x509.Certificate
	pem      []byte
}

func NewFileProvider(filePath string) *FileProvider {
	return &FileProvider{
		filePath: filePath,
	}
}

func (p *FileProvider) Name() string {
	return "file"
}

func (p *FileProvider) IsAvailable() bool {
	if p.filePath == "" {
		return false
	}
	info, err := os.Stat(p.filePath)
	return err == nil && !info.IsDir()
}

func (p *FileProvider) getFreshCert() (*x509.Certificate, []byte, error) {
	data, err := os.ReadFile(p.filePath)
	if err != nil {
		return nil, nil, fmt.Errorf("ErrCertReadFailed: %w", err)
	}

	cert, err := ParseAndValidatePEM(data)
	if err != nil {
		return nil, nil, err
	}
	return cert, data, nil
}

func (p *FileProvider) GetCert(ctx context.Context) (*x509.Certificate, error) {
	cert, pemBytes, err := p.getFreshCert()
	if err != nil {
		return nil, err
	}
	p.mu.Lock()
	p.cert = cert
	p.pem = pemBytes
	p.mu.Unlock()
	return cert, nil
}

func (p *FileProvider) GetPEM(ctx context.Context) ([]byte, error) {
	_, pemBytes, err := p.getFreshCert()
	if err != nil {
		return nil, err
	}
	p.mu.Lock()
	p.pem = pemBytes
	p.mu.Unlock()
	return pemBytes, nil
}
