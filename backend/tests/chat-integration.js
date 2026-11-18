// Usa HTTP, ws e MySQL reais. Insere somente registros novos identificados; não exclui registros.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const pool = require('../src/config/database');
const app = require('../src/app');
const attach = require('../src/websocket/chatServer');

async function run() {
  assert(process.argv.includes('--allow-test-data'), 'Use --allow-test-data para criar registros de teste identificados.');
  assert.equal(process.env.DB_NAME, 'help_us2');
  const server = http.createServer(app);
  const chatServer = attach(server);
  const sockets = [];
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const runId = `${Date.now()}`;
  const password = `Chat!${crypto.randomBytes(10).toString('hex')}`;
  async function request(method, url, token, data) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  async function connect(token, authenticate = true) {
    const socket = new WebSocket(base.replace('http', 'ws') + '/ws/chat');
    socket.on('error', () => {}); sockets.push(socket);
    const events = [];
    socket.on('message', raw => events.push(JSON.parse(raw.toString())));
    await once(socket, 'open');
    const result = { socket, events, send: event => socket.send(JSON.stringify(event)),
      wait: async predicate => {
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const event = events.find(predicate);
          if (event) return event;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error('Evento esperado não recebido: ' + JSON.stringify(events));
      } };
    if (authenticate) { result.send({ type: 'auth', token }); await result.wait(e => e.type === 'auth_ok'); }
    return result;
  }
  const conversations=new Map();
  const report = { run: runId, testes: [], usuarios: [], ocorrencias: [], mensagens: [] };
  try {
    const users = [];
    for (const letter of ['a', 'b', 'c', 'd']) {
      const email = `chat.${letter}.${runId}@example.invalid`;
      const created = await request('POST', '/usuarios/cadastro', null, { nome: `Teste Chat ${letter.toUpperCase()} ${runId}`, email, senha: password, confirmarSenha: password, eh_voluntario: letter !== 'd' });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      assert.equal(created.data.usuario.tipo_usuario, 'solicitante');
      assert.equal(created.data.usuario.eh_voluntario, letter !== 'd');
      const login = await request('POST', '/usuarios/login', null, { email, senha: password });
      assert.equal(login.status, 200);
      assert(!JSON.stringify(login.data.usuario).includes('senha_hash'));
      users.push({ ...login.data.usuario, token: login.data.token, email });
    }
    const [a, b, c, d] = users;
    report.usuarios = users.map(u => u.id_usuario);
    const [types] = await pool.query('SELECT id_tipo FROM tipo_ocorrencia ORDER BY id_tipo LIMIT 1');
    assert(types.length, 'É necessário um tipo de ocorrência.');
    async function occurrence(owner, volunteer, status = 'em_atendimento', appointment = 'aceito') {
      const [o] = await pool.execute('INSERT INTO ocorrencia (id_solicitante,id_tipo,titulo,descricao,status) VALUES (?,?,?,?,?)', [owner.id_usuario, types[0].id_tipo, `Teste Chat ${runId}`, 'Registro de teste de integração do chat', status]);
      await pool.execute('INSERT INTO atendimento (id_ocorrencia,id_voluntario,status) VALUES (?,?,?)', [o.insertId, volunteer.id_usuario, appointment]);
      if(appointment!=='recusado'){const uuid=crypto.randomUUID();await pool.execute('INSERT INTO conversa(id_conversa,id_ocorrencia,id_solicitante,id_voluntario) VALUES(?,?,?,?)',[uuid,o.insertId,owner.id_usuario,volunteer.id_usuario]);conversations.set(o.insertId,uuid)}
      report.ocorrencias.push(o.insertId);
      return o.insertId;
    }
    const first = await occurrence(a, b);
    await pool.execute('INSERT INTO atendimento (id_ocorrencia,id_voluntario,status) VALUES (?,?,?)', [first, c.id_usuario, 'aceito']);
    const reverse = await occurrence(b, a);
    const finished = await occurrence(a, b, 'finalizada', 'finalizado');
    const cancelled = await occurrence(a, b, 'cancelada');
    const refused = await occurrence(a, b, 'aberta', 'recusado');
    if(fs.existsSync('.chat-test.local.json'))fs.copyFileSync('.chat-test.local.json','.chat-test.previous-'+runId+'.local.json');
    fs.writeFileSync(path.resolve(__dirname, '../.chat-test.local.json'), JSON.stringify({ run: runId, senha: password, contas: users.map(u => ({ id_usuario: u.id_usuario, nome: u.nome, email: u.email })), ocorrencia_principal: first, ocorrencia_papeis_invertidos: reverse }, null, 2));

    const sa = await connect(a.token), sb = await connect(b.token), sc = await connect(c.token), sd = await connect(d.token);
    const send = (client, to, occurrenceId, text, id) => client.send({ type: 'chat_message', request_id: id, id_conversa: conversations.get(occurrenceId), text });
    send(sa, b, first, ' Olá, B! ', 'a1');
    const ack = await sa.wait(e => e.type === 'chat_ack' && e.request_id === 'a1');
    assert.equal(ack.mensagem.texto, 'Olá, B!'); assert.equal(ack.mensagem.minha,true); assert.equal(ack.mensagem.id_remetente,undefined);
    await sb.wait(e => e.type === 'chat_message' && e.mensagem.id_mensagem === ack.mensagem.id_mensagem);
    send(sb, a, first, 'Olá, A!', 'b1');
    const reply = await sb.wait(e => e.type === 'chat_ack' && e.request_id === 'b1');
    await sa.wait(e => e.type === 'chat_message' && e.mensagem.id_mensagem === reply.mensagem.id_mensagem);
    // Repetição do mesmo request_id na mesma conexão devolve o mesmo ack sem nova gravação.
    send(sa, b, first, ' Olá, B! ', 'a1');
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(sc.events.filter(e => e.type === 'chat_message').length, 0);
    assert.equal(sd.events.filter(e => e.type === 'chat_message').length, 0);
    const [saved] = await pool.execute('SELECT id_mensagem,id_remetente,id_destinatario,texto FROM mensagem WHERE id_ocorrencia=? ORDER BY id_mensagem', [first]);
    assert.equal(saved.length, 2);
    report.mensagens.push(...saved.map(m => m.id_mensagem));
    report.testes.push('A ↔ B em tempo real; persistência; não há broadcast; deduplicação na conexão');

    const url = `/mensagens/ocorrencia/${first}?id_interlocutor=${b.id_usuario}`;
    const history = await request('GET', url, a.token);
    assert.equal(history.status, 200); assert.equal(history.data.mensagens.length, 2);
    const page = await request('GET', url + '&limite=1', a.token);
    assert.equal(page.data.mensagens[0].id_mensagem, reply.mensagem.id_mensagem);
    const older = await request('GET', url + '&limite=1&antes_de=' + page.data.proximo_cursor, a.token);
    assert.equal(older.data.mensagens[0].id_mensagem, ack.mensagem.id_mensagem);
    assert.equal((await request('GET', url, c.token)).status, 403);
    assert.equal((await request('GET', url, d.token)).status, 403);
    assert.equal((await request('GET', url)).status, 401);
    assert.equal((await request('GET', url, 'invalid')).status, 401);
    assert.equal((await request('GET', `/mensagens/ocorrencia/${refused}?id_interlocutor=${b.id_usuario}`, a.token)).status, 403);
    sa.socket.close(); await once(sa.socket, 'close');
    const reopened = await connect(a.token);
    assert.equal((await request('GET', url, a.token)).data.mensagens.length, 2);
    report.testes.push('Histórico após reabrir, paginação, terceiros e tokens REST rejeitados');

    send(reopened, b, first, '', 'empty');
    assert.equal((await reopened.wait(e => e.request_id === 'empty')).codigo, 'INVALID_TEXT');
    send(reopened, b, first, 'a'.repeat(1001), 'long');
    assert.equal((await reopened.wait(e => e.request_id === 'long')).codigo, 'INVALID_TEXT');
    reopened.send({ type: 'chat_message', request_id: 'forge', id_ocorrencia: first, id_destinatario: b.id_usuario, id_remetente: d.id_usuario, text: 'forjado' });
    assert.equal((await reopened.wait(e => e.request_id === 'forge')).codigo, 'INVALID_EVENT');
    reopened.socket.send('{bad json');
    await reopened.wait(e => e.codigo === 'INVALID_JSON');
    for (const id of [finished, cancelled]) {
      send(reopened, b, id, 'bloqueada', `closed-${id}`);
      assert.equal((await reopened.wait(e => e.request_id === `closed-${id}`)).codigo, 'READ_ONLY');
      const read = await request('GET', `/mensagens/ocorrencia/${id}?id_interlocutor=${b.id_usuario}`, a.token);
      assert.equal(read.status, 200); assert.equal(read.data.conversa.somente_leitura, true);
    }
    send(sc, b, first, 'privada indevida', 'intrude');
    assert.equal((await sc.wait(e => e.request_id === 'intrude')).codigo, 'FORBIDDEN');
    send(reopened, b, reverse, 'Também sou voluntário neste outro pedido.', 'roles');
    await reopened.wait(e => e.type === 'chat_ack' && e.request_id === 'roles');
    await sb.wait(e => e.type === 'chat_message' && e.mensagem.id_conversa === conversations.get(reverse));
    report.testes.push('Texto e JSON inválidos, remetente forjado, conversa encerrada e papéis não exclusivos');

    const invalid = await connect(null, false);
    invalid.send({ type: 'auth', token: 'invalid' });
    await invalid.wait(e => e.type === 'auth_error');
    const expired = await connect(null, false);
    expired.send({ type: 'auth', token: jwt.sign({ id_usuario: a.id_usuario }, process.env.JWT_SECRET, { expiresIn: -1 }) });
    await expired.wait(e => e.type === 'auth_error');
    const early = await connect(null, false);
    send(early, b, first, 'antes de auth', 'early');
    await early.wait(e => e.type === 'auth_error');
    const beforeAuth = await connect(null, false);
    const silentCount = beforeAuth.events.length;
    send(sb, a, first, 'Somente participantes autenticados recebem.', 'privacy');
    await reopened.wait(e => e.type === 'chat_message' && e.mensagem.texto.startsWith('Somente'));
    assert.equal(beforeAuth.events.length, silentCount);
    beforeAuth.socket.close();
    report.testes.push('WebSocket sem auth, token inválido/expirado e isolamento antes da autenticação');

    // Regressão HTTP sem exclusão de contas reais.
    assert.equal((await request('GET', '/usuarios/me', a.token)).data.usuario.eh_voluntario, true);
    assert.equal((await request('GET', '/usuarios', a.token)).status, 403);
    const change = await request('PUT', '/usuarios/me/senha', d.token, { senhaAtual: password, novaSenha: password + '2', confirmarNovaSenha: password + '2' });
    assert.equal(change.status, 200);
    assert.equal((await request('POST', '/usuarios/login', null, { email: d.email, senha: password + '2' })).status, 200);
    await request('PUT', '/usuarios/me/senha', d.token, { senhaAtual: password + '2', novaSenha: password, confirmarNovaSenha: password });
    const list = await request('GET', '/conversas', a.token);
    assert(list.data.conversas.some(item => item.id_ocorrencia === first && item.id_conversa === conversations.get(first)));
    assert(!JSON.stringify(list.data).includes('senha_hash'));
    report.testes.push('Cadastro, login, perfil, listagem, troca de senha e lista de conversas reais');
    const [messages] = await pool.query('SELECT id_mensagem,id_ocorrencia,id_remetente,id_destinatario,texto,enviada_em FROM mensagem WHERE id_ocorrencia IN (?,?) ORDER BY id_mensagem', [first, reverse]);
    report.mensagens = messages.map(m => m.id_mensagem);
    console.log(JSON.stringify(report, null, 2));
    console.log('PASS: integração real HTTP + WebSocket + MySQL. Credenciais de teste em backend/.chat-test.local.json (ignorado pelo Git).');
  } finally {
    sockets.forEach(socket => socket.terminate()); chatServer.close();
    await new Promise(resolve => server.close(resolve)); await pool.end();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
