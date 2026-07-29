"use client";

import React from 'react';
import { LayoutDashboard, List, BarChart3, LogOut } from 'lucide-react';
import type { User, Area } from '@/lib/types';
import { capitalize } from '@/lib/categories';

type NavPage = 'dashboard' | 'list' | 'stats';

interface LayoutProps {
  currentUser: User;
  area: Area;
  page: NavPage;
  onAreaChange: (area: Area) => void;
  onPageChange: (page: NavPage) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({
  currentUser, area, page, onAreaChange, onPageChange, onLogout, children
}: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 20px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
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
          <div style={{
            display: 'flex',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 3,
            gap: 2,
          }}>
            {(['private', 'shared'] as Area[]).map(a => (
              <button
                key={a}
                onClick={() => onAreaChange(a)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 7,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'var(--t-base)',
                  background: area === a
                    ? (a === 'private' ? 'var(--accent)' : 'var(--teal)')
                    : 'transparent',
                  color: area === a ? '#0D0F14' : 'var(--text-secondary)',
                }}
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
                background: area === 'private' ? 'var(--accent)' : 'var(--teal)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: '#0D0F14',
              }}>
                {currentUser[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{capitalize(currentUser)}</span>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-ghost btn-sm"
              title="Abmelden"
              style={{ padding: '5px 8px' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 20px' }}>
        {/* Sidebar Nav */}
        <nav style={{
          width: 52,
          flexShrink: 0,
          paddingTop: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          position: 'sticky',
          top: 84,
          height: 'calc(100vh - 84px)',
        }}>
          {([
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'list', icon: List, label: 'Belege' },
            { id: 'stats', icon: BarChart3, label: 'Statistiken' },
          ] as { id: NavPage; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onPageChange(id)}
              title={label}
              style={{
                width: 40, height: 40,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: page === id ? (area === 'private' ? 'var(--accent-bg)' : 'var(--teal-bg)') : 'transparent',
                color: page === id
                  ? (area === 'private' ? 'var(--accent)' : 'var(--teal)')
                  : 'var(--text-muted)',
                transition: 'var(--t-base)',
              }}
            >
              <Icon size={18} />
            </button>
          ))}
        </nav>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0, padding: '24px 0 24px 16px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
