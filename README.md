# RECSHOP – Sessão de Recarga (Projeto)

Aplicação front‑end (HTML + JS) para buscar estações de recarga, criar/gerenciar sessões e reservas, com persistência via Redux‑lite + json-server.

## Requisitos
- Node.js (LTS)
- PowerShell (Windows)
- Pacotes globais:
```powershell
npm i -g json-server http-server
```

## Estrutura
```
Projeto/
├─ Rec31.html        # App principal (Redux + integração com API)
├─ db.json           # Banco mockado do json-server
└─ README.md         # Este guia
```

## Como executar
1) Backend (json-server)
```powershell
cd ".../PSW/Rev/Projeto"
json-server --watch db.json --port 3000
```
- API: `http://localhost:3000`

2) Frontend
- Abrir diretamente o arquivo `Rec31.html` no navegador ou servir com http-server:
```powershell
http-server .. -p 5173
# acesse: http://localhost:5173/Projeto/Rec31.html
```

3) Opcional – mudar a URL da API em runtime (no console do navegador):
```js
window.__API_BASE__ = 'http://localhost:3000';
location.reload();
```

## Persistência e Redux
- A aplicação usa `load()`/`save()` internamente. O `save()`:
  - Atualiza o Redux (store em memória);
  - Salva no `localStorage`;
  - Sincroniza no json-server (POST/PUT/DELETE por coleção).
- Coleções suportadas: `users`, `stations`, `vehicles`, `sessions`, `reservations`, `history`, `cashback`, `savedCards`.

### Sincronizar dados locais manualmente
Se quiser empurrar o estado atual do navegador para a API:
```js
// no console da página do app (Rec31.html)
syncLocalToApi()
```

## Endpoints relevantes (json-server)
- `GET/POST /users`
- `GET/POST /stations`
- `GET/POST /vehicles`
- `GET/POST /sessions`
- `GET/POST /reservations`
- `GET/POST /history`
- `GET/POST /cashback`
- `GET/POST /savedCards`

## Modelos (estruturas JSON)
### sessions
```json
{
  "id": "sess1",
  "number": 1,
  "userId": "driver1",
  "stationId": "st2",
  "vehicleId": "veh1",
  "connectorIndex": 1,
  "currentCharge": 0,
  "targetCharge": 1,
  "energyNeeded": 0.66,
  "estimatedTime": 1,
  "pricePerKwh": 2.9,
  "prepaidAmount": 1.91,
  "fromReservation": true,
  "iniTs": 0,
  "endTs": null,
  "status": "agendada"
}
```

### reservations
```json
{
  "id": "res1",
  "userId": "driver1",
  "stationId": "st2",
  "vehicleId": "veh1",
  "startTs": 0,
  "endTs": 0,
  "durationMin": 60,
  "prepaidAmount": 1.91,
  "status": "agendada",
  "createdAt": "2025-11-04T00:00:00Z",
  "currentCharge": 0,
  "targetCharge": 1,
  "sessionNumber": null,
  "cancelledAt": null,
  "startedAt": null
}
```

### history
```json
{
  "id": "hist1",
  "userId": "driver1",
  "transactionId": "TRX00000001",
  "sessionId": "sess1",
  "sessionNumber": 1,
  "date": "04/11/2025",
  "startTime": "17:25",
  "endTime": "17:26",
  "duration": "1 min",
  "stationId": "st2",
  "stationName": "Posto Aero",
  "vehicleId": "veh1",
  "vehicleName": "Picape Hummer • ABC-1234",
  "energyKwh": "0,66 kWh",
  "initialCharge": "0%",
  "finalCharge": "1%",
  "chargeIncrease": "+1%",
  "rate": "R$ 2,90/kWh",
  "totalCost": "R$ 1,91",
  "paymentMethod": "Cartão de Crédito",
  "cardLastDigits": "4444",
  "cardName": "Cartão Padrão",
  "paymentDate": "04/11/2025",
  "paymentTime": "17:26",
  "timestamp": 0
}
```

## Credenciais de exemplo
- Admin: `admin@recshop.com` / `admin123`
- Host:  `host1@recshop.com` / `host123`
- Driver: `maria@email.com` / `123456`

## Dicas
- Formato de moeda: todo o app usa `formatBRL(n)` (R$ X,XX).
- Reservas: criadas em `reservations` e, no horário, promovidas a `sessions`.
- Se a API estiver fora do ar, o app continua funcionando com `localStorage`.

## Troubleshooting
- Porta em uso: altere a porta do http-server (`-p 5174`) ou do json-server (`--port 3001`).
- CORS: o json-server já libera CORS por padrão.
- Forçar recarga limpa: `Ctrl+F5` no navegador.

---
© 2025 – Projeto acadêmico PSW/RECSHOP.


