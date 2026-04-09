import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SecretForm } from './SecretForm';

describe('SecretForm', () => {
  const mockOnGenerate = vi.fn();

  it('renders correctly with default values', () => {
    render(<SecretForm onGenerate={mockOnGenerate} loading={false} disabled={false} />);
    
    expect(screen.getByText('Form Builder')).toBeInTheDocument();
    expect(screen.getByText('Raw Secret YAML')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my-secret')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('default')).toBeInTheDocument();
  });

  it('switches between Form and Raw YAML tabs', () => {
    render(<SecretForm onGenerate={mockOnGenerate} loading={false} disabled={false} />);
    
    const yamlTab = screen.getByText('Raw Secret YAML');
    fireEvent.click(yamlTab);
    
    expect(screen.getByText('Paste Kubernetes Secret YAML')).toBeInTheDocument();
    
    const formTab = screen.getByText('Form Builder');
    fireEvent.click(formTab);
    
    expect(screen.queryByText('Paste Kubernetes Secret YAML')).not.toBeInTheDocument();
    expect(screen.getByText('Secret Type')).toBeInTheDocument();
  });

  it('updates name and namespace fields', () => {
    render(<SecretForm onGenerate={mockOnGenerate} loading={false} disabled={false} />);
    
    const nameInput = screen.getByPlaceholderText('my-secret') as HTMLInputElement;
    const nsInput = screen.getByPlaceholderText('default') as HTMLInputElement;
    
    fireEvent.change(nameInput, { target: { value: 'test-secret' } });
    fireEvent.change(nsInput, { target: { value: 'test-ns' } });
    
    expect(nameInput.value).toBe('test-secret');
    expect(nsInput.value).toBe('test-ns');
  });

  it('renders metadata extras section when toggled', () => {
    render(<SecretForm onGenerate={mockOnGenerate} loading={false} disabled={false} />);
    
    const toggleButton = screen.getByText('Labels & Annotations');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(screen.getByText('Annotations')).toBeInTheDocument();
    expect(screen.getByText('Add Label')).toBeInTheDocument();
  });
});
