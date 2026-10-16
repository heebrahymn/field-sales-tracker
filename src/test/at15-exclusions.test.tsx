import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthProvider } from '@/context/AuthContext';

describe('AT-15 Strict MVP Exclusions Verification', () => {
  it('Desktop sidebar does not contain quotations, orders, pipelines, or task reminders', () => {
    render(
      <AuthProvider>
        <DesktopSidebar activeSection="dashboard" onSelectSection={() => {}} />
      </AuthProvider>
    );

    const forbiddenTerms = [
      /quotation/i,
      /quote/i,
      /sales pipeline/i,
      /opportunity/i,
      /revenue/i,
      /follow-up task/i,
      /order tracking/i,
      /invoicing/i,
    ];

    forbiddenTerms.forEach((term) => {
      expect(screen.queryByText(term)).toBeNull();
    });
  });

  it('Mobile bottom nav does not contain commercial order or quote tabs', () => {
    render(
      <MobileBottomNav activeTab="home" onTabChange={() => {}} />
    );

    expect(screen.queryByText(/quote/i)).toBeNull();
    expect(screen.queryByText(/order/i)).toBeNull();
    expect(screen.queryByText(/task/i)).toBeNull();
    expect(screen.queryByText(/lead/i)).toBeNull();
  });
});
