import React from 'react';
import { useStore } from '../state/Store.jsx';

export default function Conta() {
  const { state, actions } = useStore();
  const walletText = `R$ ${state.wallet?.saldo?.toFixed?.(2) ?? '0,00'}`.replace('.', ',');
  return (
    <section>
      <h1 className="h4 mb-3"><i className="bi bi-person"></i> Minha conta</h1>
      <div className="card mb-3">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0"><i className="bi bi-wallet2"></i> Saldo de Cashback</h6>
          <button className="btn btn-sm btn-outline-primary" onClick={actions.refreshWallet}><i className="bi bi-arrow-clockwise"></i> Atualizar</button>
        </div>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted">Saldo disponível</div>
            <div className="fs-3 text-success">{walletText}</div>
          </div>
          <small className="text-muted">Você pode usar este saldo como desconto no próximo pagamento.</small>
        </div>
      </div>
      <div className="card">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0"><i className="bi bi-clock-history"></i> Últimas recargas</h6>
          <button className="btn btn-sm btn-outline-primary"><i className="bi bi-box-arrow-up-right"></i> Ver todas</button>
        </div>
        <div className="card-body">
          {state.history?.length ? (
            <ul className="list-group list-group-flush">
              {state.history.slice(0, 5).map((h) => (
                <li key={h.id} className="list-group-item d-flex justify-content-between">
                  <span>{h.stationName || 'Estação'} — {new Date(h.data).toLocaleString()}</span>
                  <span className="text-success">R$ {(h.total || 0).toFixed(2).replace('.', ',')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="small text-muted">Sem registros ainda.</div>
          )}
        </div>
      </div>
    </section>
  );
}

