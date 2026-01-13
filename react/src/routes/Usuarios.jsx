import React from 'react';
import { usersApi, vehiclesApi, stationsApi, bankApi, api, adminApi } from '../services/api.js';
import { useStore } from '../state/Store.jsx';

export default function Usuarios() {
  const { state } = useStore();
  const [users, setUsers] = React.useState([]);
  const [filter, setFilter] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [vehCountByUser, setVehCountByUser] = React.useState({});
  const [stationCountByUser, setStationCountByUser] = React.useState({});
  const [showPwd, setShowPwd] = React.useState({});

  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({ nome: '', email: '', role: 'driver', password: '', cpfCnpj: '' });
  const [showForm, setShowForm] = React.useState(false);

  async function load() {
    const list = await usersApi.list();
    setUsers(list);
    // carregar contagem de veículos por usuário
    const counts = {};
    const sCounts = {};
    await Promise.all(list.map(async (u) => {
      try {
        const vs = await vehiclesApi.list(u.id);
        counts[u.id] = Array.isArray(vs) ? vs.length : 0;
      } catch (_e) {
        counts[u.id] = 0;
      }
      try {
        const sts = await stationsApi.listByUser(u.id);
        sCounts[u.id] = Array.isArray(sts) ? sts.length : 0;
      } catch (_e) {
        sCounts[u.id] = 0;
      }
    }));
    setVehCountByUser(counts);
    setStationCountByUser(sCounts);
  }

  React.useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setForm({ nome: '', email: '', role: 'driver', password: '', cpfCnpj: '' });
    setShowForm(true);
  }
  function startEdit(u) {
    setEditing(u.id);
    setForm({ nome: u.nome || '', email: u.email || '', role: u.role || 'driver', password: u.password || '', cpfCnpj: u.cpfCnpj || '' });
    setShowForm(true);
  }
  function cancelEdit() { setEditing(null); setShowForm(false); setForm({ nome: '', email: '', role: 'driver', password: '', cpfCnpj: '' }); }
  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function onSave(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) return;
    if (editing) {
      await usersApi.update(editing, form);
    } else {
      await usersApi.add(form);
    }
    await load();
    setEditing(null);
    setShowForm(false);
    setForm({ nome: '', email: '', role: 'driver', password: '', cpfCnpj: '' });
  }
  async function onRemove(id) {
    await usersApi.remove(id);
    await load();
  }
  function toggleShowPwd(id) {
    setShowPwd(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Bank accounts + wallet
  const [bankUser, setBankUser] = React.useState(null);
  const [bankList, setBankList] = React.useState([]);
  const [bankForm, setBankForm] = React.useState({ pix:'' });
  const [bankEditing, setBankEditing] = React.useState(null);
  const [cardList, setCardList] = React.useState([]);
  const [cardForm, setCardForm] = React.useState({
    brand:'Visa', number:'', holder:'', exp:'',
    cvv:'', billStreet:'', billNumber:'', billComplement:'', billDistrict:'', billCity:'', billUF:'', billCEP:''
  });
  const [cardEditing, setCardEditing] = React.useState(null);
  const [cardFormVisible, setCardFormVisible] = React.useState(false);
  const [bankWallet, setBankWallet] = React.useState(0);
  async function openBank(u){
    setBankUser(u);
    setBankEditing(null);
    setBankForm({ banco:'', agencia:'', conta:'', titular:'' });
    const list = await bankApi.list(u.id);
    setBankList(Array.isArray(list) ? list : []);
    try {
      if (u.role === 'driver') {
        const w = await api.getWallet(u.id);
        setBankWallet(Number(w?.saldo || 0));
      } else if (u.role === 'admin') {
        // saldo do admin = soma dos refunds do histórico de todos os usuários
        const users = await usersApi.list();
        let total = 0;
        for (const usr of users) {
          const hist = await api.getHistory(usr.id);
          for (const it of (hist || [])) total += Number(it.refund || 0);
        }
        const saldo = Number(total.toFixed(2));
        await api.setWallet(u.id, { saldo });
        setBankWallet(saldo);
      } else {
        setBankWallet(0);
      }
    } catch (_e) {
      setBankWallet(0);
    }
    try {
      const cards = await api.getCards(u.id);
      setCardList(Array.isArray(cards) ? cards : []);
    } catch (_e) {
      setCardList([]);
    }
    setCardFormVisible(false);
    setCardEditing(null);
    try {
      // abrir modal bootstrap
      const el = document.getElementById('bankModalUser');
      if (el && window.bootstrap) {
        const m = window.bootstrap.Modal.getOrCreateInstance(el);
        m.show();
      }
    } catch (_e) {}
  }
  function bankCancel(){ setBankEditing(null); setBankForm({ pix:'' }); }
  function bankEdit(b){ setBankEditing(b.id); setBankForm({ pix:b.pix||'' }); }
  async function bankRemove(id){ await bankApi.remove(bankUser.id, id); const list = await bankApi.list(bankUser.id); setBankList(list); }
  function maskPix(v){
    // se somente dígitos: formata telefone (11 dígitos) ou CPF/CNPJ (11/14)
    const only = (v||'').replace(/\\s+/g,' ').trim();
    if (/^\\d+$/.test(only)){
      if (only.length <= 11){
        const tel = only.slice(0,11);
        return tel.replace(/(\\d{2})(\\d{5})(\\d{0,4})/,'($1) $2-$3').trim();
      }
      if (only.length <= 14){
        const cpf = only.slice(0,11);
        return cpf.replace(/(\\d{3})(\\d{3})(\\d{3})(\\d{0,2})/,'$1.$2.$3-$4').replace(/[-\\.]$/,'');
      }
      const cnpj = only.slice(0,14);
      return cnpj.replace(/(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{0,2})/,'$1.$2.$3/$4-$5').replace(/[-\\/\\.]$/,'');
    }
    // e-mail: limita tamanho
    if (only.includes('@')) return only.slice(0,80);
    // chave aleatoria: UUID (32 hex) com hifens
    const hex = only.replace(/[^a-fA-F0-9]/g,'').slice(0,32);
    if (hex.length) {
      return hex.replace(/(.{8})(.{4})(.{4})(.{4})(.{0,12})/,'$1-$2-$3-$4-$5');
    }
    return only;
  }
  async function bankSave(e){
    if (e && e.preventDefault) e.preventDefault();
    let input = (bankForm.pix || '').trim();
    if (!input) { alert('Informe a chave Pix.'); return; }
    const digits = input.replace(/\D/g,'');
    const isEmail = input.includes('@');
    const cpfMaskRe = new RegExp('^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$');
    const cnpjMaskRe = new RegExp('^\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}$');
    const phoneMaskRe = new RegExp('^\\(\\d{2}\\) \\d{5}-\\d{4}$');
    let raw = input;
    if (phoneMaskRe.test(input)) {
      raw = digits;
    } else if (cpfMaskRe.test(input)) {
      raw = digits;
    } else if (cnpjMaskRe.test(input)) {
      raw = digits;
    } else if (!isEmail && /^[a-fA-F0-9-]{8,36}$/.test(input)) {
      raw = input.replace(/-/g,''); // chave aleatória (uuid) sem hifens
    } else if (!isEmail && /^\d+$/.test(input)) {
      raw = input; // já só dígitos (tel/CPF/CNPJ sem máscara)
    }
    const payload = { pix: raw };
    if(bankEditing){ await bankApi.update(bankUser.id, bankEditing, payload); }
    else { await bankApi.add(bankUser.id, payload); }
    const list = await bankApi.list(bankUser.id);
    setBankList(Array.isArray(list) ? list : []);
    bankCancel();
  }
  // cards
  function maskCardNum(v){ return v.replace(/\D/g,'').slice(0,16).replace(/(\d{4})/g,'$1 ').trim(); }
  function maskExp(v){ return v.replace(/\D/g,'').slice(0,4).replace(/(\d{2})(\d{0,2})/,'$1/$2'); }
  async function cardSave(e){
    e.preventDefault();
    if (!/^\d{2}\/\d{2}$/.test(cardForm.exp)) { alert('Vencimento deve estar no formato MM/AA.'); return; }
    const cvvLen = cardForm.brand === 'Amex' ? 4 : 3;
    if (!new RegExp(`^\\d{${cvvLen}}$`).test(cardForm.cvv)) { alert(`CVV deve ter ${cvvLen} dígitos.`); return; }
    const basePatch = {
      brand: cardForm.brand,
      holder: cardForm.holder,
      exp: cardForm.exp,
      billing: {
        street: cardForm.billStreet, number: cardForm.billNumber, complement: cardForm.billComplement,
        district: cardForm.billDistrict, city: cardForm.billCity, uf: cardForm.billUF, cep: cardForm.billCEP
      }
    };
    const digits = (cardForm.number || '').replace(/\s+/g,'');
    if (cardEditing) {
      // update existente; se número informado, atualiza máscara
      let patch = { ...basePatch };
      if (digits) {
        const maxLen = cardForm.brand === 'Amex' ? 15 : 16;
        if (digits.length !== maxLen) { alert('Número do cartão inválido.'); return; }
        patch.numberMasked = `**** **** **** ${digits.slice(-4)}`;
      }
      await api.updateCard(bankUser.id, cardEditing, patch);
    } else {
      // novo cartão
      const maxLen = cardForm.brand === 'Amex' ? 15 : 16;
      if (digits.length !== maxLen) { alert('Número do cartão inválido.'); return; }
      const numberMasked = `**** **** **** ${digits.slice(-4)}`;
      await api.addCard(bankUser.id, { numberMasked, ...basePatch });
    }
    const cards = await api.getCards(bankUser.id);
    setCardList(cards);
    setCardForm({
      brand:'Visa', number:'', holder:'', exp:'',
      cvv:'', billStreet:'', billNumber:'', billComplement:'', billDistrict:'', billCity:'', billUF:'', billCEP:''
    });
    setCardEditing(null);
    setCardFormVisible(false);
  }
  async function cardRemove(id){
    await api.removeCard(bankUser.id, id);
    const cards = await api.getCards(bankUser.id);
    setCardList(cards);
  }
  async function cardPreferred(id){
    await api.setPreferred(bankUser.id, id);
    const cards = await api.getCards(bankUser.id);
    setCardList(cards);
  }
  async function billLookupCep(){
    const cep = (cardForm.billCEP || '').replace(/\D/g,'');
    if (cep.length !== 8) { alert('Informe o CEP com 8 dígitos.'); return; }
    try{
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data && !data.erro){
        setCardForm(cf => ({
          ...cf,
          billStreet: data.logradouro || '',
          billDistrict: data.bairro || '',
          billCity: data.localidade || '',
          billUF: (data.uf || '').toUpperCase()
        }));
      }
    }catch(_e){}
  }

  const filtered = users.filter(u => {
    const t = (u.nome + ' ' + u.email).toLowerCase();
    const okText = !filter || t.includes(filter.toLowerCase());
    const okRole = roleFilter === 'all' || u.role === roleFilter;
    return okText && okRole;
  });

  async function evaluateActivation(user){
    // rule: driver => needs at least 1 card; host => at least 1 bank; admin => always active
    if (user.role === 'admin') return true;
    try{
      if (user.role === 'driver'){
        const cards = await api.getCards(user.id);
        return Array.isArray(cards) && cards.length > 0;
      } else if (user.role === 'host'){
        const banks = await bankApi.list(user.id);
        return Array.isArray(banks) && banks.length > 0;
      }
    }catch(_e){}
    return false;
  }

  async function toggleActive(u){
    const newActive = !(u.isActive);
    await adminApi.setUserActive(u.id, newActive);
    await load();
  }

  return (
    <section>
      <h1 className="h4 mb-3"><i className="bi bi-people"></i> Usuários</h1>
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Busca</label>
              <input className="form-control" placeholder="Nome ou e-mail" value={filter} onChange={(e)=>setFilter(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Filtro por Perfil</label>
              <select className="form-select" value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value)}>
                <option value="all">Todos</option>
                <option value="driver">driver</option>
                <option value="host">host</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-md-5 d-flex align-items-end justify-content-end">
              <button className="btn btn-rec" onClick={startNew}><i className="bi bi-person-plus"></i> Novo cadastro</button>
            </div>
          </div>
          <hr />
          {showForm ? (
            <form className="row g-2" onSubmit={onSave}>
              <div className="col-md-3">
                <label className="form-label">Nome</label>
                <input className="form-control" name="nome" value={form.nome} onChange={onChange} placeholder="Nome completo" />
              </div>
              <div className="col-md-3">
                <label className="form-label">E-mail</label>
                <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} placeholder="email@exemplo.com" />
              </div>
              <div className="col-md-3">
                <label className="form-label">CPF/CNPJ</label>
                <input className="form-control" name="cpfCnpj" value={form.cpfCnpj} onChange={onChange} placeholder="CPF ou CNPJ" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Perfil</label>
                <select className="form-select" name="role" value={form.role} onChange={onChange}>
                  <option value="driver">driver</option>
                  <option value="host">host</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Senha</label>
                <input className="form-control" name="password" type="text" value={form.password} onChange={onChange} placeholder="******" />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2">
                <button className="btn btn-outline-secondary" onClick={(e)=>{e.preventDefault(); cancelEdit();}}>Cancelar</button>
                <button className="btn btn-rec" type="submit"><i className="bi bi-save"></i> {editing ? 'Salvar' : 'Adicionar'}</button>
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
                <th>Nome</th>
                <th>Email</th>
                <th>CPF/CNPJ</th>
                <th>Perfil</th>
                <th>Veículos/Estações</th>
                <th>Status</th>
                <th>Senha</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="fw-semibold">{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.cpfCnpj || '-'}</td>
                  <td>{u.role}</td>
                  <td>{(vehCountByUser[u.id] ?? 0)} / {(stationCountByUser[u.id] ?? 0)}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>{u.isActive ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span>{showPwd[u.id] ? (u.password || '—') : '******'}</span>
                      <button className="btn btn-sm btn-outline-secondary" onClick={(e)=>{e.preventDefault(); toggleShowPwd(u.id);}} title="Visualizar senha">
                        <i className="bi bi-eye"></i>
                      </button>
                    </div>
                  </td>
                  <td className="text-end">
                    <div className="btn-group">
                      <button className={`btn btn-sm ${u.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`} title="Ativar/Inativar" onClick={()=>toggleActive(u)}>
                        <i className={`bi ${u.isActive ? 'bi-toggle-off' : 'bi-toggle-on'}`}></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-success"
                        title="Dados bancários"
                        onClick={()=>openBank(u)}
                        type="button"
                        data-bs-toggle="modal"
                        data-bs-target="#bankModalUser"
                      >
                        <i className="bi bi-bank"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>startEdit(u)}><i className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>onRemove(u.id)}><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr><td colSpan={5}><div className="p-3 small text-muted">Nenhum usuário encontrado.</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de dados bancários */}
      <div className="modal fade" id="bankModalUser" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title"><i className="bi bi-bank"></i> Dados bancários — <span className="fw-semibold">{bankUser?.nome || ''}</span></h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {(bankUser?.role === 'driver' || bankUser?.role === 'admin') ? (
                <div className="small mb-2">Saldo cashback: <b>R$ {bankWallet.toFixed(2).replace('.', ',')}</b></div>
              ) : null}
              {(bankUser?.role === 'host' || bankUser?.role === 'admin') ? (
                <>
                  <h6 className="mt-2"><i className="bi bi-cash-coin"></i> Chave Pix para depósito</h6>
                  <form className="row g-2" onSubmit={bankSave}>
                    <div className="col-md-6">
                      <label className="form-label">Chave Pix</label>
                      <input className="form-control" value={bankForm.pix} onChange={(e)=>setBankForm({...bankForm,pix:maskPix(e.target.value)})} placeholder="E-mail, celular, CPF/CNPJ ou chave aleatória" />
                    </div>
                    <div className="col-md-6 d-flex align-items-end justify-content-end gap-2">
                      {bankEditing ? <button className="btn btn-outline-secondary" onClick={(e)=>{e.preventDefault(); bankCancel();}}>Cancelar</button> : null}
                      <button className="btn btn-rec" type="button" onClick={bankSave}><i className="bi bi-save"></i> {bankEditing ? 'Salvar' : 'Adicionar'}</button>
                    </div>
                  </form>
                  <div className="table-responsive mt-2">
                    <table className="table table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Chave Pix</th><th>Preferencial</th><th className="text-end">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankList.length ? bankList.map(b=>(
                          <tr key={b.id}>
                            <td>{b.pix || '-'}</td>
                            <td>{b.preferred ? <i className="bi bi-star-fill text-warning"></i> : <i className="bi bi-star"></i>}</td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button className="btn btn-sm btn-outline-primary" onClick={()=>bankEdit(b)}><i className="bi bi-pencil"></i></button>
                                <button className="btn btn-sm btn-outline-secondary" title="Preferencial" onClick={async()=>{ await bankApi.setPreferred(bankUser.id, b.id); const list = await bankApi.list(bankUser.id); setBankList(list);}}>
                                  <i className="bi bi-star"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={()=>bankRemove(b.id)}><i className="bi bi-trash"></i></button>
                              </div>
                            </td>
                          </tr>
                        )):(
                          <tr><td colSpan={3}><div className="p-2 small text-muted">Nenhuma chave Pix cadastrada.</div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <hr />
                </>
              ) : null}

              {(bankUser?.role === 'driver' || bankUser?.role === 'admin') ? (
                <>
                  <h6 className="mt-2"><i className="bi bi-credit-card-2-front"></i> Cartões para débito</h6>
                  {!cardFormVisible ? (
                    <div className="d-flex justify-content-end mb-2">
                      <button className="btn btn-rec" onClick={(e)=>{e.preventDefault(); setCardEditing(null); setCardFormVisible(true);}}>
                        <i className="bi bi-plus-circle"></i> Novo cartão
                      </button>
                    </div>
                  ) : null}
                  {cardFormVisible ? (
                  <form className="row g-2" onSubmit={cardSave}>
                    <div className="col-md-2">
                      <label className="form-label">Bandeira</label>
                      <select className="form-select" value={cardForm.brand} onChange={(e)=>setCardForm({...cardForm, brand:e.target.value})}>
                        <option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option><option>Hipercard</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Número</label>
                      <input className="form-control" value={cardForm.number} onChange={(e)=>setCardForm({...cardForm, number:maskCardNum(e.target.value)})} placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Vencimento</label>
                      <input className="form-control" value={cardForm.exp} onChange={(e)=>setCardForm({...cardForm, exp:maskExp(e.target.value)})} placeholder="MM/AA" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">CVV</label>
                      <input className="form-control" value={cardForm.cvv} onChange={(e)=>setCardForm({...cardForm, cvv:e.target.value.replace(/\\D/g,'').slice(0, cardForm.brand==='Amex'?4:3)})} placeholder="CVV" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Titular</label>
                      <input className="form-control" value={cardForm.holder} onChange={(e)=>setCardForm({...cardForm, holder:e.target.value})} placeholder="Nome impresso" />
                    </div>
                    <div className="col-12"><hr/></div>
                    <h6 className="mt-2">Endereço de cobrança</h6>
                    <div className="col-md-6">
                      <label className="form-label">Rua</label>
                      <input className="form-control" value={cardForm.billStreet} onChange={(e)=>setCardForm({...cardForm, billStreet:e.target.value})} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Número</label>
                      <input className="form-control" value={cardForm.billNumber} onChange={(e)=>setCardForm({...cardForm, billNumber:e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Complemento</label>
                      <input className="form-control" value={cardForm.billComplement} onChange={(e)=>setCardForm({...cardForm, billComplement:e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Bairro</label>
                      <input className="form-control" value={cardForm.billDistrict} onChange={(e)=>setCardForm({...cardForm, billDistrict:e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Cidade</label>
                      <input className="form-control" value={cardForm.billCity} onChange={(e)=>setCardForm({...cardForm, billCity:e.target.value})} />
                    </div>
                    <div className="col-md-1">
                      <label className="form-label">UF</label>
                      <input className="form-control" value={cardForm.billUF} onChange={(e)=>setCardForm({...cardForm, billUF:e.target.value.toUpperCase().slice(0,2)})} placeholder="UF" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">CEP</label>
                      <div className="input-group">
                        <input className="form-control" value={cardForm.billCEP} onChange={(e)=>setCardForm({...cardForm, billCEP:e.target.value.replace(/\\D/g,'').slice(0,8)})} placeholder="00000000" />
                        <button className="btn btn-outline-primary" type="button" onClick={billLookupCep}><i className="bi bi-search"></i></button>
                      </div>
                    </div>
                    <div className="col-12 d-flex justify-content-end mt-2">
                      <button className="btn btn-rec me-2" type="submit">
                        <i className="bi bi-save"></i> {cardEditing ? 'Salvar' : 'Adicionar'}
                      </button>
                      <button className="btn btn-outline-secondary" onClick={(e)=>{e.preventDefault(); setCardFormVisible(false); setCardEditing(null);}}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                  ) : null}
                  <div className="table-responsive mt-2">
                    <table className="table table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Bandeira</th><th>Número</th><th>Venc.</th><th>Titular</th>
                          <th>Endereço de cobrança</th>
                          <th className="text-end">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardList.length ? cardList.map(c=>(
                          <tr key={c.id}>
                            <td>{c.brand} {c.preferred ? <i className="bi bi-star-fill text-warning"></i> : null}</td>
                            <td>{c.numberMasked}</td><td>{c.exp}</td><td>{c.holder}</td>
                            <td className="small">
                              {[
                                c.billing?.street && `${c.billing.street}${c.billing.number? ', '+c.billing.number:''}${c.billing.complement? ' - '+c.billing.complement:''}`,
                                c.billing?.district,
                                (c.billing?.city || c.billing?.uf) && `${c.billing.city || ''}${c.billing.uf? '/'+c.billing.uf:''}`,
                                c.billing?.cep && `CEP ${c.billing.cep}`
                              ].filter(Boolean).join(' • ') || '—'}
                            </td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button className="btn btn-sm btn-outline-primary" title="Editar" onClick={(e)=>{e.preventDefault(); setCardEditing(c.id); setCardFormVisible(true); setCardForm({
                                  brand:c.brand||'Visa', number:'', holder:c.holder||'', exp:c.exp||'', cvv:'',
                                  billStreet:c.billing?.street||'', billNumber:c.billing?.number||'', billComplement:c.billing?.complement||'',
                                  billDistrict:c.billing?.district||'', billCity:c.billing?.city||'', billUF:c.billing?.uf||'', billCEP:c.billing?.cep||''
                                });}}>
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary" title="Preferencial" onClick={()=>cardPreferred(c.id)}>
                                  <i className="bi bi-star"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={()=>cardRemove(c.id)}><i className="bi bi-trash"></i></button>
                              </div>
                            </td>
                          </tr>
                        )) : <tr><td colSpan={5}><div className="p-2 small text-muted">Nenhum cartão cadastrado.</div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

