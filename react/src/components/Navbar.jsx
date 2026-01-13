import React from 'react';
import { Link } from 'react-router-dom';

function useLogoFallbackCallback() {
  return React.useCallback((event) => {
    const img = event.currentTarget;
    try {
      const candidates = [
        '/recshop_logo.jpg','/recshop_logo.png','/logo_recshop.png','/logo_recshop.jpg','/recshop.png','/logo.png'
      ];
      const idx = +(img.dataset.try||0);
      if(idx < candidates.length){
        img.dataset.try = idx + 1;
        img.src = candidates[idx];
        return;
      }
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">\
<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#0A74FF"/><stop offset="55%" stop-color="#7B3FE4"/><stop offset="100%" stop-color="#00C389"/></linearGradient></defs>\
<rect rx="12" ry="12" width="320" height="100" fill="#ffffff"/>\
<text x="20" y="58" font-family="Inter,Segoe UI,Arial" font-size="48" font-weight="700" fill="url(#g)">REC</text>\
<text x="20" y="88" font-family="Inter,Segoe UI,Arial" font-size="24" font-weight="700" fill="url(#g)">RECSHOP</text>\
<g transform="translate(200,30)">\
  <path d="M0 20 h58" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/>\
  <circle cx="58" cy="16" r="6" fill="url(#g)"/>\
  <circle cx="58" cy="28" r="6" fill="url(#g)"/>\
  <rect x="38" y="12" width="16" height="16" rx="3" fill="url(#g)"/>\
  <rect x="42" y="16" width="8" height="8" rx="2" fill="#fff"/>\
  <path d="M16 4 l8 -8" stroke="#00C389" stroke-width="4" stroke-linecap="round"/>\
  <path d="M24 4 l8 -8" stroke="#00C389" stroke-width="4" stroke-linecap="round"/>\
</g></svg>';
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    } catch (_e) {
      // ignore
    }
  }, []);
}

function UserMenu({ user, onLogout }) {
  if (!user) {
    return (
      <Link className="btn btn-sm btn-outline-secondary" to="/login">Entrar</Link>
    );
  }
  const label = `${user.nome || user.email} • ${user.role || ''}`.trim();
  return (
    <div className="dropdown">
      <button className="btn btn-link dropdown-toggle text-decoration-none small" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        {label}
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        <li><Link className="dropdown-item" to="/conta"><i className="bi bi-person"></i> Minha conta</Link></li>
        <li><hr className="dropdown-divider" /></li>
        <li><button className="dropdown-item" onClick={onLogout}><i className="bi bi-box-arrow-right"></i> Sair</button></li>
      </ul>
    </div>
  );
}

export default function Navbar({ user, onLogout, theme, onToggleTheme }) {
  const onLogoError = useLogoFallbackCallback();
  const role = user?.role || 'guest';
  const items = React.useMemo(() => {
    if (role === 'driver') {
      return [
        { to: '/buscar', label: 'Buscar' },
        { to: '/sessao', label: 'Sessão' },
        { to: '/historico', label: 'Histórico' },
        { to: '/veiculos', label: 'Veículos' }
      ];
    }
    if (role === 'admin') {
      return [
        { to: '/buscar', label: 'Buscar' },
        { to: '/sessao', label: 'Sessão' },
        { to: '/historico', label: 'Histórico' },
        { to: '/veiculos', label: 'Veículos' },
        { to: '/estacoes', label: 'Estação de Recarga' },
        { to: '/usuarios', label: 'Usuários' }
      ];
    }
    // padrão genérico
    return [
      { to: '/buscar', label: 'Buscar' },
      { to: '/conta', label: 'Conta' },
      { to: '/historico', label: 'Historico' }
    ];
  }, [role]);
  return (
    <nav className="navbar navbar-expand-lg border-bottom sticky-top bg-body">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/buscar">
          <img src="/logo_recshop.jpg" alt="RECSHOP" onError={onLogoError} />
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div id="nav" className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto" id="menu">
            {items.map((it) => (
              <li key={it.to} className="nav-item"><Link className="nav-link" to={it.to}>{it.label}</Link></li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-3">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="themeToggle" checked={theme==='dark'} onChange={onToggleTheme} />
              <label className="form-check-label small" htmlFor="themeToggle"><i className="bi bi-sun"></i> / <i className="bi bi-moon"></i></label>
            </div>
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </nav>
  );
}

