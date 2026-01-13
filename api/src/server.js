import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  User, Vehicle, Station, Wallet, Card, Bank, History
} from './models.js';
import { signToken, requireAuth, requireRole } from './auth.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/recshop';

// DB
mongoose.connect(MONGO_URI).then(()=> {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB error', err);
});

// Helpers
function asArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }
const wrap = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
function safeUser(u){
  if (!u) return null;
  const obj = typeof u.toObject === 'function' ? u.toObject() : u;
  const { password, ...rest } = obj;
  return { ...rest, id: obj._id?.toString?.() };
}
function ensureObjectId(id, res){
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'invalid_id', detail: id });
    return false;
  }
  return true;
}

// Auth and Users
app.post('/auth/login', wrap(async (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });
  const u = await User.findOne({ email, password });
  if (!u) return res.status(401).json({ error: 'invalid_credentials' });
  const userPayload = safeUser(u);
  const token = signToken({ id: userPayload.id, role: u.role, nome: u.nome, email: u.email });
  return res.json({ ...userPayload, token });
}));

app.get('/users', wrap(async (req,res)=>{
  const { email, password } = req.query;
  if (email && password) {
    const u = await User.findOne({ email, password });
    if (!u) return res.json([]);
    const userPayload = safeUser(u);
    const token = signToken({ id: userPayload.id, role: u.role, nome: u.nome, email: u.email });
    return res.json([{ ...userPayload, token }]);
  }
  const list = (await User.find()).map(safeUser);
  res.json(list);
}));
app.post('/users', wrap(async (req,res)=>{
  const u = await User.create(req.body);
  const payload = safeUser(u);
  const token = signToken({ id: payload.id, role: u.role, nome: u.nome, email: u.email });
  res.json({ ...payload, token });
}));
app.patch('/users/:id', requireAuth, wrap(async (req,res)=>{
  const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(u);
}));

// Wallets
app.get('/wallets', wrap(async (req,res)=>{
  const { userId } = req.query;
  if (!userId) return res.json([]);
  if (!ensureObjectId(userId, res)) return;
  const w = await Wallet.findOne({ userId }).lean();
  res.json(w ? [w] : []);
}));
app.post('/wallets', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.body?.userId, res)) return;
  const w = await Wallet.create(req.body);
  res.json(w);
}));
app.patch('/wallets/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  const w = await Wallet.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(w);
}));

// Cards
app.get('/cards', wrap(async (req,res)=>{
  const { userId } = req.query;
  if (userId && !ensureObjectId(userId, res)) return;
  const list = await Card.find(userId ? { userId } : {}).lean();
  res.json(list);
}));
app.post('/cards', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.body?.userId, res)) return;
  const c = await Card.create(req.body);
  res.json(c);
}));
app.patch('/cards/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  const c = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(c);
}));
app.delete('/cards/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  await Card.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Banks (Pix)
app.get('/banks', wrap(async (req,res)=>{
  const { userId } = req.query;
  if (userId && !ensureObjectId(userId, res)) return;
  const list = await Bank.find(userId ? { userId } : {}).lean();
  res.json(list);
}));
app.post('/banks', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.body?.userId, res)) return;
  const b = await Bank.create(req.body);
  res.json(b);
}));
app.patch('/banks/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  const b = await Bank.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(b);
}));
app.delete('/banks/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  await Bank.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Vehicles
app.get('/vehicles', wrap(async (req,res)=>{
  const { userId } = req.query;
  if (userId && !ensureObjectId(userId, res)) return;
  const list = await Vehicle.find(userId ? { userId } : {}).lean();
  res.json(list);
}));
app.post('/vehicles', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.body?.userId, res)) return;
  const v = await Vehicle.create(req.body);
  res.json(v);
}));
app.patch('/vehicles/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  const v = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(v);
}));
app.delete('/vehicles/:id', requireAuth, wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  await Vehicle.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Stations
app.get('/stations', wrap(async (req,res)=>{
  const list = await Station.find().lean();
  res.json(list);
}));
app.post('/stations', requireAuth, requireRole('host','admin'), wrap(async (req,res)=>{
  const s = await Station.create(req.body);
  res.json(s);
}));
app.patch('/stations/:id', requireAuth, requireRole('host','admin'), wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  const s = await Station.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(s);
}));
app.delete('/stations/:id', requireAuth, requireRole('admin'), wrap(async (req,res)=>{
  if (!ensureObjectId(req.params.id, res)) return;
  await Station.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// History
app.get('/history', wrap(async (req,res)=>{
  const { userId } = req.query;
  if (userId && !ensureObjectId(userId, res)) return;
  const list = await History.find(userId ? { userId } : {}).lean();
  res.json(list);
}));
app.post('/history', requireAuth, wrap(async (req,res)=>{
  if (req.body?.userId && !ensureObjectId(req.body.userId, res)) return;
  const h = await History.create({ ...req.body, data: new Date() });
  res.json(h);
}));

// Health
app.get('/', (_req,res)=> res.json({ ok: true }));

app.listen(PORT, ()=> console.log(`API listening on http://localhost:${PORT}`));

// Global error safety nets
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err);
});
app.use((err, _req, res, _next) => {
  console.error('Request error', err);
  const status = err?.status || 500;
  res.status(status).json({ error: 'server_error' });
});

