"use client";

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, List, CalendarDays, BarChart3, Tags, LogOut, Shield } from 'lucide-react';
import type { User, Area } from '@/lib/types';
import { capitalize } from '@/lib/categories';
import { InstallButton } from './PwaInstaller';

type NavPage = 'dashboard' | 'list' | 'month' | 'stats' | 'categories';

const NAV_ITEMS: { id: NavPage; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'list', icon: List, label: 'Belege' },
  { id: 'month', icon: CalendarDays, label: 'Monat' },
  { id: 'stats', icon: BarChart3, label: 'Statistik' },
  { id: 'categories', icon: Tags, label: 'Kategorien' },
];

interface LayoutProps {
  currentUser: User;
  area: Area;
  page: NavPage;
  isAdmin?: boolean;
  onAreaChange: (area: Area) => void;
  onPageChange: (page: NavPage) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({
  currentUser, area, page, isAdmin, onAreaChange, onPageChange, onLogout, children
}: LayoutProps) {
  const accent = area === 'private' ? 'var(--accent)' : 'var(--teal)';

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--accent)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 14,
              color: '#0D0F14',
            }}>B</div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
              BelegBot
            </span>
          </div>

          {/* Area Toggle */}
          <div className="segmented">
            {(['private', 'shared'] as Area[]).map(a => (
              <button
                key={a}
                onClick={() => onAreaChange(a)}
                className="segmented-item"
                style={area === a
                  ? { background: a === 'private' ? 'var(--accent)' : 'var(--teal)', color: '#0D0F14' }
                  : undefined}
              >
                {a === 'private' ? 'Privat' : 'Gemeinsam'}
              </button>
            ))}
          </div>

          {/* User + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 100,
            }}>
              <div style={{
                width: 22, height: 22,
                background: accent,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: '#0D0F14',
              }}>
                {currentUser[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{capitalize(currentUser)}</span>
            </div>
            <InstallButton />
            <button
              onClick={onLogout}
              className="btn btn-ghost btn-sm"
              title="Abmelden"
              aria-label="Abmelden"
              style={{ padding: '5px 8px' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="app-body">
        {/* Navigation: Icon-Rail auf Desktop, Tab-Bar am unteren Rand auf Mobile */}
        <nav className="app-nav">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onPageChange(id)}
              title={label}
              aria-current={page === id ? 'page' : undefined}
              className="app-nav-item"
              style={page === id ? {
                background: area === 'private' ? 'var(--accent-bg)' : 'var(--teal-bg)',
                color: accent,
              } : undefined}
            >
              <Icon size={18} />
              <span className="app-nav-label">{label}</span>
            </button>
          ))}

          {isAdmin && (
            <Link href="/admin" title="Admin" className="app-nav-item app-nav-item-admin">
              <Shield size={18} />
              <span className="app-nav-label">Admin</span>
            </Link>
          )}
        </nav>

        {/* Content */}
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
