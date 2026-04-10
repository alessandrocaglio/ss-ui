import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { YamlPreview } from './YamlPreview';
import type { SealResponse } from '../../types/api';

// Mock Monaco Editor as it doesn't work well in JSDOM
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => <div data-testid="monaco-mock">{value}</div>
}));

describe('YamlPreview', () => {
  const mockSealResult: SealResponse = {
    yaml: 'apiVersion: bitnami.com/v1alpha1\nkind: SealedSecret\nmetadata:\n  name: my-secret',
    filename: 'my-secret-sealed-secret.yaml',
    name: 'my-secret',
    encryptedData: {
      key1: 'VAL1'
    },
    labels: {
      app: 'test'
    },
    annotations: {
      note: 'hello'
    }
  };

  it('renders default message when no sealResult is provided', () => {
    render(<YamlPreview sealResult={null} lastRequest={null} certInfo={null} loading={false} theme="light" showValues={false} />);
    expect(screen.getByText(/Fill out the form/)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<YamlPreview sealResult={null} lastRequest={null} certInfo={null} loading={true} theme="light" showValues={false} />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('renders sealed secret YAML by default', () => {
    render(<YamlPreview sealResult={mockSealResult} lastRequest={null} certInfo={null} loading={false} theme="light" showValues={false} />);
    expect(screen.getByTestId('monaco-mock')).toHaveTextContent('apiVersion: bitnami.com/v1alpha1');
    expect(screen.getByText('my-secret-sealed-secret.yaml')).toBeInTheDocument();
  });

  it('switches to GitOps helper format and includes metadata', () => {
    render(<YamlPreview sealResult={mockSealResult} lastRequest={null} certInfo={null} loading={false} theme="light" showValues={false} />);
    
    const gitopsRadio = screen.getByLabelText('GitOps helper');
    fireEvent.click(gitopsRadio);
    
    const output = screen.getByTestId('monaco-mock').textContent;
    expect(output).toContain('- name: my-secret');
    expect(output).toContain('labels:');
    expect(output).toContain('app: test');
    expect(output).toContain('annotations:');
    expect(output).toContain('note: hello');
    expect(output).toContain('data:');
    expect(output).toContain('key1: VAL1');
  });

  it('handles copy to clipboard', () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', {
      clipboard: { writeText }
    });

    render(<YamlPreview sealResult={mockSealResult} lastRequest={null} certInfo={null} loading={false} theme="light" showValues={false} />);
    
    const copyBtn = screen.getByText('Copy');
    fireEvent.click(copyBtn);
    
    expect(writeText).toHaveBeenCalled();
  });

  it('generates CLI command with actual values when showValues is true', () => {
    const mockRequest = {
      name: 'my-secret',
      namespace: 'test-ns',
      type: 'Opaque',
      data: { 'password': 'super-secret-value' },
      scope: 'strict' as const,
    };

    const { rerender } = render(
      <YamlPreview 
        sealResult={mockSealResult} 
        lastRequest={mockRequest} 
        certInfo={null} 
        loading={false} 
        theme="light" 
        showValues={false} 
      />
    );

    // Expand CLI section
    const toggleBtn = screen.getByText('Equivalent CLI Command');
    fireEvent.click(toggleBtn);

    // Should contain '...'
    expect(screen.getByText(/--from-literal=password='...'/)).toBeInTheDocument();

    // Rerender with reveal enabled
    rerender(
      <YamlPreview 
        sealResult={mockSealResult} 
        lastRequest={mockRequest} 
        certInfo={null} 
        loading={false} 
        theme="light" 
        showValues={true} 
      />
    );

    // Should contain actual value
    expect(screen.getByText(/--from-literal=password='super-secret-value'/)).toBeInTheDocument();
  });
});
