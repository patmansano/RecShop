import mongoose from 'mongoose';

const opts = { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } };

export const UserSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true, index: true },
  password: String,
  role: { type: String, enum: ['driver', 'host', 'admin'], default: 'driver' },
  cpfCnpj: String,
  isActive: { type: Boolean, default: true }
}, opts);

export const VehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  nome: String,
  marca: String,
  modelo: String,
  placa: String,
  conector: String,
  bateriaKwh: Number,
  isActive: { type: Boolean, default: true }
}, opts);

export const StationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  nome: String,
  acessoType: String,
  cep: String,
  logradouro: String,
  numero: String,
  bairro: String,
  cidade: String,
  uf: String,
  endereco: String,
  qtdDisponivel: Number,
  qtdTotal: Number,
  connectorType: String,
  potenciaKw: Number,
  precoKwh: Number,
  contrato: String,
  distribuidora: String,
  horarioDias: String,
  disponivel: { type: Boolean, default: true }
}, opts);

export const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  saldo: { type: Number, default: 0 }
}, { timestamps: false });

export const CardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  numberMasked: String,
  preferred: { type: Boolean, default: false },
  brand: String,
  holder: String,
  exp: String,
  billing: {
    street: String, number: String, complement: String,
    district: String, city: String, uf: String, cep: String
  }
}, opts);

export const BankSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  pix: String,
  preferred: { type: Boolean, default: false }
}, opts);

export const HistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  chargeId: Number,
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
  stationName: String,
  vehicleName: String,
  total: Number,
  kwh: Number,
  startAt: Date,
  endAt: Date,
  refund: Number,
  status: String,
  kind: String,
  data: Date
}, opts);

export const User = mongoose.model('User', UserSchema);
export const Vehicle = mongoose.model('Vehicle', VehicleSchema);
export const Station = mongoose.model('Station', StationSchema);
export const Wallet = mongoose.model('Wallet', WalletSchema);
export const Card = mongoose.model('Card', CardSchema);
export const Bank = mongoose.model('Bank', BankSchema);
export const History = mongoose.model('History', HistorySchema);

