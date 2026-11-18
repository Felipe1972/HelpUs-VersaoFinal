const testArtifact = require('./test-artifacts');
// Integração real. Só grava dados novos identificados; preserva todos os anteriores.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  fs = require('fs'),
  crypto = require('crypto'),
  http = require('http'),
  jwt = require('jsonwebtoken');
const pool = require('../src/config/database'),
  app = require('../src/app'),
  chat = require('../src/services/chatService');
(async () => {
  assert(process.argv.includes('--allow-test-data'));
  assert.equal(process.env.DB_NAME, 'help_us2');
  const before = {};
  for (const entry of (await pool.query('SHOW TABLES'))[0]) {
    const t = Object.values(entry)[0];
    before[t] = (await pool.query('SELECT * FROM ' + t))[0];
  }
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const run = Date.now(),
    password = 'Notify!' + crypto.randomBytes(12).toString('hex'),
    users = [];
  const token = (u) =>
    jwt.sign({ id_usuario: u.id_usuario }, process.env.JWT_SECRET, { expiresIn: '15m' });
  async function req(method, path, u, body, status = 200) {
    const r = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(u ? { Authorization: 'Bearer ' + token(u) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const b = await r.json();
    assert.equal(r.status, status, path + ': ' + JSON.stringify(b));
    return b;
  }
  try {
    for (const [label, vol] of [
      ['owner', true],
      ['volunteer', true],
      ['blocked', true],
      ['common', false],
    ]) {
      const b = await req(
        'POST',
        '/usuarios/cadastro',
        null,
        {
          nome: 'TESTE_NOTIFICACOES_' + label + '_' + run,
          email: 'notifications.' + label + '.' + run + '@example.invalid',
          senha: password,
          confirmarSenha: password,
          eh_voluntario: vol,
        },
        201,
      );
      users.push(b.usuario);
    }
    const [owner, vol, blocked, common] = users;
    await pool.execute(
      "UPDATE usuario SET status_verificacao='bloqueado' WHERE id_usuario=?",
      [blocked.id_usuario],
    );
    const address = {
      rua: 'Rua de teste',
      numero: '10',
      bairro: 'Centro de teste',
      cidade: 'Cidade teste',
      estado: 'RS',
      cep: '93000-000',
      sem_numero: false,
      referencia: 'SEGREDO_ENDERECO',
      latitude: -29.7654321,
      longitude: -51.1454321,
    };
    const body = {
      id_tipo: 1,
      descricao: 'SEGREDO_DESCRICAO',
      descricao_publica: 'TESTE NOTIFICACOES ' + run,
      nivel_urgencia: 'media',
      latitude: address.latitude,
      longitude: address.longitude,
      endereco: address,
      modalidade_horario: 'agora',
      fuso_horario: 'America/Sao_Paulo',
    };
    const { ocorrencia: o } = await req('POST', '/ocorrencias', owner, body, 201),
      id = o.id_ocorrencia;
    const notices = async (u) => await req('GET', '/notificacoes', u);
    const forOrder = async (u) =>
      (await notices(u)).notificacoes.filter((n) => n.id_ocorrencia === id);
    const opportunities = (await forOrder(vol)).filter((n) => n.tipo === 'novo_pedido');
    assert.equal(opportunities.length, 1);
    assert.equal((await forOrder(owner)).length, 0);
    assert.equal((await forOrder(common)).length, 0);
    assert.equal(
      (
        await pool.execute(
          'SELECT * FROM notificacao_privada WHERE id_ocorrencia=? AND id_usuario=?',
          [id, blocked.id_usuario],
        )
      )[0].length,
      0,
    );
    await req('GET', '/notificacoes', null, null, 401);
    await req('GET', '/notificacoes', blocked, null, 403);
    const n = opportunities[0];
    assert.equal(
      (await req('GET', '/notificacoes/' + n.id_notificacao + '/abrir', vol)).tela,
      'OcorrenciaDetalhes',
    );
    await req('GET', '/notificacoes/' + n.id_notificacao + '/abrir', common, null, 404);
    await req('POST', '/notificacoes/' + n.id_notificacao + '/lida', common, {}, 404);
    const initial = (await notices(vol)).nao_lidas;
    await req('POST', '/notificacoes/' + n.id_notificacao + '/lida', vol, {});
    assert.equal((await notices(vol)).nao_lidas, initial - 1);
    await pool.execute('UPDATE usuario SET eh_voluntario=0 WHERE id_usuario=?', [
      vol.id_usuario,
    ]);
    assert.equal((await forOrder(vol)).length, 0);
    await req('GET', '/notificacoes/' + n.id_notificacao + '/abrir', vol, null, 404);
    await pool.execute('UPDATE usuario SET eh_voluntario=1 WHERE id_usuario=?', [
      vol.id_usuario,
    ]);
    await req('POST', '/ocorrencias/' + id + '/recusar', vol, {});
    assert.equal((await forOrder(vol)).filter((n) => n.tipo === 'novo_pedido').length, 0);
    await req('POST', '/ocorrencias/' + id + '/desfazer-recusa', vol, {});
    assert.equal((await forOrder(vol)).filter((n) => n.tipo === 'novo_pedido').length, 1);
    const accepted = await req('POST', '/ocorrencias/' + id + '/aceitar', vol, {});
    await req('POST', '/ocorrencias/' + id + '/aceitar', vol, {});
    const acceptance = (await forOrder(owner)).filter((n) => n.tipo === 'aceite');
    assert.equal(acceptance.length, 1);
    assert.equal(
      (
        await req(
          'GET',
          '/notificacoes/' + acceptance[0].id_notificacao + '/abrir',
          owner,
        )
      ).tela,
      'Acompanhamento',
    );
    let detail = (await req('GET', '/ocorrencias/' + id, vol)).ocorrencia;
    assert.equal(detail.endereco, null);
    assert.equal(detail.descricao, null);
    const own = (await req('GET', '/ocorrencias/' + id, owner)).ocorrencia,
      aid = own.acompanhamento.id_atendimento;
    await req('POST', '/ocorrencias/' + id + '/compartilhar', owner, {
      id_atendimento: aid,
    });
    assert((await forOrder(vol)).some((n) => n.tipo === 'compartilhamento'));
    const event = {
      request_id: 'notify-' + run,
      type: 'chat_message',
      id_ocorrencia: id,
      id_destinatario: owner.id_usuario,
      text: 'SEGREDO_MENSAGEM',
    };
    const claims = {
      id_usuario: vol.id_usuario,
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    await chat.saveMessage(claims, event);
    await chat.saveMessage(claims, event);
    const messages = (await forOrder(owner)).filter((n) => n.tipo === 'mensagem');
    assert.equal(messages.length, 1);
    assert(messages[0].id_conversa);
    assert.equal((await forOrder(vol)).filter((n) => n.tipo === 'mensagem').length, 0);
    const destination = await req(
      'GET',
      '/notificacoes/' + messages[0].id_notificacao + '/abrir',
      owner,
    );
    assert.equal(destination.tela, 'Chat');
    assert.equal(destination.params.id_conversa, messages[0].id_conversa);
    await req('POST', '/ocorrencias/' + id + '/cancelar', owner, {});
    assert((await forOrder(vol)).some((n) => n.tipo === 'cancelamento'));
    assert.equal(
      (await req('GET', '/notificacoes/' + messages[0].id_notificacao + '/abrir', owner))
        .tela,
      'Chat',
    );
    for (const u of [owner, vol]) {
      const data = JSON.stringify(await forOrder(u));
      for (const secret of [
        'SEGREDO_',
        address.rua,
        String(address.latitude),
        owner.email,
        vol.email,
      ])
        assert(!data.includes(secret), 'Privacidade: ' + secret);
    }
    const report = {
      run,
      usuarios: users.map((u) => u.id_usuario),
      ocorrencia: id,
      passed: true,
    };
    for (const [t, rows] of Object.entries(before)) {
      const now = (await pool.query('SELECT * FROM ' + t))[0];
      const values = new Set(now.map((r) => JSON.stringify(r)));
      assert(
        rows.every((r) => values.has(JSON.stringify(r))),
        'Registros anteriores modificados em ' + t,
      );
    }
    fs.writeFileSync(
      testArtifact('.notifications-test.local.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(
      'PASS: oportunidades por papel/bloqueio/autoria; autorização no toque; badge e leitura por conta; aceite idempotente; consentimento; mensagem por destinatário+UUID e sem replay; cancelamento/histórico; privacidade; registros anteriores intactos.',
    );
    console.log(JSON.stringify(report));
  } finally {
    await new Promise((r) => server.close(r));
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
