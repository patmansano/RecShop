import React from 'react';
import { useStore } from '../state/Store.jsx';
import { VEHICLE_CONNECTORS, vehiclesApi, usersApi } from '../services/api.js';
import { getBrandOptions, getModelsByBrand } from '../data/evs.js';

export default function Veiculos() {
  const { state } = useStore();
  const [nome, setNome] = React.useState('');
  const [placa, setPlaca] = React.useState('');
  const [conector, setConector] = React.useState('Tipo 1');
  const [bateria, setBateria] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [brand, setBrand] = React.useState('');
  const [model, setModel] = React.useState('');
  const [brandOther, setBrandOther] = React.useState('');
  const [modelOther, setModelOther] = React.useState('');
  const [vehicles, setVehicles] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [selectedUserId, setSelectedUserId] = React.useState(null);
  const isAdmin = state.user?.role === 'admin';

  React.useEffect(() => {
    if (state.user) {
      setSelectedUserId(isAdmin ? '__all' : state.user.id);
    }
  }, [state.user]);

  React.useEffect(() => {
    async function boot() {
      if (!selectedUserId) return;
      const list = selectedUserId === '__all'
        ? await vehiclesApi.listAll()
        : await vehiclesApi.list(selectedUserId);
      setVehicles(Array.isArray(list) ? list : []);
    }
    boot();
  }, [selectedUserId]);

  React.useEffect(() => {
    async function loadUsersIfAdmin() {
      if (isAdmin) {
        const us = await usersApi.list();
        setUsers(us);
      }
    }
    loadUsersIfAdmin();
  }, [state.user]);

  function resetForm() {
    setNome('');
    setPlaca('');
    setConector('Tipo 1');
    setBateria('');
    setEditingId(null);
    setShowForm(false);
    setBrand('');
    setModel('');
    setBrandOther('');
    setModelOther('');
  }

  async function onSave(e) {
    e.preventDefault();
    const selBrand = brand === 'Outros' ? brandOther.trim() : brand.trim();
    const selModel = model === 'Outros' ? modelOther.trim() : model.trim();
    const finalName = (selBrand || selModel) ? `${selBrand} ${selModel}`.trim() : nome.trim();
    if (!finalName) return;
    const payload = {
      nome: finalName,
      marca: selBrand || null,
      modelo: selModel || null,
      placa: placa.trim(),
      conector,
      bateriaKwh: bateria ? Number(bateria) : 0
    };
    if (editingId) {
      await vehiclesApi.update(selectedUserId, editingId, payload);
    } else {
      await vehiclesApi.add(selectedUserId, payload);
    }
    const list = await vehiclesApi.list(selectedUserId);
    setVehicles(Array.isArray(list) ? list : []);
    resetForm();
  }

  async function onRemove(id) {
    await vehiclesApi.remove(selectedUserId, id);
    const list = await vehiclesApi.list(selectedUserId);
    setVehicles(Array.isArray(list) ? list : []);
  }

  function onEdit(v) {
    setEditingId(v.id);
    setNome(v.nome || '');
    setPlaca(v.placa || '');
    setConector(v.conector || 'Tipo 1');
    setBateria(v.bateriaKwh != null ? String(v.bateriaKwh) : '');
    // tenta preencher marca/modelo
    const vBrand = v.marca || (v.nome ? String(v.nome).split(' ')[0] : '');
    const vModel = v.modelo || (v.nome ? String(v.nome).split(' ').slice(1).join(' ') : '');
    const knownBrands = getBrandOptions();
    if (knownBrands.includes(vBrand)) {
      setBrand(vBrand);
      const models = getModelsByBrand(vBrand);
      if (models.includes(vModel)) {
        setModel(vModel);
        setModelOther('');
      } else {
        setModel('Outros');
        setModelOther(vModel);
      }
      setBrandOther('');
    } else {
      setBrand('Outros');
      setBrandOther(vBrand);
      setModel('Outros');
      setModelOther(vModel);
    }
    setShowForm(true);
  }

  return (
    <section>
      <h1 className="h4 mb-3"><i className="bi bi-car-front"></i> Veículos</h1>
      <div className="card mb-3">
        <div className="card-body">
          {isAdmin ? (
            <div className="row g-2 mb-2">
              <div className="col-md-4">
                <label className="form-label">Usuário</label>
                <select className="form-select" value={selectedUserId || ''} onChange={(e)=>setSelectedUserId(e.target.value)}>
                  <option value="__all">Todos os usuários</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>)}
                </select>
              </div>
            </div>
          ) : null}
          <div className="d-flex justify-content-end">
            <button className="btn btn-sm btn-rec" onClick={(e)=>{ e.preventDefault(); setShowForm(true); setEditingId(null); setNome(''); setPlaca(''); setConector('Tipo 1'); setBateria(''); }}>
              <i className="bi bi-plus-circle"></i> Novo cadastro
            </button>
          </div>
          {showForm ? (
            <form className="row g-2 mt-2" onSubmit={onSave}>
              <div className="col-md-3">
                <label className="form-label">Marca</label>
                <select className="form-select" value={brand} onChange={(e)=>{ setBrand(e.target.value); setModel(''); setBrandOther(''); }}>
                  <option value="">Selecione</option>
                  {getBrandOptions().map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="Outros">Outros</option>
                </select>
                {brand === 'Outros' ? (
                  <input className="form-control mt-1" placeholder="Nome da marca" value={brandOther} onChange={(e)=>setBrandOther(e.target.value)} />
                ) : null}
              </div>
              <div className="col-md-3">
                <label className="form-label">Modelo</label>
                <select className="form-select" value={model} onChange={(e)=>{ setModel(e.target.value); setModelOther(''); }} disabled={!brand}>
                  <option value="">Selecione</option>
                  {(brand && brand!=='Outros' ? getModelsByBrand(brand) : []).map(m => <option key={m} value={m}>{m}</option>)}
                  {brand ? <option value="Outros">Outros</option> : null}
                </select>
                {model === 'Outros' ? (
                  <input className="form-control mt-1" placeholder="Nome do modelo" value={modelOther} onChange={(e)=>setModelOther(e.target.value)} />
                ) : null}
              </div>
              <div className="col-md-3">
                <label className="form-label">Placa</label>
                <input className="form-control" placeholder="ABC-1234 ou ABC1D23" value={placa} onChange={(e)=>setPlaca(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Tipo de Conector</label>
                <select className="form-select" value={conector} onChange={(e)=>setConector(e.target.value)}>
                  {VEHICLE_CONNECTORS.map((opt)=>(
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Bateria (kWh)</label>
                <input className="form-control" type="number" min="0" step="1" placeholder="60" value={bateria} onChange={(e)=>setBateria(e.target.value)} />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2">
                {editingId ? <button className="btn btn-outline-secondary" onClick={(e)=>{e.preventDefault(); resetForm();}}>Cancelar</button> : <button className="btn btn-outline-secondary" onClick={(e)=>{e.preventDefault(); setShowForm(false);}}>Cancelar</button>}
                <button className="btn btn-rec" type="submit"><i className="bi bi-save"></i> {editingId ? 'Salvar' : 'Adicionar'}</button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead className="table-light">
              <tr>
                {isAdmin ? <th>Usuário</th> : null}
                <th>Modelo</th>
                <th>Placa</th>
                <th>Conector</th>
                <th>Bateria (kWh)</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vehicles?.length ? vehicles.map((v)=>(
                <tr key={v.id}>
                  {isAdmin ? <td>{users.find(u => u.id === v.userId)?.nome || '-'}</td> : null}
                  <td className="fw-semibold">{v.nome || `${v.marca || ''} ${v.modelo || ''}`.trim()}</td>
                  <td>{v.placa}</td>
                  <td>{v.conector}</td>
                  <td>{v.bateriaKwh != null ? v.bateriaKwh : '-'}</td>
                  <td className="text-end">
                    <div className="btn-group">
                      <button className={`btn btn-sm ${v.isActive === false ? 'btn-outline-success' : 'btn-outline-secondary'}`} title="Ativar/Inativar" onClick={async()=>{
                        await vehiclesApi.update(selectedUserId, v.id, { isActive: !(v.isActive !== false) });
                        const list = await vehiclesApi.list(selectedUserId);
                        setVehicles(Array.isArray(list) ? list : []);
                      }}>
                        <i className={`bi ${v.isActive === false ? 'bi-toggle-on' : 'bi-toggle-off'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" title="Histórico" onClick={()=>{
                        alert(`Criado: ${v.createdAt ? new Date(v.createdAt).toLocaleString() : '-'}\nModificado: ${v.updatedAt ? new Date(v.updatedAt).toLocaleString() : '-'}`);
                      }}>
                        <i className="bi bi-clock-history"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>onEdit(v)}><i className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>onRemove(v.id)}><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={isAdmin ? 6 : 5}><div className="p-3 small text-muted">Nenhum veículo cadastrado.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

