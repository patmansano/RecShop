import React from 'react';
import { api, vehiclesApi, stationsApi, usersApi } from '../services/api.js';

const LS = (name) => `recshop:${name}`;

const StoreContext = React.createContext(null);

const initialState = {
  user: null,
  wallet: { saldo: 0 },
  cards: [],
  stations: [],
  history: [],
  sessionDraft: null,
  runningSessions: [],
    scheduledSessions: [],
  vehicles: [],
  loading: false,
  error: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_WALLET':
      return { ...state, wallet: action.payload || { saldo: 0 } };
    case 'SET_CARDS':
      return { ...state, cards: action.payload || [] };
    case 'SET_STATIONS':
      return { ...state, stations: action.payload || [] };
    case 'SET_HISTORY':
      return { ...state, history: action.payload || [] };
    case 'SET_SESSION_DRAFT':
      return { ...state, sessionDraft: action.payload || null };
    case 'SET_RUNNING_SESSIONS':
      return { ...state, runningSessions: action.payload || [] };
    case 'SET_SCHEDULED_SESSIONS':
      return { ...state, scheduledSessions: action.payload || [] };
    case 'SET_VEHICLES':
      return { ...state, vehicles: action.payload || [] };
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  function getNextChargeId() {
    try {
      const raw = localStorage.getItem(LS('chargeCounter'));
      const next = Number(raw || 0) + 1;
      localStorage.setItem(LS('chargeCounter'), String(next));
      return next;
    } catch (_e) {
      return Math.floor(Math.random() * 100000);
    }
  }

  // bootstrap: current user
  React.useEffect(() => {
    const current = api.getCurrentUser();
    if (current) {
      dispatch({ type: 'SET_USER', payload: current });
      refreshUserData(current.id);
    }
    // load stations at start
    api.getStations().then((s) => dispatch({ type: 'SET_STATIONS', payload: s }));
    // load session draft if any
    try {
      const raw = localStorage.getItem(LS('sessionDraft'));
      if (raw) {
        const draft = JSON.parse(raw);
        dispatch({ type: 'SET_SESSION_DRAFT', payload: draft });
      }
    } catch (_e) {}
    // load running sessions
    try {
      const raw = localStorage.getItem(LS('runningSessions'));
      if (raw) {
        dispatch({ type: 'SET_RUNNING_SESSIONS', payload: JSON.parse(raw) || [] });
      }
    } catch (_e) {}
    // load scheduled sessions
    try {
      const raw = localStorage.getItem(LS('scheduledSessions'));
      if (raw) {
        const all = JSON.parse(raw) || [];
        // apenas do usuário logado
        const mine = state.user ? all.filter(s => s.userId === state.user.id) : all;
        // não filtramos por usuário aqui para não perder outras contas; guardamos todos
        dispatch({ type: 'SET_SCHEDULED_SESSIONS', payload: mine });
      }
    } catch (_e) {}
  }, []);

  // Listen auto-logout events from API (401)
  React.useEffect(() => {
    function handleAutoLogout(){
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_WALLET', payload: { saldo: 0 } });
      dispatch({ type: 'SET_CARDS', payload: [] });
      dispatch({ type: 'SET_HISTORY', payload: [] });
      dispatch({ type: 'SET_VEHICLES', payload: [] });
    }
    window.addEventListener('recshop:auth-logout', handleAutoLogout);
    return () => window.removeEventListener('recshop:auth-logout', handleAutoLogout);
  }, []);

  // recarrega agendadas quando usuário muda (login/logout)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS('scheduledSessions'));
      const all = raw ? JSON.parse(raw) : [];
      const mine = state.user ? all.filter(s => s.userId === state.user.id) : [];
      dispatch({ type: 'SET_SCHEDULED_SESSIONS', payload: mine });
    } catch (_e) {
      dispatch({ type: 'SET_SCHEDULED_SESSIONS', payload: [] });
    }
  }, [state.user]);

  // Promove reservas vencidas para sessões em andamento
  React.useEffect(() => {
    const tick = async () => {
      if (!state.user) return;
      const now = Date.now();
      const due = (state.scheduledSessions || []).filter(s => s.userId === state.user.id && s.when && new Date(s.when).getTime() <= now);
      if (!due.length) return;
      for (const s of due) {
        try {
          const station = state.stations.find(st => st.id === s.stationId);
          if (!station) continue;
          const available = Number(station.qtdDisponivel || 0);
          if (available <= 0) continue; // sem conector, mantém agendada
          // decrementa disponibilidade
          try { await stationsApi.update(station.id, { qtdDisponivel: available - 1 }); } catch (_e) {}
          // calcula estimativa a partir do total pago/preço
          const price = Number(station.precoKwh || 0);
          const kwh = price > 0 ? Number((Number(s.totalCost || 0) / price).toFixed(2)) : 5;
          const power = Number(station.potenciaKw || 0);
          const estimatedMinutes = power > 0 ? Math.max(5, Math.round((kwh / power) * 60)) : 60;
          const nowTs = Date.now();
          const endAtMs = nowTs + estimatedMinutes * 60 * 1000;
          const totalConnectors = Number(station.qtdTotal || 1);
          const afterDec = Math.max(0, available - 1);
          const connectorNumber = s.connector || Math.max(1, totalConnectors - afterDec);
          const running = {
            id: `sess_${Math.random().toString(36).slice(2,9)}`,
            chargeId: s.chargeId,
            userId: state.user.id,
            stationId: station.id,
            stationName: station.nome,
            connector: connectorNumber,
            startAt: new Date(nowTs).toISOString(),
            endAt: new Date(endAtMs).toISOString(),
            mode: s.mode || 'Agendada',
            targetPct: s.targetPct != null ? Number(s.targetPct) : null,
            chargePct: s.chargePct != null ? Number(s.chargePct) : null,
            vehicleId: s.vehicleId || null,
            vehicleName: s.vehicleName || null,
            kwh,
            price,
            totalCost: Number(s.totalCost || 0),
            paidMethod: (Number(s.paidWalletAmount||0) > 0) ? 'wallet+card' : 'card',
            paidWalletAmount: Number(s.paidWalletAmount || 0),
            cardAmount: Number(s.cardAmount || 0),
            status: 'running'
          };
          const nextRunning = [...state.runningSessions, running];
          try { localStorage.setItem(LS('runningSessions'), JSON.stringify(nextRunning)); } catch (_e) {}
          dispatch({ type: 'SET_RUNNING_SESSIONS', payload: nextRunning });
          // remove da agendada
          const nextSched = (state.scheduledSessions || []).filter(x => x.id !== s.id);
          dispatch({ type: 'SET_SCHEDULED_SESSIONS', payload: nextSched });
          try {
            const raw = localStorage.getItem(LS('scheduledSessions'));
            const all = raw ? JSON.parse(raw) : [];
            localStorage.setItem(LS('scheduledSessions'), JSON.stringify(all.filter(x => x.id !== s.id)));
          } catch (_e) {}
        } catch (_e) {}
      }
    };
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [state.user, state.scheduledSessions, state.stations, state.runningSessions]);

  const refreshUserData = React.useCallback(async (userId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [wallet, cards, history, vehicles] = await Promise.all([
        api.getWallet(userId),
        api.getCards(userId),
        api.getHistory(userId),
        vehiclesApi.list(userId)
      ]);
      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_CARDS', payload: cards });
      dispatch({ type: 'SET_HISTORY', payload: history });
      dispatch({ type: 'SET_VEHICLES', payload: vehicles });
      // Se usuário logado é admin, sincroniza saldo com soma de refunds do histórico de todos
      if (state.user && state.user.id === userId && state.user.role === 'admin') {
        try{
          const users = await usersApi.list();
          let total = 0;
          for (const u of users) {
            const h = await api.getHistory(u.id);
            for (const it of (h || [])) {
              total += Number(it.refund || 0);
            }
          }
          const saldo = Number(total.toFixed(2));
          await api.setWallet(userId, { saldo });
          dispatch({ type: 'SET_WALLET', payload: { saldo } });
        }catch(_e){}
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message || String(e) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const actions = {
    async login({ email, password }) {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const user = await api.login({ email, password });
        dispatch({ type: 'SET_USER', payload: user });
        await refreshUserData(user.id);
        return user;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    async signup({ nome, email, password, role }) {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const user = await api.signup({ nome, email, password, role });
        dispatch({ type: 'SET_USER', payload: user });
        await refreshUserData(user.id);
        return user;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    async logout() {
      await api.logout();
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_WALLET', payload: { saldo: 0 } });
      dispatch({ type: 'SET_CARDS', payload: [] });
      dispatch({ type: 'SET_HISTORY', payload: [] });
    },
    async refreshWallet() {
      if (!state.user) return;
      const wallet = await api.getWallet(state.user.id);
      dispatch({ type: 'SET_WALLET', payload: wallet });
    },
    async loadVehicles() {
      if (!state.user) return;
      const vs = await vehiclesApi.list(state.user.id);
      dispatch({ type: 'SET_VEHICLES', payload: vs });
    },
    async addVehicle(vehicle) {
      if (!state.user) return;
      const created = await vehiclesApi.add(state.user.id, vehicle);
      dispatch({ type: 'SET_VEHICLES', payload: [...state.vehicles, created] });
    },
    async removeVehicle(vehicleId) {
      if (!state.user) return;
      await vehiclesApi.remove(state.user.id, vehicleId);
      dispatch({ type: 'SET_VEHICLES', payload: state.vehicles.filter(v => v.id !== vehicleId) });
    },
    async updateVehicle(vehicleId, patch) {
      if (!state.user) return;
      const updated = await vehiclesApi.update(state.user.id, vehicleId, patch);
      dispatch({
        type: 'SET_VEHICLES',
        payload: state.vehicles.map(v => v.id === vehicleId ? updated : v)
      });
    },
    async addCard(card) {
      if (!state.user) return;
      await api.addCard(state.user.id, card);
      const cards = await api.getCards(state.user.id);
      dispatch({ type: 'SET_CARDS', payload: cards });
    },
    async removeCard(cardId) {
      if (!state.user) return;
      await api.removeCard(state.user.id, cardId);
      const cards = await api.getCards(state.user.id);
      dispatch({ type: 'SET_CARDS', payload: cards });
    },
    async loadStations() {
      const s = await api.getStations();
      dispatch({ type: 'SET_STATIONS', payload: s });
    },
    async searchStations({ q, tipo }) {
      const s = await api.searchStations({ q, tipo });
      dispatch({ type: 'SET_STATIONS', payload: s });
    },
    setSessionDraft(station, extra) {
      const draft = station
        ? { stationId: station.id, stationName: station.nome, ...(extra||{}) }
        : null;
      try {
        if (draft) {
          localStorage.setItem(LS('sessionDraft'), JSON.stringify(draft));
        } else {
          localStorage.removeItem(LS('sessionDraft'));
        }
      } catch (_e) {}
      dispatch({ type: 'SET_SESSION_DRAFT', payload: draft });
    },
    async reserveStation(station, schedule) {
      if (!state.user) {
        alert('Faça login para reservar.');
        return;
      }
      // custo estimado com base no kwh enviado pela tela
      const price = Number(station.precoKwh || 0);
      const kwh = Number(schedule?.kwh != null ? schedule.kwh : 5);
      const total = Number((price * kwh).toFixed(2));
      const wallet = await api.getWallet(state.user.id);
      const saldo = Number(wallet?.saldo || 0);
      const usaSaldo = window.confirm(
        `Agendamento em ${station.nome}\n` +
        `Energia estimada: ${kwh.toFixed(2)} kWh\n` +
        `Tempo estimado: ${(() => {
          const p = Number(station.potenciaKw || 0);
          if (p <= 0) return '-';
          const min = Math.max(5, Math.round((kwh / p) * 60));
          const h = Math.floor(min / 60), m = min % 60;
          return h > 0 ? `${h} h ${m} min` : `${m} min`;
        })()}\n` +
        `Valor estimado: R$ ${total.toFixed(2).replace('.', ',')}\n` +
        `Saldo disponível: R$ ${saldo.toFixed(2).replace('.', ',')}\n\n` +
        `OK: Usar saldo e pagar o restante no cartão.\n` +
        `Cancelar: Pagar 100% no cartão.`
      );
      let paidWallet = 0, cardAmount = total;
      if (usaSaldo && saldo > 0) {
        paidWallet = Math.min(saldo, total);
        cardAmount = Number((total - paidWallet).toFixed(2));
        await api.setWallet(state.user.id, { saldo: Number((saldo - paidWallet).toFixed(2)) });
        dispatch({ type: 'SET_WALLET', payload: { saldo: Number((saldo - paidWallet).toFixed(2)) } });
      }
      // cria registro agendado
      const sched = {
        id: `sch_${Math.random().toString(36).slice(2,9)}`,
        chargeId: getNextChargeId(),
        userId: state.user.id,
        stationId: station.id,
        stationName: station.nome,
        when: schedule?.when || null,
        connector: schedule?.connector || null,
        totalCost: total,
        price,
        kwh,
        estimatedMinutes: Number(schedule?.estimatedMinutes || 0),
        mode: schedule?.mode || null,
        targetPct: schedule?.targetPct != null ? Number(schedule.targetPct) : null,
        chargePct: schedule?.chargePct != null ? Number(schedule.chargePct) : null,
        vehicleId: schedule?.vehicleId || null,
        vehicleName: schedule?.vehicleName || null,
        paidWalletAmount: paidWallet,
        cardAmount,
        status: 'scheduled'
      };
      try {
        const raw = localStorage.getItem(LS('scheduledSessions'));
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(sched);
        localStorage.setItem(LS('scheduledSessions'), JSON.stringify(arr));
      } catch (_e) {}
      // atualiza estado imediatamente
      dispatch({ type: 'SET_SCHEDULED_SESSIONS', payload: [...state.scheduledSessions, sched] });
      // registra histórico da reserva
      try {
        await api.addHistory(state.user.id, {
          chargeId: sched.chargeId,
          stationId: station.id,
          stationName: station.nome,
          vehicleName: sched.vehicleName || null,
          startAt: sched.when,
          endAt: null,
          total,
          mode: sched.mode || null,
          targetPct: sched.targetPct != null ? Number(sched.targetPct) : null,
          chargePct: sched.chargePct != null ? Number(sched.chargePct) : null,
          kwh,
          status: 'reserva',
          kind: 'reserva'
        });
        const history = await api.getHistory(state.user.id);
        dispatch({ type: 'SET_HISTORY', payload: history });
      } catch (_e) {}
      alert('Agendamento pago e aguardando horário.');
    },
    async cancelScheduled(schedId) {
      if (!state.user) return;
      const s = (state.scheduledSessions || []).find(x => x.id === schedId);
      if (!s) return;
      // devolve cashback pago
      try {
        if (Number(s.paidWalletAmount || 0) > 0) {
          const wallet = await api.getWallet(state.user.id);
          const updated = { saldo: Number(((wallet.saldo || 0) + Number(s.paidWalletAmount || 0)).toFixed(2)) };
          await api.setWallet(state.user.id, updated);
          dispatch({ type: 'SET_WALLET', payload: updated });
        }
      } catch (_e) {}
      // remove da lista de agendadas
      const next = (state.scheduledSessions || []).filter(x => x.id !== schedId);
      try {
        const raw = localStorage.getItem(LS('scheduledSessions'));
        const all = raw ? JSON.parse(raw) : [];
        const allNext = all.filter(x => x.id !== schedId);
        localStorage.setItem(LS('scheduledSessions'), JSON.stringify(allNext));
      } catch (_e) {}
      dispatch({ type: 'SET_SCHEDULED_SESSIONS', payload: next });
      // registra histórico de cancelamento da reserva
      try {
        await api.addHistory(state.user.id, {
          chargeId: s.chargeId,
          stationId: s.stationId,
          stationName: s.stationName,
          total: 0,
          refund: Number(s.paidWalletAmount || 0),
          refundCard: Number(s.cardAmount || 0),
          status: 'reserva_cancelada',
          kind: 'reserva'
        });
        const history = await api.getHistory(state.user.id);
        dispatch({ type: 'SET_HISTORY', payload: history });
      } catch (_e) {}
      alert('Reserva cancelada. Pagamentos estornados.');
    },
    async startSession(station, opts) {
      if (!state.user) {
        alert('Faça login para iniciar a sessão.');
        return;
      }
      // checa disponibilidade de conectores
      const currentStation = state.stations.find(st => st.id === station.id) || station;
      const available = Number(currentStation.qtdDisponivel || 0);
      if (available <= 0) {
        alert('Estação indisponível no momento (sem conectores disponíveis).');
        return;
      }
      // bloqueia duplicidade para o mesmo veículo em qualquer estação
      if (state.runningSessions.some(s =>
        s.userId === state.user.id && s.vehicleId === opts?.vehicleId && s.status === 'running'
      )) {
        alert('Já existe uma sessão de recarga em andamento para este veículo. Conclua ou cancele a sessão antes de iniciar outra.');
        return;
      }
      // bloqueia veiculo inativo
      if (opts?.vehicleId) {
        const vv = state.vehicles.find(v => v.id === opts.vehicleId);
        if (vv && vv.isActive === false) {
          alert('Este veículo está inativo e não pode iniciar recarga.');
          return;
        }
      }
      // bloqueia carga 100%
      if (Number(opts?.chargePct) >= 100) {
        alert('A carga atual do veículo é 100%. Não é possível iniciar uma nova recarga.');
        return;
      }
      const kwh = opts?.kwh != null ? Number(opts.kwh) : 10; // estimativa baseada na tela
      const price = Number(station.precoKwh || 0);
      const total = price * kwh; // custo estimado total
      await api.addHistory(state.user.id, {
        stationId: station.id,
        stationName: station.nome,
        total,
        kind: 'sessao'
      });
      // decrementa conectores disponíveis (se houver)
      const current = Number(station.qtdDisponivel || 0);
      if (!Number.isNaN(current) && current > 0) {
        await stationsApi.update(station.id, { qtdDisponivel: current - 1 });
      }
      // cria sessão em andamento (estimativa de término)
      const now = Date.now();
      const durationMin = Math.max(5, Number(opts?.estimatedMinutes ?? 60)); // duração prevista
      const endAtMs = now + durationMin * 60 * 1000;
      const totalConnectors = Number(station.qtdTotal || 1);
      const afterDecrement = Math.max(0, current - 1);
      const connectorNumber = Math.max(1, totalConnectors - afterDecrement);
      const session = {
        id: `sess_${Math.random().toString(36).slice(2,9)}`,
        chargeId: getNextChargeId(),
        userId: state.user.id,
        stationId: station.id,
        stationName: station.nome,
        connector: connectorNumber,
        startAt: new Date(now).toISOString(),
        endAt: new Date(endAtMs).toISOString(),
        mode: opts?.mode || 'Parcial',
        targetPct: opts?.targetPct != null ? Number(opts.targetPct) : null,
        chargePct: opts?.chargePct != null ? Number(opts.chargePct) : null,
        vehicleId: opts?.vehicleId || null,
        vehicleName: opts?.vehicleName || null,
        kwh,
        price,
        totalCost: total,
        paidMethod: opts?.payWithWallet ? 'wallet' : 'card',
        paidWalletAmount: 0,
        cardAmount: total,
        status: 'running'
      };
      // pagamento antes do início
      if (opts?.payWithWallet) {
        try {
          const wallet = await api.getWallet(state.user.id);
          const debit = Math.min(wallet.saldo || 0, total);
          if (debit > 0) {
            await api.setWallet(state.user.id, { saldo: Number((wallet.saldo - debit).toFixed(2)) });
            session.paidWalletAmount = debit;
            session.cardAmount = Number((total - debit).toFixed(2));
          }
        } catch (_e) {}
      }
      const list = [...state.runningSessions, session];
      try { localStorage.setItem(LS('runningSessions'), JSON.stringify(list)); } catch (_e) {}
      dispatch({ type: 'SET_RUNNING_SESSIONS', payload: list });
      // atualiza listas locais
      const [history, stations] = await Promise.all([
        api.getHistory(state.user.id),
        api.getStations()
      ]);
      dispatch({ type: 'SET_HISTORY', payload: history });
      dispatch({ type: 'SET_STATIONS', payload: stations });
      alert('Sessão iniciada.');
    },
    async finalizeSession(sessionId) {
      const s = state.runningSessions.find(x => x.id === sessionId);
      if (!s) return;
      const now = Date.now();
      const start = new Date(s.startAt).getTime();
      const end = new Date(s.endAt).getTime();
      const totalDur = Math.max(1, end - start);
      const elapsed = Math.min(now, end) - start;
      const fracElapsed = Math.min(1, Math.max(0, elapsed / totalDur));
      const consumedValue = Number(((s.totalCost || 0) * fracElapsed).toFixed(2));
      // adiciona ao histórico como recarga finalizada
        await api.addHistory(state.user.id, {
        chargeId: s.chargeId,
        stationId: s.stationId,
        stationName: s.stationName,
        vehicleName: s.vehicleName || null,
        startAt: s.startAt,
        endAt: new Date(Math.max(now, end)).toISOString(),
        total: consumedValue,
          mode: s.mode || null,
          targetPct: s.targetPct != null ? Number(s.targetPct) : null,
        kind: 'recarga'
      });
      // libera conector
      try {
        const station = state.stations.find(st => st.id === s.stationId);
        if (station) {
          const qd = Number(station.qtdDisponivel || 0);
          await stationsApi.update(station.id, { qtdDisponivel: qd + 1 });
        }
      } catch (_e) {}
      // remove sessão
      const list = state.runningSessions.filter(x => x.id !== sessionId);
      try { localStorage.setItem(LS('runningSessions'), JSON.stringify(list)); } catch (_e) {}
      dispatch({ type: 'SET_RUNNING_SESSIONS', payload: list });
      // atualiza histórico local
      const history = await api.getHistory(state.user.id);
      dispatch({ type: 'SET_HISTORY', payload: history });
      alert('Sessão finalizada e registrada no histórico.');
    },
    async cancelSession(sessionId) {
      const s = state.runningSessions.find(x => x.id === sessionId);
      if (!s) return;
      // calcula fração restante
      const now = Date.now();
      const start = new Date(s.startAt).getTime();
      const end = new Date(s.endAt).getTime();
      const totalDur = Math.max(1, end - start);
      const elapsed = Math.min(now, end) - start;
      const fracElapsed = Math.min(1, Math.max(0, elapsed / totalDur));
      const consumedValue = Number(((s.totalCost || 0) * fracElapsed).toFixed(2));
      const remainingValue = Math.max(0, Number(((s.totalCost || 0) - consumedValue).toFixed(2)));
      // cashback do restante
      try {
        const wallet = await api.getWallet(state.user.id);
        const updated = { saldo: Number(((wallet.saldo || 0) + remainingValue).toFixed(2)) };
        await api.setWallet(state.user.id, updated);
        dispatch({ type: 'SET_WALLET', payload: updated });
      } catch (_e) {}
      // registra no histórico como recarga cancelada
        await api.addHistory(state.user.id, {
        chargeId: s.chargeId,
        stationId: s.stationId,
        stationName: s.stationName,
        vehicleName: s.vehicleName || null,
        startAt: s.startAt,
        endAt: new Date(Math.max(now, end)).toISOString(),
        total: consumedValue,
        refund: remainingValue,
        status: 'cancelada',
          mode: s.mode || null,
          targetPct: s.targetPct != null ? Number(s.targetPct) : null,
        kind: 'recarga'
      });
      // libera conector (incrementa disponibilidade)
      try {
        const station = state.stations.find(st => st.id === s.stationId);
        if (station) {
          const qd = Number(station.qtdDisponivel || 0);
          await stationsApi.update(station.id, { qtdDisponivel: qd + 1 });
        }
      } catch (_e) {}
      // remove sessão
      const list = state.runningSessions.filter(x => x.id !== sessionId);
      try { localStorage.setItem(LS('runningSessions'), JSON.stringify(list)); } catch (_e) {}
      dispatch({ type: 'SET_RUNNING_SESSIONS', payload: list });
      // atualiza histórico local
      try {
        const history = await api.getHistory(state.user.id);
        dispatch({ type: 'SET_HISTORY', payload: history });
      } catch (_e) {}
      alert('Sessão cancelada. Cashback creditado do valor restante.');
    }
  };

  const value = React.useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

