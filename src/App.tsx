import { useState } from 'react';
import type { User, Area } from './types';
import UserSelector from './components/UserSelector';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReceiptList from './components/ReceiptList';
import Statistics from './components/Statistics';

type Page = 'dashboard' | 'list' | 'stats';

const STORAGE_KEY = 'belegbot_user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return (localStorage.getItem(STORAGE_KEY) as User | null);
  });
  const [area, setArea] = useState<Area>('private');
  const [page, setPage] = useState<Page>('dashboard');

  const handleLogin = (user: User) => {
    localStorage.setItem(STORAGE_KEY, user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setArea('private');
    setPage('dashboard');
  };

  if (!currentUser) {
    return <UserSelector onSelect={handleLogin} />;
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
