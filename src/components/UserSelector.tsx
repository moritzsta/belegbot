import type { User } from '../types';

interface Props {
  onSelect: (user: User) => void;
}

export default function UserSelector({ onSelect }: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 20,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        opacity: 0.5,
      }} />

      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 440, width: '100%' }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64,
          background: 'var(--accent)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: 28,
          color: '#0D0F14',
          margin: '0 auto 20px',
          boxShadow: 'var(--shadow-accent)',
        }}>B</div>

        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}>BelegBot</h1>

        <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: '0.95rem' }}>
          Wer bist du?
        </p>

        {/* User cards */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {(['lena', 'moritz'] as User[]).map(user => (
            <button
              key={user}
              onClick={() => onSelect(user)}
              style={{
                flex: 1,
                maxWidth: 180,
                padding: '28px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                cursor: 'pointer',
                transition: 'var(--t-base)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                fontFamily: 'var(--font-ui)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-accent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 56, height: 56,
                background: user === 'lena' ? 'var(--accent-bg)' : 'var(--teal-bg)',
                border: `2px solid ${user === 'lena' ? 'var(--accent-dim)' : 'var(--teal-dim)'}`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: user === 'lena' ? 'var(--accent)' : 'var(--teal)',
              }}>
                {user[0].toUpperCase()}
              </div>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'var(--text-primary)',
                textTransform: 'capitalize',
              }}>
                {user}
              </span>
            </button>
          ))}
        </div>

        <p style={{ marginTop: 32, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Belege werden automatisch per Telegram-Bot erfasst.
        </p>
      </div>
    </div>
  );
}
