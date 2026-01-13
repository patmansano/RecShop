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

// Auth and Users
app.post('/auth/login', async (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });
  const u = await User.findOne({ email, password }).lean();
  if (!u) return res.status(401).json({ error: 'invalid_credentials' });
  const token = signToken({ id: u._id, role: u.role, nome: u.nome, email: u.email });
  return res.json({ ...u, token });
});

app.get('/users', async (req,res)=>{
  const { email, password } = req.query;
  if (email && password) {
    const u = await User.findOne({ email, password }).lean();
    if (!u) return res.json([]);
    const token = signToken({ id: u._id, role: u.role, nome: u.nome, email: u.email });
    return res.json([{ ...u, token }]);
  }
  const list = await User.find().lean();
  res.json(list);
});
app.post('/users', async (req,res)=>{
  const u = await User.create(req.body);
  const token = signToken({ id: u._id, role: u.role, nome: u.nome, email: u.email });
  res.json({ ...u.toObject(), token });
});
app.patch('/users/:id', requireAuth, async (req,res)=>{
  const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(u);
});

// Wallets
app.get('/wallets', async (req,res)=>{
  const { userId } = req.query;
  if (!userId) return res.json([]);
  const w = await Wallet.findOne({ userId }).lean();
  res.json(w ? [w] : []);
});
app.post('/wallets', requireAuth, async (req,res)=>{
  const w = await Wallet.create(req.body);
  res.json(w);
});
app.patch('/wallets/:id', requireAuth, async (req,res)=>{
  const w = await Wallet.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(w);
});

// Cards
app.get('/cards', async (req,res)=>{
  const { userId } = req.query;
  const list = await Card.find(userId ? { userId } : {}).lean();
  res.json(list);
});
app.post('/cards', requireAuth, async (req,res)=>{
  const c = await Card.create(req.body);
  res.json(c);
});
app.patch('/cards/:id', requireAuth, async (req,res)=>{
  const c = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(c);
});
app.delete('/cards/:id', requireAuth, async (req,res)=>{
  await Card.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Banks (Pix)
app.get('/banks', async (req,res)=>{
  const { userId } = req.query;
  const list = await Bank.find(userId ? { userId } : {}).lean();
  res.json(list);
});
app.post('/banks', requireAuth, async (req,res)=>{
  const b = await Bank.create(req.body);
  res.json(b);
});
app.patch('/banks/:id', requireAuth, async (req,res)=>{
  const b = await Bank.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(b);
});
app.delete('/banks/:id', requireAuth, async (req,res)=>{
  await Bank.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Vehicles
app.get('/vehicles', async (req,res)=>{
  const { userId } = req.query;
  const list = await Vehicle.find(userId ? { userId } : {}).lean();
  res.json(list);
});
app.post('/vehicles', requireAuth, async (req,res)=>{
  const v = await Vehicle.create(req.body);
  res.json(v);
});
app.patch('/vehicles/:id', requireAuth, async (req,res)=>{
  const v = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(v);
});
app.delete('/vehicles/:id', requireAuth, async (req,res)=>{
  await Vehicle.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Stations
app.get('/stations', async (req,res)=>{
  const list = await Station.find().lean();
  res.json(list);
});
app.post('/stations', requireAuth, requireRole('host','admin'), async (req,res)=>{
  const s = await Station.create(req.body);
  res.json(s);
});
app.patch('/stations/:id', requireAuth, requireRole('host','admin'), async (req,res)=>{
  const s = await Station.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(s);
});
app.delete('/stations/:id', requireAuth, requireRole('admin'), async (req,res)=>{
  await Station.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// History
app.get('/history', async (req,res)=>{
  const { userId } = req.query;
  const list = await History.find(userId ? { userId } : {}).lean();
  res.json(list);
});
app.post('/history', requireAuth, async (req,res)=>{
  const h = await History.create({ ...req.body, data: new Date() });
  res.json(h);
});

// Health
app.get('/', (_req,res)=> res.json({ ok: true }));

app.listen(PORT, ()=> console.log(`API listening on http://localhost:${PORT}`));

