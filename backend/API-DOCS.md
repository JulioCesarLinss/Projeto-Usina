# 📚 Documentação da API - C.I Digital

## 🚀 Iniciando o Servidor

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento (com auto-reload)
npm run dev

# Iniciar em produção
npm start
```

O servidor rodará em `http://localhost:3000`

---

## 📋 Endpoints Disponíveis

### 🔐 Autenticação

#### 1. Cadastro de Usuário
```http
POST /api/usuarios/cadastro

Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "SenhaForte123!",
  "cargo_id": 2,
  "departamento_id": 1
}
```

**Resposta (201):**
```json
{
  "sucesso": true,
  "mensagem": "Usuário cadastrado com sucesso",
  "dados": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com"
  }
}
```

#### 2. Login
```http
POST /api/usuarios/login

Content-Type: application/json

{
  "email": "joao@example.com",
  "senha": "SenhaForte123!"
}
```

**Resposta (200):**
```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso",
  "dados": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@example.com",
      "cargo_id": 2,
      "departamento_id": 1
    }
  }
}
```

---

### 👥 Usuários (Requer Autenticação)

Todas as rotas abaixo exigem o header:
```
Authorization: Bearer <token>
```

#### 3. Listar Usuários
```http
GET /api/usuarios?pagina=1&limite=20

Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "sucesso": true,
  "dados": [
    {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@example.com",
      "cargo_id": 2,
      "departamento_id": 1
    }
  ],
  "paginacao": {
    "pagina": 1,
    "limite": 20,
    "total": 1
  }
}
```

#### 4. Buscar Usuário por ID
```http
GET /api/usuarios/1

Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "sucesso": true,
  "dados": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "cargo_id": 2,
    "departamento_id": 1
  }
}
```

#### 5. Atualizar Usuário
```http
PUT /api/usuarios/1

Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "cargo_id": 3,
  "departamento_id": 2
}
```

**Resposta (200):**
```json
{
  "sucesso": true,
  "mensagem": "Usuário atualizado com sucesso",
  "dados": {
    "id": 1,
    "nome": "João Silva Atualizado",
    "email": "joao.novo@example.com",
    "cargo_id": 3,
    "departamento_id": 2
  }
}
```

#### 6. Deletar Usuário
```http
DELETE /api/usuarios/1

Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "sucesso": true,
  "mensagem": "Usuário deletado com sucesso",
  "dados": {
    "id": 1
  }
}
```

---

## 🔴 Códigos de Erro

| HTTP | Código | Significado |
|------|--------|------------|
| 400 | Validação | Dados inválidos |
| 401 | Não Autenticado | Token ausente/inválido/expirado |
| 403 | Não Autorizado | Sem permissão |
| 404 | Não Encontrado | Recurso não existe |
| 409 | Conflito | Email já cadastrado |
| 500 | Servidor | Erro interno |

---

## 🔒 Segurança

- **Senhas**: Hasheadas com bcrypt (10 rounds)
- **JWT**: Tokens com expiração de 8 horas
- **CORS**: Configurado para localhost:3001
- **Validação**: Todos os inputs são validados

---

## 📝 Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=senha
DB_NAME=cidigital
PORT=3000
NODE_ENV=development
JWT_SECRET=sua_chave_super_secreta
FRONTEND_URL=http://localhost:3001
```

---

## 🧪 Testando a API

### Com cURL:
```bash
# Cadastro
curl -X POST http://localhost:3000/api/usuarios/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"João","email":"joao@email.com","senha":"Senha123!","cargo_id":2,"departamento_id":1}'

# Login
curl -X POST http://localhost:3000/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","senha":"Senha123!"}'

# Listar usuários
curl -X GET http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer seu_token_aqui"
```

### Com Postman/Insomnia:
1. Importar coleção (criar em Postman)
2. Configurar variáveis de ambiente
3. Usar o token retornado do login nas próximas requisições

---

## 📦 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Conexão com banco
│   ├── controllers/
│   │   └── usuarioController.js
│   ├── models/
│   │   └── usuarioModel.js    # Queries SQL
│   ├── services/
│   │   └── usuarioService.js  # Lógica de negócio
│   ├── routes/
│   │   └── usuarioRoutes.js   # Definição de rotas
│   └── middlewares/
│       └── authMiddleware.js  # Autenticação JWT
├── server.js                   # Entrada da aplicação
├── package.json
├── .env.example               # Variáveis de exemplo
└── .env                       # Variáveis reais (não versionado)
```

---

## ✅ Checklist de Deploy

- [ ] Criar arquivo `.env` com variáveis reais
- [ ] Testar todas as rotas
- [ ] Configurar CORS para URL do frontend
- [ ] Testar autenticação JWT
- [ ] Setupar banco de dados com schema.sql
- [ ] Configurar variáveis de produção
- [ ] Deploy da aplicação

