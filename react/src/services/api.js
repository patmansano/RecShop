const KEY = (name) => `recshop:${name}`;
const HTTP_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:3000';
const USE_HTTP = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_API === 'true') || false;

function tokenKey(){ return KEY('authToken'); }
function getToken(){
  try{ return localStorage.getItem(tokenKey()) || null; }catch(_e){ return null; }
}
function setToken(t){
  try{ t ? localStorage.setItem(tokenKey(), t) : localStorage.removeItem(tokenKey()); }catch(_e){}
}
function clearAuth(){
  try{ localStorage.removeItem(KEY('currentUser')); }catch(_e){}
  setToken(null);
  try{ window.dispatchEvent(new Event('recshop:auth-logout')); }catch(_e){}
}

async function http(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  const res = await fetch(`${HTTP_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) {
    clearAuth();
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_e) {
    return fallback;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_e) {
    // ignore quota errors
  }
}

function ensureSeed() {
  const seeded = readLocal(KEY('seeded'), false);
  if (seeded) return;
  const users = [
    { id: 'u1', nome: 'Maria', email: 'maria@email.com', role: 'driver', password: '123456' },
    { id: 'h1', nome: 'Host 1', email: 'host1@recshop.com', role: 'host', password: 'host123' },
    { id: 'a1', nome: 'Admin', email: 'admin@recshop.com', role: 'admin', password: 'admin123' }
  ];
  const stations = [
    { id: 's1', nome: 'Estação Centro', cidade: 'Rio', tipo: 'AC', precoKwh: 2.5, disponivel: true },
    { id: 's2', nome: 'Estação Zona Sul', cidade: 'Rio', tipo: 'DC', precoKwh: 3.9, disponivel: true },
    { id: 's3', nome: 'Estação Niterói', cidade: 'Niterói', tipo: 'AC', precoKwh: 2.1, disponivel: false }
  ];
  writeLocal(KEY('users'), users);
  writeLocal(KEY('stations'), stations);
  writeLocal(KEY('wallet:u1'), { saldo: 50.0 });
  writeLocal(KEY('wallet:h1'), { saldo: 0.0 });
  writeLocal(KEY('wallet:a1'), { saldo: 0.0 });
  writeLocal(KEY('cards:u1'), []);
  writeLocal(KEY('history:u1'), []);
  // Seed vehicles for driver 'u1'
  writeLocal(KEY('vehicles:u1'), [
    {
      id: 'v1',
      nome: 'TIGGO 8',
      placa: 'ARF1S23',
      conector: 'Tipo 1',
      bateriaKwh: 70,
      createdAt: '2025-11-04T21:49:09.000Z',
      updatedAt: '2025-11-04T21:49:09.000Z'
    },
    {
      id: 'v2',
      nome: 'BYD Song',
      placa: 'PPP-1236',
      conector: 'Tipo 2',
      bateriaKwh: 72,
      createdAt: '2025-11-04T21:50:19.000Z',
      updatedAt: '2025-11-04T21:50:19.000Z'
    }
  ]);
  writeLocal(KEY('seeded'), true);
}
ensureSeed();

export const api = {
  // Auth
  getCurrentUser() {
    return readLocal(KEY('currentUser'), null);
  },
  async login({ email, password }) {
    if (USE_HTTP) {
      // rota dedicada de login
      const user = await http('POST', `/auth/login`, { email, password });
      if (!user) throw new Error('Credenciais inválidas');
      if (user.token) setToken(user.token);
      writeLocal(KEY('currentUser'), user);
      return user;
    } else {
      const users = readLocal(KEY('users'), []);
      const found = users.find((u) => u.email === email && (password ? u.password === password : true));
      if (!found) throw new Error('Credenciais inválidas');
      setToken('local-dev-token');
      writeLocal(KEY('currentUser'), found);
      return found;
    }
  },
  async signup({ nome, email, password, role }) {
    if (USE_HTTP) {
      const dup = await http('GET', `/users?email=${encodeURIComponent(email)}`);
      if (Array.isArray(dup) && dup.length) throw new Error('E-mail já cadastrado');
      const user = await http('POST', `/users`, { nome, email, password, role });
      if (user.token) setToken(user.token);
      writeLocal(KEY('currentUser'), user);
      return user;
    } else {
      const users = readLocal(KEY('users'), []);
      if (users.some((u) => u.email === email)) throw new Error('E-mail já cadastrado');
      const id = `u${Math.random().toString(36).slice(2, 8)}`;
      const user = { id, nome, email, password, role };
      users.push(user);
      writeLocal(KEY('users'), users);
      setToken('local-dev-token');
      writeLocal(KEY('currentUser'), user);
      writeLocal(KEY(`wallet:${id}`), { saldo: 0.0 });
      writeLocal(KEY(`cards:${id}`), []);
      writeLocal(KEY(`history:${id}`), []);
      return user;
    }
  },
  async logout() {
    clearAuth();
  },

  // Wallet
  async getWallet(userId) {
    if (USE_HTTP) {
      const list = await http('GET', `/wallets?userId=${encodeURIComponent(userId)}`);
      return Array.isArray(list) && list[0] ? list[0] : { saldo: 0.0 };
    }
    return readLocal(KEY(`wallet:${userId}`), { saldo: 0.0 });
  },
  async setWallet(userId, wallet) {
    if (USE_HTTP) {
      const list = await http('GET', `/wallets?userId=${encodeURIComponent(userId)}`);
      if (Array.isArray(list) && list[0]) {
        const w = await http('PATCH', `/wallets/${encodeURIComponent(list[0].id)}`, wallet);
        return w;
      } else {
        const w = await http('POST', `/wallets`, { userId, ...wallet });
        return w;
      }
    } else {
      writeLocal(KEY(`wallet:${userId}`), wallet);
      return wallet;
    }
  },

  // Cards
  async getCards(userId) {
    if (USE_HTTP) {
      return await http('GET', `/cards?userId=${encodeURIComponent(userId)}`);
    }
    return readLocal(KEY(`cards:${userId}`), []);
  },
  async addCard(userId, card) {
    if (USE_HTTP) {
      return await http('POST', `/cards`, { userId, ...card });
    } else {
      const list = readLocal(KEY(`cards:${userId}`), []);
      const newCard = { id: `c${Math.random().toString(36).slice(2, 8)}`, preferred: false, ...card };
      list.push(newCard);
      writeLocal(KEY(`cards:${userId}`), list);
      return newCard;
    }
  },
  async setPreferred(userId, cardId) {
    if (USE_HTTP) {
      const list = await http('GET', `/cards?userId=${encodeURIComponent(userId)}`);
      const pref = Array.isArray(list) ? list.find(c=>c.id===cardId || c._id===cardId) : null;
      // mark selected preferred and others false
      if (Array.isArray(list)) {
        await Promise.all(list.map(c => http('PATCH', `/cards/${encodeURIComponent(c.id || c._id)}`, { preferred: (c.id===cardId || c._id===cardId) })));
      }
      return true;
    }
    const list = readLocal(KEY(`cards:${userId}`), []);
    const updated = list.map(c => ({ ...c, preferred: c.id === cardId }));
    writeLocal(KEY(`cards:${userId}`), updated);
    return true;
  },
  async updateCard(userId, cardId, patch) {
    if (USE_HTTP) {
      await http('PATCH', `/cards/${encodeURIComponent(cardId)}`, patch);
      return true;
    }
    const list = readLocal(KEY(`cards:${userId}`), []);
    const idx = list.findIndex(c => c.id === cardId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeLocal(KEY(`cards:${userId}`), list);
      return list[idx];
    }
    return null;
  },
  async removeCard(userId, cardId) {
    if (USE_HTTP) {
      await http('DELETE', `/cards/${encodeURIComponent(cardId)}`);
      return true;
    } else {
      const list = readLocal(KEY(`cards:${userId}`), []);
      const updated = list.filter((c) => c.id !== cardId);
      writeLocal(KEY(`cards:${userId}`), updated);
      return true;
    }
  },

  // Stations
  async getStations() {
    if (USE_HTTP) {
      return await http('GET', `/stations`);
    }
    return readLocal(KEY('stations'), []);
  },
  async searchStations({ q, tipo }) {
    const all = USE_HTTP ? await http('GET', `/stations`) : readLocal(KEY('stations'), []);
    const matches = all.filter((s) => {
      const textOk = !q || `${s.nome} ${s.cidade}`.toLowerCase().includes(q.toLowerCase());
      const stationTipo = s.connectorType || s.tipo;
      const tipoOk = !tipo || tipo === 'Todos os tipos' || stationTipo === tipo;
      return textOk && tipoOk;
    });
    return matches;
  },

  // History
  async getHistory(userId) {
    if (USE_HTTP) {
      return await http('GET', `/history?userId=${encodeURIComponent(userId)}`);
    }
    return readLocal(KEY(`history:${userId}`), []);
  },
  async addHistory(userId, item) {
    if (USE_HTTP) {
      const newItem = { userId, data: new Date().toISOString(), ...item };
      return await http('POST', `/history`, newItem);
    } else {
      const list = readLocal(KEY(`history:${userId}`), []);
      const newItem = { id: `h${Math.random().toString(36).slice(2, 8)}`, data: new Date().toISOString(), ...item };
      list.unshift(newItem);
      writeLocal(KEY(`history:${userId}`), list);
      return newItem;
    }
  }
};

// Vehicles
export const VEHICLE_CONNECTORS = ['Tipo 1', 'Tipo 2', 'GB/T(CA)', 'CC'];

// Bank accounts (local only or http when available)
export const bankApi = {
  async list(userId) {
    if (USE_HTTP) {
      return await http('GET', `/banks?userId=${encodeURIComponent(userId)}`);
    }
    return readLocal(KEY(`bank:${userId}`), []);
  },
  async add(userId, acc) {
    if (USE_HTTP) {
      return await http('POST', `/banks`, { userId, ...acc });
    }
    const list = readLocal(KEY(`bank:${userId}`), []);
    const item = { id: `b${Math.random().toString(36).slice(2,8)}`, ...acc };
    list.push(item);
    writeLocal(KEY(`bank:${userId}`), list);
    return item;
  },
  async update(userId, id, patch) {
    if (USE_HTTP) {
      return await http('PATCH', `/banks/${encodeURIComponent(id)}`, patch);
    }
    const list = readLocal(KEY(`bank:${userId}`), []);
    const idx = list.findIndex(b => b.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      writeLocal(KEY(`bank:${userId}`), list);
      return list[idx];
    }
    return null;
  },
  async setPreferred(userId, id) {
    if (USE_HTTP) {
      // não implementado no modo HTTP
      return true;
    }
    const list = readLocal(KEY(`bank:${userId}`), []);
    const updated = list.map(b => ({ ...b, preferred: b.id === id }));
    writeLocal(KEY(`bank:${userId}`), updated);
    return true;
  },
  async remove(userId, id) {
    if (USE_HTTP) {
      await http('DELETE', `/banks/${encodeURIComponent(id)}`);
      return true;
    }
    const list = readLocal(KEY(`bank:${userId}`), []);
    writeLocal(KEY(`bank:${userId}`), list.filter(b => b.id !== id));
    return true;
  }
};

export const adminApi = {
  // simplistic active flag persistence
  async setUserActive(userId, active) {
    if (USE_HTTP) {
      return await http('PATCH', `/users/${encodeURIComponent(userId)}`, { isActive: !!active });
    }
    const users = readLocal(KEY('users'), []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx] = { ...users[idx], isActive: !!active };
      writeLocal(KEY('users'), users);
      return users[idx];
    }
    return null;
  }
};

export const vehiclesApi = {
  async list(userId) {
    if (USE_HTTP) {
      return await http('GET', `/vehicles?userId=${encodeURIComponent(userId)}`);
    }
    return readLocal(KEY(`vehicles:${userId}`), []);
  },
  async listAll() {
    if (USE_HTTP) {
      return await http('GET', `/vehicles`);
    }
    // local: concatenar vehicles de todos os usuários conhecidos
    const users = readLocal(KEY('users'), []);
    const all = [];
    for (const u of users) {
      const list = readLocal(KEY(`vehicles:${u.id}`), []);
      for (const v of list) {
        all.push(v);
      }
    }
    return all;
  },
  async add(userId, vehicle) {
    if (USE_HTTP) {
      const now = new Date().toISOString();
      return await http('POST', `/vehicles`, {
        userId,
        nome: vehicle.nome || 'Veículo',
        marca: vehicle.marca || null,
        modelo: vehicle.modelo || null,
        placa: (vehicle.placa || '').toUpperCase(),
        conector: VEHICLE_CONNECTORS.includes(vehicle.conector) ? vehicle.conector : 'Tipo 1',
        bateriaKwh: Number(vehicle.bateriaKwh || 0),
        isActive: vehicle.isActive !== false,
        createdAt: now,
        updatedAt: now
      });
    } else {
      const list = readLocal(KEY(`vehicles:${userId}`), []);
      const newItem = {
        id: `v${Math.random().toString(36).slice(2, 8)}`,
        nome: vehicle.nome || 'Veículo',
        marca: vehicle.marca || null,
        modelo: vehicle.modelo || null,
        placa: (vehicle.placa || '').toUpperCase(),
        conector: VEHICLE_CONNECTORS.includes(vehicle.conector) ? vehicle.conector : 'Tipo 1',
        bateriaKwh: Number(vehicle.bateriaKwh || 0),
        isActive: vehicle.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      writeLocal(KEY(`vehicles:${userId}`), list);
      return newItem;
    }
  },
  async remove(userId, vehicleId) {
    if (USE_HTTP) {
      await http('DELETE', `/vehicles/${encodeURIComponent(vehicleId)}`);
      return true;
    } else {
      const list = readLocal(KEY(`vehicles:${userId}`), []);
      const updated = list.filter(v => v.id !== vehicleId);
      writeLocal(KEY(`vehicles:${userId}`), updated);
      return true;
    }
  },
  async update(userId, vehicleId, patch) {
    if (USE_HTTP) {
      const body = { ...patch };
      if (body.placa) body.placa = body.placa.toUpperCase();
      if (body.bateriaKwh != null) body.bateriaKwh = Number(body.bateriaKwh);
      body.updatedAt = new Date().toISOString();
      return await http('PATCH', `/vehicles/${encodeURIComponent(vehicleId)}`, body);
    } else {
      const list = readLocal(KEY(`vehicles:${userId}`), []);
      const idx = list.findIndex(v => v.id === vehicleId);
      if (idx < 0) return false;
      const next = {
        ...list[idx],
        ...patch,
        placa: (patch?.placa ?? list[idx].placa)?.toUpperCase?.() || list[idx].placa,
        bateriaKwh: patch?.bateriaKwh !== undefined ? Number(patch.bateriaKwh) : list[idx].bateriaKwh
      };
      if (patch?.conector && !VEHICLE_CONNECTORS.includes(patch.conector)) {
        next.conector = 'Tipo 1';
      }
      next.updatedAt = new Date().toISOString();
      list[idx] = next;
      writeLocal(KEY(`vehicles:${userId}`), list);
      return next;
    }
  }
};

// Users CRUD
export const usersApi = {
  async list() {
    if (USE_HTTP) return await http('GET', `/users`);
    return readLocal(KEY('users'), []);
  },
  async add(user) {
    if (USE_HTTP) {
      const body = { ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return await http('POST', `/users`, body);
    } else {
      const list = readLocal(KEY('users'), []);
      const item = { id: `u${Math.random().toString(36).slice(2,8)}`, ...user };
      list.push(item);
      writeLocal(KEY('users'), list);
      return item;
    }
  },
  async update(id, patch) {
    if (USE_HTTP) {
      const body = { ...patch, updatedAt: new Date().toISOString() };
      return await http('PATCH', `/users/${encodeURIComponent(id)}`, body);
    } else {
      const list = readLocal(KEY('users'), []);
      const idx = list.findIndex(u => u.id === id);
      if (idx < 0) return null;
      list[idx] = { ...list[idx], ...patch };
      writeLocal(KEY('users'), list);
      return list[idx];
    }
  },
  async remove(id) {
    if (USE_HTTP) {
      await http('DELETE', `/users/${encodeURIComponent(id)}`);
      return true;
    } else {
      const list = readLocal(KEY('users'), []);
      writeLocal(KEY('users'), list.filter(u => u.id !== id));
      return true;
    }
  }
};

// Stations CRUD
export const stationsApi = {
  async list() {
    if (USE_HTTP) return await http('GET', `/stations`);
    return readLocal(KEY('stations'), []);
  },
  async listByUser(userId) {
    if (USE_HTTP) return await http('GET', `/stations?userId=${encodeURIComponent(userId)}`);
    const all = readLocal(KEY('stations'), []);
    return all.filter(s => s.userId === userId);
  },
  async add(station) {
    if (USE_HTTP) {
      const now = new Date().toISOString();
      return await http('POST', `/stations`, { ...station, createdAt: now, updatedAt: now });
    } else {
      const list = readLocal(KEY('stations'), []);
      const item = { id: `s${Math.random().toString(36).slice(2,8)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...station };
      list.push(item);
      writeLocal(KEY('stations'), list);
      return item;
    }
  },
  async update(id, patch) {
    if (USE_HTTP) {
      return await http('PATCH', `/stations/${encodeURIComponent(id)}`, { ...patch, updatedAt: new Date().toISOString() });
    } else {
      const list = readLocal(KEY('stations'), []);
      const idx = list.findIndex(s => s.id === id);
      if (idx < 0) return null;
      list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
      writeLocal(KEY('stations'), list);
      return list[idx];
    }
  },
  async remove(id) {
    if (USE_HTTP) {
      await http('DELETE', `/stations/${encodeURIComponent(id)}`);
      return true;
    } else {
      const list = readLocal(KEY('stations'), []);
      writeLocal(KEY('stations'), list.filter(s => s.id !== id));
      return true;
    }
  }
};

