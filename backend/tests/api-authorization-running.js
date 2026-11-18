// Testa a API realmente em execução. Somente SELECT e GET; tokens temporários não são impressos.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
const pool = require('../src/config/database');
const base = process.env.TEST_API_URL || 'http://127.0.0.1:3000';
async function main() {
  assert.equal(process.env.DB_NAME, 'help_us2');
  const [users] = await pool.query(
    'SELECT id_usuario,nome,email,eh_voluntario,status_verificacao FROM usuario',
  );
  const [rows] = await pool.query('SELECT * FROM ocorrencia');
  const pedro = users.find((u) => u.email === 'pedro10@gmail.com');
  assert(pedro);
  assert.equal(Number(pedro.eh_voluntario), 0);
  const volunteer = users.find(
    (u) =>
      Number(u.eh_voluntario) === 1 &&
      u.status_verificacao !== 'bloqueado' &&
      rows.some((o) => o.id_solicitante === u.id_usuario),
  );
  assert(volunteer);
  const foreign = rows.find(
    (o) =>
      o.id_solicitante !== pedro.id_usuario &&
      ['aberta', 'em_atendimento'].includes(o.status),
  );
  assert(foreign);
  const third = users.find((u) => u.id_usuario === foreign.id_solicitante);
  const token = (u) =>
    jwt.sign({ id_usuario: u.id_usuario }, process.env.JWT_SECRET, { expiresIn: '5m' });
  async function get(path, user, status = 200) {
    const res = await fetch(base + path, {
      headers: { Authorization: 'Bearer ' + token(user) },
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(res.status, status, path);
    return res.json();
  }
  const valid = (o) =>
    ['aberta', 'em_atendimento'].includes(o.status) &&
    o.latitude != null &&
    o.longitude != null &&
    Math.abs(Number(o.latitude)) <= 90 &&
    Math.abs(Number(o.longitude)) <= 180;
  const ids = (list) => list.map((o) => o.id_ocorrencia).sort((a, b) => a - b);
  for (const user of [pedro, third]) {
    const mine = await get('/ocorrencias?escopo=meus', user);
    assert.deepEqual(
      ids(mine.ocorrencias),
      ids(rows.filter((o) => o.id_solicitante === user.id_usuario)),
    );
    const own = rows.find((o) => o.id_solicitante === user.id_usuario);
    assert.equal(
      (await get('/ocorrencias/' + own.id_ocorrencia, user)).ocorrencia.meu_pedido,
      true,
    );
  }
  const list = await get('/ocorrencias', pedro);
  assert.equal(list.perfil.eh_voluntario, false, 'API antiga: falta perfil atualizado');
  assert.deepEqual(
    ids(list.ocorrencias),
    ids(rows.filter((o) => valid(o) && o.id_solicitante === pedro.id_usuario)),
  );
  assert(
    list.ocorrencias.every((o) => o.meu_pedido && o.id_solicitante === pedro.id_usuario),
  );
  await get('/ocorrencias/' + foreign.id_ocorrencia, pedro, 404);
  await get('/ocorrencias?escopo=disponiveis', pedro, 403);
  const opportunities = await get('/ocorrencias?escopo=disponiveis', volunteer);
  assert.equal(opportunities.perfil.eh_voluntario, true);
  const [allAppointments] = await pool.query(
    'SELECT * FROM atendimento ORDER BY id_atendimento DESC',
  );
  const eligible = rows.filter((o) => {
    const a = allAppointments.filter((x) => x.id_ocorrencia === o.id_ocorrencia);
    const own = a.find((x) => x.id_voluntario === volunteer.id_usuario);
    return (
      valid(o) &&
      o.status === 'aberta' &&
      !o.aguarda_reabertura &&
      o.id_solicitante !== volunteer.id_usuario &&
      !a.some(
        (x, i) =>
          x.status === 'aceito' &&
          !a.slice(0, i).some((y) => y.id_voluntario === x.id_voluntario),
      ) &&
      own?.status !== 'desistiu' &&
      !(own?.status === 'recusado' && !own.recusa_desfeita_em)
    );
  });
  assert.deepEqual(ids(opportunities.ocorrencias), ids(eligible));
  assert(opportunities.ocorrencias.every((o) => o.meu_pedido === false));
  const [appointments] = await pool.query(
    'SELECT * FROM atendimento WHERE id_voluntario=?',
    [volunteer.id_usuario],
  );
  const publicRow = rows.find(
    (o) =>
      valid(o) &&
      o.id_solicitante !== volunteer.id_usuario &&
      !appointments.some((a) => a.id_ocorrencia === o.id_ocorrencia),
  );
  assert(publicRow);
  const pub = (await get('/ocorrencias/' + publicRow.id_ocorrencia, volunteer))
    .ocorrencia;
  assert.equal(pub.descricao, null);
  assert.equal(pub.endereco_referencia, null);
  assert.equal(pub.localizacao_aproximada, true);
  assert.equal(pub.endereco_disponivel, false);
  assert.equal(
    pub.latitude,
    Number((Math.round(Number(publicRow.latitude) * 100) / 100).toFixed(2)),
  );
  assert.equal(
    pub.longitude,
    Number((Math.round(Number(publicRow.longitude) * 100) / 100).toFixed(2)),
  );
  assert.equal(pub.id_solicitante, undefined);
  for (const own of rows.filter((o) => o.id_solicitante === volunteer.id_usuario)) {
    assert.equal(
      (await get('/ocorrencias/' + own.id_ocorrencia, volunteer)).ocorrencia
        .elegivel_para_aceite_futuro,
      false,
    );
  }
  // Alternância de identidades na mesma API não reutiliza resposta de outro usuário.
  await get('/ocorrencias', volunteer);
  assert.deepEqual(
    ids((await get('/ocorrencias', pedro)).ocorrencias),
    ids(list.ocorrencias),
  );
  const [accepted] = await pool.query(
    "SELECT a.id_ocorrencia,a.id_voluntario,o.id_solicitante FROM atendimento a JOIN ocorrencia o USING(id_ocorrencia) WHERE a.status='aceito' LIMIT 1",
  );
  assert(accepted.length);
  const context = accepted[0],
    owner = users.find((u) => u.id_usuario === context.id_solicitante);
  const history = await get(
    '/mensagens/ocorrencia/' +
      context.id_ocorrencia +
      '?id_interlocutor=' +
      context.id_voluntario,
    owner,
  );
  assert(Array.isArray(history.mensagens));
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace(/^http/, 'ws') + '/ws/chat');
    const timer = setTimeout(() => {
      ws.terminate();
      reject(Error('Timeout WebSocket'));
    }, 5000);
    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token: token(owner) })));
    ws.on('message', (raw) => {
      const event = JSON.parse(raw);
      if (event.type === 'auth_ok') {
        clearTimeout(timer);
        ws.close();
        resolve();
      } else if (event.type === 'auth_error') {
        clearTimeout(timer);
        ws.close();
        reject(Error('Auth WS rejeitada'));
      }
    });
  });
  const after = (await pool.query('SELECT * FROM ocorrencia'))[0];
  assert.deepEqual(after, rows, 'O teste não modifica pedidos');
  console.log(
    JSON.stringify(
      {
        api: base,
        pedro: {
          id: pedro.id_usuario,
          eh_voluntario: pedro.eh_voluntario,
          pedidos: ids(list.ocorrencias),
        },
        voluntario: volunteer.id_usuario,
        terceiro: third.id_usuario,
        detalhes_alheios: 404,
        comunidade_comum: 403,
        privacidade: 'OK',
        troca_identidade_api: 'OK',
        chat_historico_e_auth: 'OK',
        escritas: 0,
      },
      null,
      2,
    ),
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
