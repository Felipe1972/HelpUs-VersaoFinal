const testArtifact = require('./test-artifacts');
// Integração real: somente novas contas/pedidos identificados. Nenhuma exclusão ou DDL.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
const pool = require('../src/config/database');
const app = require('../src/app');
const attach = require('../src/websocket/chatServer');
const {
  exigirElegibilidadeParaAtendimento,
} = require('../src/services/ocorrenciaService');
const digest = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function snapshot() {
  const [tables] = await pool.query('SHOW TABLES');
  const result = {};
  for (const entry of tables) {
    const table = Object.values(entry)[0];
    assert.match(table, /^[a-z_]+$/);
    const [columns] = await pool.query('SHOW COLUMNS FROM `' + table + '`');
    const pk = columns.filter((c) => c.Key === 'PRI').map((c) => c.Field);
    const [rows] = await pool.query('SELECT * FROM `' + table + '`');
    const [ddl] = await pool.query('SHOW CREATE TABLE `' + table + '`');
    result[table] = {
      schema: digest(ddl[0]['Create Table'].replace(/AUTO_INCREMENT=\d+ /g, '')),
      rows: Object.fromEntries(
        rows.map((r) => [JSON.stringify(pk.map((p) => r[p])), digest(r)]),
      ),
    };
  }
  return result;
}
async function run() {
  assert(process.argv.includes('--allow-test-data'));
  assert.equal(process.env.DB_NAME, 'help_us2');
  const before = await snapshot();
  const server = http.createServer(app);
  const websocket = attach(server);
  const sockets = [];
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const runId = Date.now().toString();
  const password = `Permissoes!${crypto.randomBytes(10).toString('hex')}`;
  const report = {
    run: runId,
    usuarios: [],
    ocorrencias: [],
    testes: [],
    dados_anteriores_preservados: false,
  };
  const accounts = [];
  const save = () =>
    fs.writeFileSync(
      testArtifact('.permissoes-test.local.json'),
      JSON.stringify(
        {
          ...report,
          senha: password,
          contas: accounts.map(({ id_usuario, nome, email }) => ({
            id_usuario,
            nome,
            email,
          })),
        },
        null,
        2,
      ),
    );
  async function request(method, url, token, body) {
    const response = await fetch(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  let b, c;
  try {
    for (const [label, volunteer] of [
      ['Comum', false],
      ['Voluntario', true],
      ['Terceiro', false],
    ]) {
      const email = `permissoes.${label.toLowerCase()}.${runId}@example.invalid`;
      const created = await request('POST', '/usuarios/cadastro', null, {
        nome: `Teste Permissoes ${label} ${runId}`,
        email,
        senha: password,
        confirmarSenha: password,
        telefone: '51999999999',
        eh_voluntario: volunteer,
      });
      assert.equal(created.status, 201);
      report.usuarios.push(created.data.usuario.id_usuario);
      save();
      const login = await request('POST', '/usuarios/login', null, {
        email,
        senha: password,
      });
      assert.equal(login.status, 200);
      assert.equal(login.data.usuario.eh_voluntario, volunteer);
      accounts.push({ ...login.data.usuario, email, token: login.data.token });
      save();
    }
    const [a, volunteer, third] = accounts;
    b = volunteer;
    c = third;
    const types = await request('GET', '/tipos-ocorrencia', a.token);
    assert.equal(types.status, 200);
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
      id_tipo: types.data.tipos[0].id_tipo,
      descricao: `PRIVADO_${runId} endereço na descrição`,
      endereco_referencia: `PRIVADO_${runId} Rua Teste, 123`,
      nivel_urgencia: 'media',
      latitude: -29.99912345,
      longitude: -51.00123456,
    };
    async function create(owner) {
      const r = await request('POST', '/ocorrencias', owner.token, body);
      assert.equal(r.status, 201, JSON.stringify(r.data));
      report.ocorrencias.push(r.data.ocorrencia.id_ocorrencia);
      save();
      return r.data.ocorrencia;
    }
    const ownA = await create(a),
      ownB = await create(b),
      ownC = await create(c),
      closedA = await create(a);
    await pool.execute(
      "UPDATE ocorrencia SET status='finalizada',latitude=NULL,longitude=NULL WHERE id_ocorrencia=? AND id_solicitante=?",
      [closedA.id_ocorrencia, a.id_usuario],
    );
    assert.equal(ownA.latitude, body.latitude);
    assert.equal(ownA.meu_pedido, true);
    for (const user of [a, c]) {
      const list = await request('GET', '/ocorrencias', user.token);
      assert.equal(list.status, 200);
      assert.equal(list.data.perfil.eh_voluntario, false);
      assert(
        list.data.ocorrencias.every(
          (o) => o.id_solicitante === user.id_usuario && o.meu_pedido,
        ),
      );
      const foreign = user === a ? ownC : ownA;
      assert.equal(
        (await request('GET', `/ocorrencias/${foreign.id_ocorrencia}`, user.token))
          .status,
        404,
      );
      assert.equal(
        (await request('GET', '/ocorrencias?escopo=disponiveis', user.token)).status,
        403,
      );
    }
    const mine = await request('GET', '/ocorrencias?escopo=meus', a.token);
    assert(
      mine.data.ocorrencias.some(
        (o) => o.id_ocorrencia === closedA.id_ocorrencia && o.latitude === null,
      ),
    );
    assert.equal(
      (await request('GET', `/ocorrencias/${closedA.id_ocorrencia}`, a.token)).status,
      200,
    );
    assert.equal(
      (await request('GET', `/ocorrencias/${closedA.id_ocorrencia}`, b.token)).status,
      404,
    );
    const opportunities = await request(
      'GET',
      '/ocorrencias?escopo=disponiveis',
      b.token,
    );
    assert.equal(opportunities.status, 200);
    assert(
      opportunities.data.ocorrencias.some((o) => o.id_ocorrencia === ownA.id_ocorrencia),
    );
    assert(
      !opportunities.data.ocorrencias.some((o) => o.id_ocorrencia === ownB.id_ocorrencia),
    );
    const pub = await request('GET', `/ocorrencias/${ownA.id_ocorrencia}`, b.token);
    assert.equal(pub.status, 200);
    assert.equal(pub.data.ocorrencia.latitude, -30);
    assert.equal(pub.data.ocorrencia.longitude, -51);
    assert.equal(pub.data.ocorrencia.endereco_referencia, null);
    assert.equal(pub.data.ocorrencia.descricao, null);
    assert.equal(pub.data.ocorrencia.localizacao_aproximada, true);
    assert(!JSON.stringify(opportunities.data).includes(`PRIVADO_${runId}`));
    assert(!JSON.stringify(pub.data).includes(`PRIVADO_${runId}`));
    const personal = await request('GET', `/ocorrencias/${ownB.id_ocorrencia}`, b.token);
    assert.equal(personal.data.ocorrencia.elegivel_para_aceite_futuro, false);
    assert.throws(() => exigirElegibilidadeParaAtendimento(b, ownB));
    report.testes.push(
      'Comum e terceiro só consultam próprios; voluntário consulta terceiros sem dados privados; histórico próprio inclui encerrados sem GPS; próprio pedido não é oportunidade',
    );
    const forged = jwt.sign(
      { id_usuario: a.id_usuario, eh_voluntario: true, tipo_usuario: 'voluntario' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );
    assert.equal(
      (await request('GET', '/ocorrencias?escopo=disponiveis&eh_voluntario=1', forged))
        .status,
      403,
    );
    await pool.execute('UPDATE usuario SET eh_voluntario=0 WHERE id_usuario=?', [
      b.id_usuario,
    ]);
    assert.equal(
      (await request('GET', '/ocorrencias?escopo=disponiveis', b.token)).status,
      403,
    );
    assert.equal(
      (await request('GET', `/ocorrencias/${ownA.id_ocorrencia}`, b.token)).status,
      404,
    );
    await pool.execute('UPDATE usuario SET eh_voluntario=1 WHERE id_usuario=?', [
      b.id_usuario,
    ]);
    await pool.execute(
      "UPDATE usuario SET status_verificacao='bloqueado' WHERE id_usuario=?",
      [c.id_usuario],
    );
    for (const url of ['/ocorrencias', '/usuarios'])
      assert.equal((await request('GET', url, c.token)).status, 403);
    await pool.execute(
      "UPDATE usuario SET status_verificacao='pendente' WHERE id_usuario=?",
      [c.id_usuario],
    );
    for (const user of [a, b, c]) {
      const list = await request('GET', '/usuarios', user.token);
      assert.equal(list.status, 403);
    }
    assert.equal((await request('GET', '/ocorrencias', null)).status, 401);
    assert.equal(
      (await request('GET', '/ocorrencias?escopo=invalido', a.token)).status,
      400,
    );
    assert.equal(
      (
        await request('POST', '/ocorrencias', a.token, {
          ...body,
          id_solicitante: b.id_usuario,
        })
      ).status,
      400,
    );
    report.testes.push(
      'Perfil relido no banco com o mesmo JWT; claims e query adulterados não promovem usuário; bloqueio; diretório bloqueado; autoria forjada rejeitada',
    );
    // Regressão somente leitura usando vínculo de teste anterior, sem fabricar aceite no app.
    const fixture = JSON.parse(
      fs.readFileSync(testArtifact('.chat-test.local.json'), 'utf8'),
    );
    const existing = [];
    for (const account of fixture.contas.slice(0, 2)) {
      const login = await request('POST', '/usuarios/login', null, {
        email: account.email,
        senha: fixture.senha,
      });
      assert.equal(login.status, 200);
      existing.push(login.data);
    }
    const history = await request(
      'GET',
      `/mensagens/ocorrencia/${fixture.ocorrencia_principal}?id_interlocutor=${existing[1].usuario.id_usuario}`,
      existing[0].token,
    );
    assert.equal(history.status, 200);
    assert(Array.isArray(history.data.mensagens));
    const allowed = await request(
      'GET',
      `/ocorrencias/${fixture.ocorrencia_principal}`,
      existing[1].token,
    );
    assert.equal(allowed.status, 200);
    assert.equal(allowed.data.ocorrencia.endereco_disponivel, false);
    assert.equal(
      (
        await request(
          'GET',
          `/mensagens/ocorrencia/${fixture.ocorrencia_principal}?id_interlocutor=${existing[1].usuario.id_usuario}`,
          c.token,
        )
      ).status,
      403,
    );
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(base.replace('http', 'ws') + '/ws/chat');
      sockets.push(socket);
      const timer = setTimeout(() => reject(Error('Timeout auth')), 5000);
      socket.on('error', reject);
      socket.on('open', () =>
        socket.send(JSON.stringify({ type: 'auth', token: existing[0].token })),
      );
      socket.on('message', (raw) => {
        const event = JSON.parse(raw);
        if (event.type === 'auth_ok') {
          clearTimeout(timer);
          socket.close();
          resolve();
        } else if (event.type === 'auth_error') {
          clearTimeout(timer);
          reject(Error('Auth rejeitada'));
        }
      });
    });
    report.testes.push(
      'Chat: auth WebSocket, histórico real anterior e isolamento de terceiro; atendimento legado sem consentimento não libera dados privados',
    );
  } finally {
    // Apenas restaurar flags das contas criadas nesta execução; nunca excluir dados.
    if (b)
      await pool.execute('UPDATE usuario SET eh_voluntario=1 WHERE id_usuario=?', [
        b.id_usuario,
      ]);
    if (c)
      await pool.execute(
        "UPDATE usuario SET status_verificacao='pendente' WHERE id_usuario=?",
        [c.id_usuario],
      );
    const after = await snapshot();
    const differences = [];
    for (const [table, old] of Object.entries(before)) {
      if (old.schema !== after[table]?.schema) differences.push(table + ':schema');
      for (const [id, hash] of Object.entries(old.rows))
        if (after[table]?.rows[id] !== hash) differences.push(table + ':' + id);
    }
    report.dados_anteriores_preservados = differences.length === 0;
    report.diferencas_anteriores = differences;
    save();
    console.log(JSON.stringify(report, null, 2));
    sockets.forEach((s) => s.terminate());
    websocket.close();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    assert.deepEqual(differences, [], 'Dados anteriores ou esquema alterados');
  }
}
run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
  pool.end();
});
