const testArtifact = require('./test-artifacts');
// Cria somente pedidos identificados de teste, sem excluir registros.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const app = require('../src/app');
const service = require('../src/services/ocorrenciaService');
async function run() {
  assert(process.argv.includes('--allow-test-data'));
  assert.equal(process.env.DB_NAME, 'help_us2');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, route, token, body) {
    const response = await fetch(base + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  try {
    const fixture = require(testArtifact('.chat-test.local.json'));
    const user = fixture.contas[0];
    const login = await request('POST', '/usuarios/login', null, {
      email: user.email,
      senha: fixture.senha,
    });
    assert.equal(login.status, 200);
    const token = login.data.token,
      uid = login.data.usuario.id_usuario;
    const config = await request('GET', '/tipos-ocorrencia', token);
    assert.equal(config.status, 200);
    assert.deepEqual(config.data.urgencias, ['baixa', 'media', 'alta']);
    assert.equal(config.data.tipos.length, 5);
    const body = {
      descricao_publica: 'Resumo público de teste',
      modalidade_horario: 'agora',
      fuso_horario: 'America/Sao_Paulo',
      endereco: {
        rua: 'Rua teste',
        numero: '10',
        bairro: 'Centro',
        cidade: 'Teste',
        estado: 'RS',
        sem_numero: false,
        latitude: -29.99912345,
        longitude: -51.00123456,
      },
      id_tipo: config.data.tipos[0].id_tipo,
      descricao: `Teste ocorrência ${Date.now()} — criação pela API`,
      endereco_referencia: ' Portão azul — teste de referência ',
      nivel_urgencia: 'media',
      latitude: -29.99912345,
      longitude: -51.00123456,
    };
    assert.equal((await request('POST', '/ocorrencias', null, body)).status, 401);
    const expired = jwt.sign({ id_usuario: uid }, process.env.JWT_SECRET, {
      expiresIn: -1,
    });
    assert.equal((await request('POST', '/ocorrencias', expired, body)).status, 401);
    const nonexistent = jwt.sign({ id_usuario: 2147483647 }, process.env.JWT_SECRET, {
      expiresIn: 60,
    });
    assert.equal((await request('POST', '/ocorrencias', nonexistent, body)).status, 403);
    // Exercita a resposta HTTP para bloqueio sem modificar contas existentes.
    const active = service.usuarioAtivo;
    service.usuarioAtivo = async () => {
      throw new service.OcorrenciaError('Usuário indisponível.', 403);
    };
    try {
      assert.equal((await request('POST', '/ocorrencias', token, body)).status, 403);
    } finally {
      service.usuarioAtivo = active;
    }
    for (const patch of [
      { id_tipo: 2147483647 },
      { descricao: '' },
      { nivel_urgencia: 'invalida' },
      { latitude: null },
      { latitude: 91 },
      { longitude: '0' },
      { id_solicitante: 1 },
    ])
      assert.equal(
        (await request('POST', '/ocorrencias', token, { ...body, ...patch })).status,
        400,
      );
    const created = await request('POST', '/ocorrencias', token, body);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const item = created.data.ocorrencia;
    assert.equal(item.id_solicitante, uid);
    assert.equal(item.status, 'aberta');
    assert.equal(item.latitude, body.latitude);
    assert.equal(item.longitude, body.longitude);
    assert.equal(item.id_tipo, body.id_tipo);
    assert(item.criada_em);
    const [rows] = await pool.execute(
      'SELECT id_solicitante,id_tipo,status,latitude,longitude,criada_em,endereco_referencia FROM ocorrencia WHERE id_ocorrencia=?',
      [item.id_ocorrencia],
    );
    assert.equal(rows[0].endereco_referencia, body.endereco_referencia.trim());
    assert.equal(item.endereco_referencia, body.endereco_referencia.trim());
    assert.equal(rows[0].id_solicitante, uid);
    assert.equal(Number(rows[0].latitude), body.latitude);
    assert.equal(Number(rows[0].longitude), body.longitude);
    assert.equal(rows[0].status, 'aberta');
    assert(rows[0].criada_em);
    const detail = await request('GET', `/ocorrencias/${item.id_ocorrencia}`, token);
    assert.equal(detail.data.ocorrencia.descricao, body.descricao);
    assert.equal((await request('GET', '/ocorrencias/2147483647', token)).status, 404);
    const list = await request('GET', '/ocorrencias', token);
    assert.equal(list.status, 200);
    assert(list.data.ocorrencias.some((o) => o.id_ocorrencia === item.id_ocorrencia));
    assert(
      list.data.ocorrencias.every(
        (o) =>
          ['aberta', 'em_atendimento'].includes(o.status) &&
          Number.isFinite(o.latitude) &&
          Number.isFinite(o.longitude),
      ),
    );
    assert.equal((await request('GET', '/usuarios/me', token)).status, 200);
    assert.equal((await request('GET', '/conversas', token)).status, 200);
    console.log(
      JSON.stringify({
        resultado: 'PASS',
        id_ocorrencia: item.id_ocorrencia,
        solicitante: uid,
        coordenadas: [item.latitude, item.longitude],
        tipo: item.id_tipo,
        status: item.status,
        criada_em: item.criada_em,
        verificacao_mysql: true,
      }),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
