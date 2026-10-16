import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandLogo } from '@/components/brand/BrandLogo';

describe('BrandLogo compliance', () => {
  it('renders official brand logo image pointing to /brand/carbon_logo.png', () => {
    render(<BrandLogo size="md" />);
    const img = screen.getByRole('img', { name: /carbon car care/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/brand/carbon_logo.png');
  });

  it('preserves proportions with object-contain', () => {
    render(<BrandLogo size="lg" />);
    const img = screen.getByRole('img', { name: /carbon car care/i });
    expect(img).toHaveClass('object-contain');
  });
});
