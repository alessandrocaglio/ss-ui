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
    render(<YamlPreview sealResult={null} loading={false} theme="light" />);
    expect(screen.getByText(/Fill out the form/)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<YamlPreview sealResult={null} loading={true} theme="light" />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('renders sealed secret YAML by default', () => {
    render(<YamlPreview sealResult={mockSealResult} loading={false} theme="light" />);
    expect(screen.getByTestId('monaco-mock')).toHaveTextContent('apiVersion: bitnami.com/v1alpha1');
    expect(screen.getByText('my-secret-sealed-secret.yaml')).toBeInTheDocument();
  });

  it('switches to GitOps helper format and includes metadata', () => {
    render(<YamlPreview sealResult={mockSealResult} loading={false} theme="light" />);
    
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

    render(<YamlPreview sealResult={mockSealResult} loading={false} theme="light" />);
    
    const copyBtn = screen.getByText('Copy');
    fireEvent.click(copyBtn);
    
    expect(writeText).toHaveBeenCalled();
  });
});
