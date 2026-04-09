package certprovider

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"
)

var ErrCertFetchFailed = errors.New("failed to fetch certificate from controller")

type ControllerProvider struct {
	mu        sync.RWMutex
	url       string
	cacheTTL  time.Duration
	cert      *x509.Certificate
	pem       []byte
	lastFetch time.Time
}

func NewControllerProvider(certURL, name, namespace string, ttl time.Duration) *ControllerProvider {
	url := certURL
	if url == "" {
		// Detect if in-cluster
		if _, err := os.Stat("/var/run/secrets/kubernetes.io/serviceaccount/token"); err == nil {
			url = fmt.Sprintf("http://%s.%s.svc.cluster.local:8080/v1/cert.pem", name, namespace)
		}
	}
	return &ControllerProvider{
		url:      url,
		cacheTTL: ttl,
	}
}

func (p *ControllerProvider) Name() string {
	return "controller"
}

func (p *ControllerProvider) IsAvailable() bool {
	return p.url != ""
}

func (p *ControllerProvider) Refresh(ctx context.Context) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.fetch(ctx)
}

func (p *ControllerProvider) fetch(ctx context.Context) error {
	if p.url == "" {
		return ErrCertFetchFailed
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.url, nil)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrCertFetchFailed, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: HTTP %d", ErrCertFetchFailed, resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	cert, err := ParseAndValidatePEM(data)
	if err != nil {
		return err
	}

	p.cert = cert
	p.pem = data
	p.lastFetch = time.Now()

	// 30 day warning
	if time.Until(cert.NotAfter) < 30*24*time.Hour {
		slog.Warn("Fetched certificate expires soon", "expires_at", cert.NotAfter)
	}

	return nil
}

func (p *ControllerProvider) ensureValidCache(ctx context.Context) error {
	p.mu.RLock()
	expired := p.lastFetch.IsZero() || time.Since(p.lastFetch) > p.cacheTTL
	p.mu.RUnlock()

	if expired {
		p.mu.Lock()
		defer p.mu.Unlock()
		if p.lastFetch.IsZero() || time.Since(p.lastFetch) > p.cacheTTL {
			if err := p.fetch(ctx); err != nil {
				if p.cert != nil {
					slog.Warn("Failed to refresh cert, utilizing stale cache", "err", err, "url", p.url)
					return nil
				}
				slog.Warn("Failed to fetch cert", "err", err, "url", p.url)
				return err
			}
		}
	}
	return nil
}

func (p *ControllerProvider) GetCert(ctx context.Context) (*x509.Certificate, error) {
	if err := p.ensureValidCache(ctx); err != nil {
		return nil, err
	}
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.cert, nil
}

func (p *ControllerProvider) GetPEM(ctx context.Context) ([]byte, error) {
	if err := p.ensureValidCache(ctx); err != nil {
		return nil, err
	}
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.pem, nil
}
