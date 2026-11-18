const test = require('node:test'),
  assert = require('node:assert/strict');
const { formatPhone, openDialer } = require('../src/services/phone');
test('discador usa tel sem realizar chamadas; formatação e falha', async () => {
  const calls = [],
    link = { openURL: async (u) => calls.push(u) };
  for (const n of ['192', '193', '190', '(51) 99999-9999']) await openDialer(link, n);
  assert.deepEqual(calls, ['tel:192', 'tel:193', 'tel:190', 'tel:51999999999']);
  assert.equal(formatPhone('51999999999'), '(51) 99999-9999');
  await assert.rejects(openDialer(link, 'abc'));
  await assert.rejects(
    openDialer(
      {
        openURL: async () => {
          throw Error('indisponível');
        },
      },
      '192',
    ),
  );
});
