import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CertificatePanel } from './CertificatePanel';
import type { CertInfo } from '../../types/api';

describe('CertificatePanel', () => {
  const mockCertInfo: CertInfo = {
    source: 'controller',
    pem: '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----',
    fingerprint: 'SHA256:123',
    expiresAt: '2026-06-01T00:00:00Z',
    availableSources: ['controller', 'upload']
  };

  const mockSwitchSource = vi.fn();
  const mockUploadCertText = vi.fn();

  it('renders active status correctly', async () => {
    render(<CertificatePanel certInfo={mockCertInfo} switchSource={mockSwitchSource} uploadCertText={mockUploadCertText} />);
    expect(screen.getByText('Active: controller')).toBeInTheDocument();
    expect(await screen.findByText(/SHA256:123/)).toBeInTheDocument();
  });

  it('renders no certificate status when certInfo is null', () => {
    render(<CertificatePanel certInfo={null} switchSource={mockSwitchSource} uploadCertText={mockUploadCertText} />);
    expect(screen.getByText('No Certificate')).toBeInTheDocument();
  });

  it('disables source buttons that are not available', () => {
    render(<CertificatePanel certInfo={mockCertInfo} switchSource={mockSwitchSource} uploadCertText={mockUploadCertText} />);
    
    // Controller is available
    const controllerBtn = screen.getByText('Controller');
    expect(controllerBtn).not.toBeDisabled();
    
    // File is not available in mockCertInfo
    const fileBtn = screen.getByText('File (Not configured)');
    expect(fileBtn).toBeDisabled();
  });

  it('switches tabs and calls switchSource when clicking an available source', () => {
    render(<CertificatePanel certInfo={mockCertInfo} switchSource={mockSwitchSource} uploadCertText={mockUploadCertText} />);
    
    const uploadBtn = screen.getByText('Upload manually');
    fireEvent.click(uploadBtn);
    
    // Should show upload area
    expect(screen.getByPlaceholderText(/-----BEGIN CERTIFICATE-----/)).toBeInTheDocument();
    
    // Switch back to controller
    const controllerBtn = screen.getByText('Controller');
    fireEvent.click(controllerBtn);
    expect(mockSwitchSource).toHaveBeenCalledWith('controller');
  });

  it('handles certificate text upload', () => {
    render(<CertificatePanel certInfo={mockCertInfo} switchSource={mockSwitchSource} uploadCertText={mockUploadCertText} />);
    
    const uploadTab = screen.getByText('Upload manually');
    fireEvent.click(uploadTab);
    
    const textArea = screen.getByPlaceholderText(/-----BEGIN CERTIFICATE-----/);
    fireEvent.change(textArea, { target: { value: 'NEW CERT' } });
    
    const useBtn = screen.getByText('Use This Certificate');
    fireEvent.click(useBtn);
    
    expect(mockUploadCertText).toHaveBeenCalledWith('NEW CERT');
  });
});
