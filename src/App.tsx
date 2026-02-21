import { useState, useEffect, useCallback } from 'react';
import type { User, Area, Receipt } from './types';
import { supabase } from './config/supabase';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReceiptList from './components/ReceiptList';
import Statistics from './components/Statistics';

type Page = 'dashboard' | 'list' | 'stats';

const LENA_EMAIL = 'reising.lena@web.de';

function emailToUser(email: string): User {
  return email === LENA_EMAIL ? 'lena' : 'moritz';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState<Area>('private');
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setCurrentUser(emailToUser(session.user.email));
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setCurrentUser(emailToUser(session.user.email));
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createReceipt = useCallback(async (data: Partial<Receipt>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('receipts')
        .insert({
          ...data,
          owner: currentUser,
          extraction_confidence: null,
          file_path: null,
          telegram_message_id: null,
          telegram_user_id: null,
        });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }, [currentUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setArea('private');
    setPage('dashboard');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)', color: 'var(--text-muted)', fontSize: '0.9rem',
      }}>
        Laden…
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm />;
  }

  return (
    <Layout
      currentUser={currentUser}
      area={area}
      page={page}
      onAreaChange={a => { setArea(a); setPage('dashboard'); }}
      onPageChange={setPage}
      onLogout={handleLogout}
    >
      {page === 'dashboard' && (
        <Dashboard
          currentUser={currentUser}
          area={area}
          onNavigateToList={() => setPage('list')}
          onCreate={createReceipt}
        />
      )}
      {page === 'list' && (
        <ReceiptList currentUser={currentUser} area={area} />
      )}
      {page === 'stats' && (
        <Statistics currentUser={currentUser} area={area} />
      )}
    </Layout>
  );
}
