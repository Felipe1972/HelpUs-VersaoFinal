const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('fs'),
  vm = require('vm'),
  babel = require('@babel/core');
const m = { exports: {} };
vm.runInNewContext(
  '(function(exports){' +
    babel.transformSync(fs.readFileSync('src/services/reminders.js', 'utf8'), {
      babelrc: false,
      configFile: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code +
    '})',
)(m.exports);
test('reconcilia sem duplicar, cancela alterações/conta/permissão e ignora datas passadas', async () => {
  let pending = [];
  const n = {
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getAllScheduledNotificationsAsync: async () => pending,
    scheduleNotificationAsync: async (x) => pending.push(x),
    cancelScheduledNotificationAsync: async (id) => {
      pending = pending.filter((x) => x.identifier !== id);
    },
  };
  const items = [
    {
      id_atendimento: 1,
      id_ocorrencia: 2,
      horario: new Date(Date.now() + 3600000).toISOString(),
    },
  ];
  await m.exports.reconcileReminders(n, 1, items, true);
  assert.equal(pending.length, 1);
  await m.exports.reconcileReminders(n, 1, items, true);
  assert.equal(pending.length, 1);
  await m.exports.reconcileReminders(n, 2, items, true);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].content.data.accountId, 2);
  await m.exports.reconcileReminders(n, 2, [], true);
  assert.equal(pending.length, 0);
  await m.exports.reconcileReminders(n, 2, items, false);
  assert.equal(pending.length, 0);
  await m.exports.reconcileReminders(
    n,
    2,
    [{ ...items[0], horario: new Date().toISOString() }],
    true,
  );
  assert.equal(pending.length, 0);
});
