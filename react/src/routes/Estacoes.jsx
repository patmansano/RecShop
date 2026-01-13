import React from 'react';
import { stationsApi, usersApi } from '../services/api.js';

export default function Estacoes() {
  const [items, setItems] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [q, setQ] = React.useState('');
  const [form, setForm] = React.useState({
    userId: '',
    nome: '',
    acessoType: 'Comercial',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    endereco: '',
    qtdDisponivel: 0,
    qtdTotal: 0,
    connectorType: 'Tipo 1',
    potenciaKw: 0,
    precoKwh: 0,
    contrato: '',
    distribuidora: '',
    horarioDias: '08:00-22:00 • Seg/Ter/Qua/Qui/Sex',
    disponivel: true
  });
  const [editing, setEditing] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);

  async function load() {
    const list = await stationsApi.list();
    setItems(list);
    const us = await usersApi.list();
    setUsers(us);
  }
  React.useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setShowForm(true);
    setForm({
      userId: '',
      nome: '',
      acessoType: 'Comercial',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: '',
      endereco: '',
      qtdDisponivel: 0,
      qtdTotal: 0,
      connectorType: 'Tipo 1',
      potenciaKw: 0,
      precoKwh: 0,
      contrato: '',
      distribuidora: '',
      horarioDias: '08:00-22:00 • Seg/Ter/Qua/Qui/Sex',
      disponivel: true
    });
  }
  function startEdit(s) {
    setEditing(s.id);
    setShowForm(true);
    setForm({
      userId: s.userId || '',
      nome: s.nome || '',
      acessoType: s.acessoType || 'Comercial',
      cep: s.cep || '',
      logradouro: s.logradouro || '',
      numero: s.numero || '',
      bairro: s.bairro || '',
      cidade: s.cidade || '',
      uf: s.uf || '',
      endereco: s.endereco || '',
      qtdDisponivel: Number(s.qtdDisponivel || 0),
      qtdTotal: Number(s.qtdTotal || 0),
      connectorType: s.connectorType || 'Tipo 1',
      potenciaKw: Number(s.potenciaKw || 0),
      precoKwh: Number(s.precoKwh || 0),
      contrato: s.contrato || '',
      distribuidora: s.distribuidora || '',
      horarioDias: s.horarioDias || '08:00-22:00 • Seg/Ter/Qua/Qui/Sex',
      disponivel: !!s.disponivel
    });
  }
  function onChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'qtdTotal') {
      const total = Math.max(0, Number(value || 0));
      const disp = Math.max(0, Math.min(Number(form.qtdDisponivel || 0), total));
      setForm({ ...form, qtdTotal: total, qtdDisponivel: disp });
      return;
    }
    if (name === 'qtdDisponivel') {
      const total = Math.max(0, Number(form.qtdTotal || 0));
      const disp = Math.max(0, Math.min(Number(value || 0), total));
      setForm({ ...form, qtdDisponivel: disp });
      return;
    }
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }
  function composeAddress(src) {
    const parts = [];
    if (src.logradouro) parts.push(src.logradouro);
    if (src.numero) parts.push(` ${src.numero}`);
    if (src.bairro) parts.push(` - ${src.bairro}`);
    if (src.cidade || src.uf) parts.push(`, ${src.cidade || ''}/${src.uf || ''}`);
    if (src.cep) parts.push(` • CEP ${src.cep}`);
    const composed = parts.filter(Boolean).join('');
    return composed || src.endereco || '';
  }
  async function lookupCep() {
    const cep = (form.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data && !data.erro) {
        setForm(f => ({
          ...f,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || ''
        }));
      }
    } catch (_e) {}
  }
  async function onSave(e) {
    e.preventDefault();
    const enderecoFull = form.endereco && form.endereco.trim()
      ? form.endereco
      : [form.logradouro, form.numero && ` ${form.numero}`, form.bairro && ` - ${form.bairro}`, (form.cidade || form.uf) && `, ${form.cidade}/${form.uf}`]
          .filter(Boolean)
          .join('');
    const safeTotal = Math.max(0, Number(form.qtdTotal || 0));
    const safeDisp = Math.max(0, Math.min(Number(form.qtdDisponivel || 0), safeTotal));
    const payload = {
      ...form,
      endereco: enderecoFull,
      precoKwh: Number(form.precoKwh),
      potenciaKw: Number(form.potenciaKw),
      qtdDisponivel: safeDisp,
      qtdTotal: safeTotal
    };
    if (editing) await stationsApi.update(editing, payload);
    else await stationsApi.add(payload);
    await load();
    startNew();
    setShowForm(false);
  }
  async function onRemove(id) {
    await stationsApi.remove(id);
    await load();
  }

  const filtered = items.filter(s => {
    const t = (s.nome + ' ' + (s.endereco || '') + ' ' + (s.connectorType || '') + ' ' + (s.acessoType || '')).toLowerCase();
    return !q || t.includes(q.toLowerCase());
  });

  return (
    <section>
      <h1 className="h4 mb-3"><i className="bi bi-ev-station"></i> Estação de Recarga</h1>
      <div className="card mb-3">
        <div className="card-body">
          {/** somente hosts/admin para novo cadastro; em edição, mantém qualquer usuário associado existente **/}
          {/** calculado a cada render para refletir 'editing' **/}
          {/** allowedUsers é usado apenas no select de usuário **/}
          {(() => { return null; })()}
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Buscar</label>
              <input className="form-control" placeholder="Nome, cidade, tipo" value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>
            <div className="col-md-8 d-flex align-items-end justify-content-end">
              <button className="btn btn-rec" onClick={startNew}><i className="bi bi-plus-circle"></i> Novo cadastro</button>
            </div>
          </div>
          <hr />
          {showForm ? <form className="row g-2" onSubmit={onSave}>
            <div className="col-md-3">
              <label className="form-label">Usuário (host)</label>
              <select className="form-select" name="userId" value={form.userId} onChange={onChange}>
                <option value="">Selecione</option>
                {(editing ? users : users.filter(u => u.role === 'host' || u.role === 'admin')).map(u => (
                  <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Estação</label>
              <input className="form-control" name="nome" value={form.nome} onChange={onChange} placeholder="Ex.: Shopping Atlântico" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Tipo de Acesso</label>
              <select className="form-select" name="acessoType" value={form.acessoType} onChange={onChange}>
                <option>Comercial</option>
                <option>Residencial</option>
                <option>Público</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">CEP</label>
              <div className="input-group">
                <input className="form-control" name="cep" value={form.cep} onChange={onChange} placeholder="00000-000" />
                <button className="btn btn-outline-primary" type="button" onClick={lookupCep}><i className="bi bi-search"></i></button>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Logradouro</label>
              <input className="form-control" name="logradouro" value={form.logradouro} onChange={onChange} placeholder="Rua/Av." />
            </div>
            <div className="col-md-2">
              <label className="form-label">Número</label>
              <input className="form-control" name="numero" value={form.numero} onChange={onChange} placeholder="100" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Bairro</label>
              <input className="form-control" name="bairro" value={form.bairro} onChange={onChange} placeholder="Bairro" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Cidade</label>
              <input className="form-control" name="cidade" value={form.cidade} onChange={onChange} placeholder="Cidade" />
            </div>
            <div className="col-md-1">
              <label className="form-label">UF</label>
              <input className="form-control" name="uf" value={form.uf} onChange={onChange} placeholder="RJ" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Conectores (disp/total)</label>
              <div className="input-group">
                <input className="form-control" name="qtdDisponivel" type="number" min="0" value={form.qtdDisponivel} onChange={onChange} />
                <span className="input-group-text">/</span>
                <input className="form-control" name="qtdTotal" type="number" min="0" value={form.qtdTotal} onChange={onChange} />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">Tipo de Conector</label>
              <select className="form-select" name="connectorType" value={form.connectorType} onChange={onChange}>
                <option>Tipo 1</option>
                <option>Tipo 2</option>
                <option>GB/T(CA)</option>
                <option>CC</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Potência (kW)</label>
              <input className="form-control" name="potenciaKw" type="number" step="1" value={form.potenciaKw} onChange={onChange} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Preço (R$)</label>
              <input className="form-control" name="precoKwh" type="number" step="0.01" value={form.precoKwh} onChange={onChange} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Nº Contrato</label>
              <input className="form-control" name="contrato" value={form.contrato} onChange={onChange} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Distribuidora</label>
              <input className="form-control" name="distribuidora" value={form.distribuidora} onChange={onChange} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Horário/Dias</label>
              <input className="form-control" name="horarioDias" value={form.horarioDias} onChange={onChange} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="f-disponivel" name="disponivel" checked={!!form.disponivel} onChange={onChange} />
                <label className="form-check-label" htmlFor="f-disponivel">Aberto</label>
              </div>
            </div>
            <div className="col-12 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary" onClick={(e)=>{e.preventDefault(); setShowForm(false); startNew();}}>Cancelar</button>
              <button className="btn btn-rec" type="submit"><i className="bi bi-save"></i> {editing ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </form> : null}
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-sm table-compact align-middle mb-0 wide-table table-estacoes">
            <thead className="table-light">
              <tr>
                <th className="cell-nowrap">Usuário</th>
                <th className="cell-nowrap">Estação</th>
                <th className="cell-nowrap">Acesso</th>
                <th style={{minWidth:'260px'}}>Endereço Completo</th>
                <th className="cell-nowrap text-center">Conectores</th>
                <th className="cell-nowrap text-center">Potência</th>
                <th className="cell-nowrap text-center">Preço</th>
                <th className="cell-wrap">Contrato<br/>de Energia</th>
                <th className="cell-wrap">Horário/Dias</th>
                <th className="text-center cell-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const u = users.find(uu => uu.id === s.userId);
                const hd = (s.horarioDias || '').split('•').map(t => (t || '').trim());
                const horas = hd[0] || (s.horarioDias || '').trim();
                const dias = hd.length > 1 ? hd[1] : '';
                return (
                  <tr key={s.id}>
                    <td className="fw-semibold cell-nowrap">
                      {u ? (
                        <div>{u.nome}<div className="small text-muted">({u.role})</div></div>
                      ) : '-'}
                    </td>
                    <td className="cell-nowrap">{s.nome}</td>
                    <td className="cell-nowrap">{s.acessoType || '-'}</td>
                    <td className="cell-address small">{composeAddress(s) || '-'}</td>
                    <td className="text-center cell-nowrap">
                      <div><span className="badge text-bg-light">{Number(s.qtdDisponivel||0)}/{Number(s.qtdTotal||0)}</span></div>
                      <div className="small text-muted">{s.connectorType || '-'}</div>
                    </td>
                    <td className="text-center"><span className="badge text-bg-info">{Number(s.potenciaKw||0)}</span></td>
                    <td className="text-center cell-nowrap">R$ {Number(s.precoKwh||0).toFixed(2).replace('.', ',')}</td>
                    <td className="cell-nowrap">
                      <div className="fw-semibold">{s.contrato || '-'}</div>
                      <div className="small text-muted">{s.distribuidora || '-'}</div>
                    </td>
                    <td className="cell-small">
                      <div>{horas || '-'}</div>
                      {dias ? <div className="small text-muted">{dias}</div> : null}
                    </td>
                    <td className="text-center cell-nowrap">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          title="Histórico de criação/modificação"
                          onClick={()=>alert(
                            `Criado: ${s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}\n` +
                            `Modificado: ${s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '-'}`
                          )}
                        >
                          <i className="bi bi-clock-history"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-success" title="Alternar aberto/fechado" onClick={async()=>{ await stationsApi.update(s.id, { disponivel: !s.disponivel }); await load(); }}>
                          {s.disponivel ? <i className="bi bi-toggle-on"></i> : <i className="bi bi-toggle-off"></i>}
                        </button>
                        <button className="btn btn-sm btn-outline-primary" onClick={()=>startEdit(s)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>onRemove(s.id)}><i className="bi bi-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr><td colSpan={10}><div className="p-3 small text-muted">Nenhuma estação.</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

