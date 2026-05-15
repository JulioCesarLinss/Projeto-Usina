import request from 'supertest';

const BASE_URL = 'http://localhost:3000';

//teste para verificar se servidor está respondendo
describe('Servidor', () => {
  test('deve estar online', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
  });
});

/*teste para cadastro de usuarios

describe('Usuarios', () => {
  test('deve cadastrar um usuario', async () => {
    const res = await request(BASE_URL).post('/api/usuarios/cadastro').send({
      nome: 'Teste Usuario',
      email: 'teste2@cidigital.com',
      senha: 'Senha@123',
      cargo_id: 4,
      departamento_id: 1
    });
    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
  });
*/

//teste para login
  test('deve realizar login', async () => {
    const res = await request(BASE_URL).post('/api/usuarios/login').send({
      email: 'teste2@cidigital.com',
      senha: 'Senha@123'
    });
    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.token).toBeDefined();
  });

//teste para login com senha errada
  test('deve rejeitar login com senha errada', async () => {
    const res = await request(BASE_URL).post('/api/usuarios/login').send({
      email: 'teste2@cidigital.com',
      senha: 'SenhaErrada@123'
    });
    expect(res.status).toBe(401);
    expect(res.body.sucesso).toBe(false);
  });

//tenta listar os usuarios sem enviar token
test('rejeitar acesso sem token', async () => {
    const res = await request(BASE_URL).get('/api/usuarios');
    expect(res.status).toBe(401);
    expect(res.body.sucesso).toBe(false);
});

//teste para buscar usuario pelo id com token

test('deve buscar usuario com token', async () => {
  const loginRes = await request(BASE_URL).post('/api/usuarios/login').send({
    email: 'teste2@cidigital.com',
    senha: 'Senha@123'
  });
  const token = loginRes.body.dados.token;

  const res = await request(BASE_URL)
    .get(`/api/usuarios/${loginRes.body.dados.usuario.id}`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.sucesso).toBe(true);
});