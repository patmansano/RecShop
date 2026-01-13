import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Vehicle, Station, Wallet, Card, Bank, History } from './models.js';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/recshop';

async function run(){
  await mongoose.connect(uri);
  console.log('Connected', uri);

  await Promise.all([
    User.deleteMany({}),
    Vehicle.deleteMany({}),
    Station.deleteMany({}),
    Wallet.deleteMany({}),
    Card.deleteMany({}),
    Bank.deleteMany({}),
    History.deleteMany({})
  ]);

  const [maria, host1, admin] = await User.create([
    { nome:'Maria', email:'maria@email.com', password:'123456', role:'driver', cpfCnpj:'086.152.624-46', isActive:true },
    { nome:'Host 1', email:'host1@recshop.com', password:'host123', role:'host', cpfCnpj:'47.513.424/0001-13', isActive:true },
    { nome:'Admin', email:'admin@recshop.com', password:'admin123', role:'admin', isActive:true }
  ]);

  await Wallet.create([
    { userId: maria._id, saldo: 50 },
    { userId: host1._id, saldo: 0 },
    { userId: admin._id, saldo: 0 }
  ]);

  const vehicles = await Vehicle.create([
    { userId: maria._id, nome:'TIGGO 8', placa:'ARF1S23', conector:'Tipo 1', bateriaKwh:70 },
    { userId: maria._id, nome:'BYD Song', placa:'PPP-1236', conector:'Tipo 2', bateriaKwh:72 },
    { userId: admin._id, nome:'Chevrolet Bolt', placa:'ADM-3344', conector:'Tipo 1', bateriaKwh:66 },
  ]);

  const stations = await Station.create([
    { userId: admin._id, nome:'Shopping Atlântico', acessoType:'Comercial', cidade:'Rio de Janeiro', connectorType:'Tipo 2', potenciaKw:22, precoKwh:2.6, qtdDisponivel:4, qtdTotal:4, horarioDias:'08:00-22:00 • Seg/Ter/Qua/Qui/Sex', disponivel:true },
    { userId: host1._id, nome:'Posto Aero', acessoType:'Comercial', cidade:'Rio de Janeiro', connectorType:'CC', potenciaKw:60, precoKwh:2.9, qtdDisponivel:3, qtdTotal:6, horarioDias:'08:00-00:00 • Seg/Ter/Qua/Qui/Sex/Sáb', disponivel:true }
  ]);

  await History.create([
    { userId: maria._id, stationId: stations[0]._id, stationName: stations[0].nome, vehicleName: vehicles[0].nome, total: 18.5, kwh: 7.5, startAt: new Date(Date.now()-3600e3*3), endAt: new Date(Date.now()-3600e3*2), status:'finalizada', kind:'recarga' },
    { userId: maria._id, stationId: stations[1]._id, stationName: stations[1].nome, vehicleName: vehicles[1].nome, total: 25.2, kwh: 8.7, startAt: new Date(Date.now()-3600e3*26), endAt: new Date(Date.now()-3600e3*25), status:'finalizada', kind:'recarga' }
  ]);

  console.log('Seed completed');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });

