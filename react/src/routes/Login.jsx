import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/Store.jsx';

export default function Login() {
  const { actions, state } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('login'); // 'login' | 'signup'
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');

  const [signupNome, setSignupNome] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [signupRole, setSignupRole] = React.useState('driver');

  const submitLogin = React.useCallback(async (e) => {
    e.preventDefault();
    try {
      await actions.login({ email: loginEmail, password: loginPassword });
      navigate('/buscar', { replace: true });
      // Fallback robusto caso o roteador não navegue imediatamente
      setTimeout(() => {
        const desiredHash = '#/buscar';
        if (location.hash !== desiredHash) {
          const base = `${location.protocol}//${location.host}${location.pathname}`;
          window.location.replace(`${base}${desiredHash}`);
        }
      }, 10);
    } catch (e) {
      alert(e.message || 'Falha no login');
    }
  }, [actions, loginEmail, loginPassword, navigate]);

  const submitSignup = React.useCallback(async (e) => {
    e.preventDefault();
    try {
      await actions.signup({ nome: signupNome, email: signupEmail, password: signupPassword, role: signupRole });
      navigate('/buscar');
    } catch (e) {
      alert(e.message || 'Falha no cadastro');
    }
  }, [actions, navigate, signupEmail, signupRole, signupNome, signupPassword]);

  React.useEffect(() => {
    if (state.user) {
      // Se já estiver logado e vier para /login, redirecionar
      navigate('/buscar', { replace: true });
    }
  }, [state.user, navigate]);

  return (
    <section>
      <div className="text-center mb-4">
        <img src="/logo_recshop.jpg" alt="RECSHOP Logo" className="logo-display" style={{ boxShadow:'0 4px 16px rgba(10,116,255,.15)' }} />
        <h1 className="h3 mt-3 mb-1 brand-title">RECSHOP</h1>
        <p className="text-muted small">Rede de Recarga Inteligente</p>
      </div>

      <div className="rec-hero mb-4" style={{ maxWidth:'520px' }}>
        <h2 className="h5 mb-0"><i className="bi bi-plug"></i> <span>{mode === 'login' ? 'Entrar no RECSHOP' : 'Criar conta no RECSHOP'}</span></h2>
        <div className="small opacity-75">Acesse sua conta ou crie uma nova para começar.</div>
      </div>

      <div className="card shadow-sm" style={{ maxWidth:'520px' }}>
        <div className="card-body">
          <ul className="nav nav-pills nav-justified mb-4">
            <li className="nav-item">
              <a className={`nav-link ${mode==='login' ? 'active' : ''}`} href="#" onClick={(e)=>{e.preventDefault(); setMode('login');}}>
                <i className="bi bi-box-arrow-in-right"></i> Login
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${mode==='signup' ? 'active' : ''}`} href="#" onClick={(e)=>{e.preventDefault(); setMode('signup');}}>
                <i className="bi bi-person-plus"></i> Criar Conta
              </a>
            </li>
          </ul>

          {mode === 'login' ? (
            <form onSubmit={submitLogin}>
              <div className="mb-3">
                <label className="form-label">Email ou Usuário</label>
                <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} type="text" className="form-control" placeholder="Ex.: patricia@email.com" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Senha</label>
                <input value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} type="password" className="form-control" placeholder="Digite sua senha" required />
              </div>
              <div className="d-grid">
                <button className="btn btn-rec" type="submit" disabled={state.loading}><i className="bi bi-box-arrow-in-right"></i> {state.loading ? 'Entrando...' : 'Entrar'}</button>
              </div>
              <div className="text-center mt-3">
                <small className="text-muted">Não tem uma conta? <a href="#" onClick={(e)=>{e.preventDefault(); setMode('signup');}} className="text-decoration-none">Criar conta</a></small>
              </div>
            </form>
          ) : (
            <form onSubmit={submitSignup}>
              <div className="mb-3">
                <label className="form-label">Nome Completo</label>
                <input value={signupNome} onChange={e=>setSignupNome(e.target.value)} className="form-control" placeholder="Ex.: Patrícia Silva" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input value={signupEmail} onChange={e=>setSignupEmail(e.target.value)} type="email" className="form-control" placeholder="patricia@email.com" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Senha</label>
                <input value={signupPassword} onChange={e=>setSignupPassword(e.target.value)} type="password" className="form-control" placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Tipo de Conta</label>
                <select value={signupRole} onChange={e=>setSignupRole(e.target.value)} className="form-select">
                  <option value="driver">Motorista</option>
                  <option value="host">Host / Operador</option>
                  <option value="admin">Administrador</option>
                </select>
                <div className="form-text small-muted">Escolha <b>Motorista</b> para buscar e usar pontos de recarga, ou <b>Host</b> para gerenciar seus próprios pontos.</div>
              </div>
              <div className="d-grid">
                <button className="btn btn-rec" type="submit" disabled={state.loading}><i className="bi bi-person-plus"></i> {state.loading ? 'Criando...' : 'Criar Conta'}</button>
              </div>
              <div className="text-center mt-3">
                <small className="text-muted">Já tem uma conta? <a href="#" onClick={(e)=>{e.preventDefault(); setMode('login');}} className="text-decoration-none">Fazer login</a></small>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="mt-3 small small-muted" style={{ maxWidth:'520px' }}>
        <i className="bi bi-info-circle"></i> <b>Dica:</b> Crie uma conta como <b>Host</b> para gerenciar pontos de recarga e encerrar sessões.
      </div>

      <div className="card mt-3" style={{ maxWidth:'520px' }}>
        <div className="card-header bg-light">
          <small><i className="bi bi-key"></i> <b>Contas de Demonstração</b></small>
        </div>
        <div className="card-body small">
          <div className="row g-2">
            <div className="col-md-6">
              <strong>Motorista:</strong><br />
              Email: <code>maria@email.com</code><br />
              Senha: <code>123456</code>
            </div>
            <div className="col-md-6">
              <strong>Host:</strong><br />
              Email: <code>host1@recshop.com</code><br />
              Senha: <code>host123</code>
            </div>
            <div className="col-md-6 mt-2">
              <strong>Admin:</strong><br />
              Email: <code>admin@recshop.com</code><br />
              Senha: <code>admin123</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

