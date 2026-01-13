# RECSHOP (Vite + React + Express + MongoDB)

Aplicação de gestão de recargas com frontend em React (Vite) e backend em Express + MongoDB (Mongoose). Autenticação com JWT, seed inicial e integração de API habilitada no frontend por variáveis de ambiente.

## Estrutura

```
.
├── api/                 # Backend (Express + MongoDB)
│   ├── src/
│   │   ├── server.js    # Servidor e rotas
│   │   ├── models.js    # Esquemas Mongoose
│   │   ├── auth.js      # JWT (sign/verify, middlewares)
│   │   └── seed.js      # Seed inicial (users, vehicles, stations, history...)
│   ├── package.json
│   └── README.md
└── react/               # Frontend (Vite + React)
    ├── src/
    ├── index.html
    ├── package.json
    └── .env (criar)
```

## 1) Backend (API)

Pré‑requisitos: Node 18+ e MongoDB local (ou Atlas). Veja duas opções de banco:

- Opção A (local): instalar MongoDB Community + Compass. Crie `.env` em `api/` com:
  ```env
  MONGO_URI=mongodb://127.0.0.1:27017/recshop
  PORT=3000
  JWT_SECRET=uma-chave-segura
  JWT_EXPIRES=7d
  ```

- Opção B (Atlas): crie um cluster gratuito M0, libere seu IP em Network Access e crie um Database User. Use a connection string no `.env` de `api/`:
  ```env
  MONGO_URI=mongodb+srv://USUARIO:SENHA@CLUSTER-ID.mongodb.net/recshop?retryWrites=true&w=majority
  PORT=3000
  JWT_SECRET=uma-chave-segura
  JWT_EXPIRES=7d
  ```

Instalação e execução:

```bash
cd api
npm install
# (opcional) popular o banco com dados de demo
node src/seed.js
# iniciar a API
npm run dev
# esperado: "MongoDB connected" e "API listening on http://localhost:3000"
```

Endpoints principais (compatíveis com o frontend):
- Auth: `POST /auth/login` (email, password) → user + token
- Users: `POST /users`, `PATCH /users/:id`, `GET /users`
- Wallets: `GET /wallets?userId`, `POST /wallets`, `PATCH /wallets/:id`
- Cards: `GET /cards?userId`, `POST /cards`, `PATCH /cards/:id`, `DELETE /cards/:id`
- Banks: `GET /banks?userId`, `POST /banks`, `PATCH /banks/:id`, `DELETE /banks/:id`
- Vehicles: `GET /vehicles?userId`, `GET /vehicles`, `POST /vehicles`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id`
- Stations: `GET /stations`, `POST /stations`, `PATCH /stations/:id`, `DELETE /stations/:id`
- History: `GET /history?userId`, `POST /history`

Observação: operações sensíveis usam JWT (Authorization: `Bearer <token>`).

## 2) Frontend (Vite + React)

Crie o arquivo `.env` na pasta `react/`:

```env
VITE_USE_API=true
VITE_API_BASE=http://localhost:3000
```

Instale e inicie:

```bash
cd react
npm install
npm run dev
# acesse http://localhost:5173/
```

### Usuários do seed (demo)

- Driver: `maria@email.com` / `123456`
- Host: `host1@recshop.com` / `host123`
- Admin: `admin@recshop.com` / `admin123`

## 3) Push para o GitHub

Crie um repositório vazio no GitHub e execute na raiz do projeto (mesmo nível de `api/` e `react/`):

```bash
git init
git add .
git commit -m "RECSHOP: frontend React + backend Express/MongoDB"
git branch -M main
git remote add origin https://github.com/<SEU_USUARIO>/<NOME_DO_REPO>.git
git push -u origin main
```

Se estiver publicando pela primeira vez, configure seu usuário:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

## 4) Dicas e problemas comuns

- PowerShell bloqueando `npm`:
  - Execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` ou use `npm.cmd`.
- Token expirado (401):
  - O frontend faz logout automático; basta logar novamente.
- MongoDB local:
  - Garanta que o serviço “MongoDB” está “Em execução” (services.msc) e use `127.0.0.1` na `MONGO_URI`.
- Atlas:
  - Adicione seu IP em “Network Access” e garanta que usuário/senha estão corretos (atenção ao URL-encoding da senha).

---

Pronto! Com API (porta 3000) e Vite (porta 5173) no ar, o app estará funcionando e persistindo no banco. Se desejar, podemos adicionar scripts para subir API e frontend juntos, CI/CD ou Docker Compose.*** End Patch
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


