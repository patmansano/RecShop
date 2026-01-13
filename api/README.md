# RECSHOP API (Express + MongoDB)

Executar localmente:
1) Copie `.env.example` para `.env` e ajuste `MONGO_URI` e `PORT`.
2) `npm install`
3) `npm run dev`

Endpoints compatíveis com o frontend atual:
- Autenticação simples:
  - `GET /users?email=...&password=...` → retorna `[user]` ou `[]`
  - `POST /users` → cria usuário
  - `PATCH /users/:id` → atualizar (e.g. `isActive`)
- Carteira:
  - `GET /wallets?userId=...`
  - `POST /wallets` (se não existir)
  - `PATCH /wallets/:id`
- Cartões:
  - `GET /cards?userId=...`
  - `POST /cards`
  - `PATCH /cards/:id`
  - `DELETE /cards/:id`
- Bancos (Pix):
  - `GET /banks?userId=...`
  - `POST /banks`
  - `PATCH /banks/:id`
  - `DELETE /banks/:id`
- Veículos:
  - `GET /vehicles?userId=...` (por usuário)
  - `GET /vehicles` (todos)
  - `POST /vehicles` (body inclui `userId`)
  - `PATCH /vehicles/:id`
  - `DELETE /vehicles/:id`
- Estações:
  - `GET /stations`
  - `POST /stations`
  - `PATCH /stations/:id`
  - `DELETE /stations/:id`
- Histórico:
  - `GET /history?userId=...`
  - `POST /history`

Observação: autenticação é somente demonstrativa (sem JWT). Ajuste conforme necessidade.

