package certprovider

import (
	"context"
	"crypto/x509"
	"errors"
	"log/slog"
	"sync"
)

var (
	ErrSourceNotAvailable = errors.New("requested certificate source is not available")
	ErrCertUnavailable    = errors.New("no certificate source configured")
)

type CertManager struct {
	upload     *UploadProvider
	file       *FileProvider
	controller *ControllerProvider
	active     CertProvider
	mu         sync.RWMutex
}

func NewCertManager(
	upload *UploadProvider,
	file *FileProvider,
	controller *ControllerProvider,
) *CertManager {
	return &CertManager{
		upload:     upload,
		file:       file,
		controller: controller,
	}
}

func (m *CertManager) Init() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.upload.IsAvailable() {
		m.active = m.upload
	} else if m.file.IsAvailable() {
		m.active = m.file
	} else if m.controller.IsAvailable() {
		m.active = m.controller
	} else {
		m.active = nil
		slog.Warn("No certificate source is available at startup. Seal operations will fail until a certificate is configured.")
	}
	return nil
}

func (m *CertManager) GetActiveCert(ctx context.Context) (*x509.Certificate, error) {
	m.mu.RLock()
	active := m.active
	m.mu.RUnlock()

	if active == nil {
		return nil, ErrCertUnavailable
	}
	return active.GetCert(ctx)
}

func (m *CertManager) GetActivePEM(ctx context.Context) ([]byte, error) {
	m.mu.RLock()
	active := m.active
	m.mu.RUnlock()

	if active == nil {
		return nil, ErrCertUnavailable
	}
	return active.GetPEM(ctx)
}

func (m *CertManager) ActiveSourceName() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.active == nil {
		return "none"
	}
	return m.active.Name()
}

func (m *CertManager) AvailableSources() []string {
	var sources []string
	if m.file.IsAvailable() {
		sources = append(sources, "file")
	}
	if m.controller.IsAvailable() {
		sources = append(sources, "controller")
	}
	if m.upload.IsAvailable() {
		sources = append(sources, "upload")
	}
	return sources
}

func (m *CertManager) SetSource(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var target CertProvider
	switch name {
	case "upload":
		target = m.upload
	case "file":
		target = m.file
	case "controller":
		target = m.controller
	default:
		return ErrSourceNotAvailable
	}

	if !target.IsAvailable() {
		return ErrSourceNotAvailable
	}

	m.active = target
	return nil
}

func (m *CertManager) SetUploadedCert(pem []byte) error {
	if err := m.upload.Set(pem); err != nil {
		return err
	}
	return m.SetSource("upload")
}

func (m *CertManager) RefreshController(ctx context.Context) error {
	if !m.controller.IsAvailable() {
		return ErrSourceNotAvailable
	}
	return m.controller.Refresh(ctx)
}
