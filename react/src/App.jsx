import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Login from './routes/Login.jsx';
import Buscar from './routes/Buscar.jsx';
import Conta from './routes/Conta.jsx';
import Historico from './routes/Historico.jsx';
import Minhas from './routes/Minhas.jsx';
import Admin from './routes/Admin.jsx';
import { useStore } from './state/Store.jsx';
import Sessao from './routes/Sessao.jsx';
import Veiculos from './routes/Veiculos.jsx';
import Estacoes from './routes/Estacoes.jsx';
import Usuarios from './routes/Usuarios.jsx';

function useTheme() {
  const [theme, setTheme] = React.useState(() => document.documentElement.getAttribute('data-bs-theme') || 'light');
  React.useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);
  const toggle = React.useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);
  return { theme, toggle };
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { state, actions } = useStore();

  const handleLogout = React.useCallback(() => {
    actions.logout();
  }, [actions]);

  return (
    <div className="bg-body min-vh-100 d-flex flex-column">
      <Navbar
        user={state.user || null}
        onLogout={state.user ? handleLogout : null}
        theme={theme}
        onToggleTheme={toggle}
      />
      <main className="container py-4 flex-grow-1">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/sessao" element={<Sessao />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/veiculos" element={<Veiculos />} />
          <Route path="/estacoes" element={<Estacoes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/minhas" element={<Minhas />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

