const pool = require('../config/database');
const { context, AtendimentoError: E } = require('./atendimentoService');
const { notify } = require('./acompanhamentoService');
// Registra deslocamento declarado e previsão somente para o responsável ativo.
async function action(uid, id, kind, body = {}) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new E('Pedido inválido.');
  if (Object.keys(body).some((k) => k !== 'minutos')) throw new E('Campo não permitido.');
  const min = body.minutos;
  if (min !== undefined && (!Number.isInteger(min) || min < 1 || min > 1440))
    throw new E('Informe de 1 a 1440 minutos.');
  if (kind === 'previsao' && min === undefined)
    throw new E('Informe a previsão em minutos.');
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const c = await context(db, id, uid, true),
      a = c.accepted.length === 1 ? c.accepted[0] : null;
    if (
      !a ||
      a.id_voluntario !== uid ||
      Number(c.u.eh_voluntario) !== 1 ||
      c.o.status !== 'em_atendimento'
    )
      throw new E('Atendimento não disponível para esta ação.', 403);
    let changed = false;
    if (kind === 'a-caminho') {
      if (!a.a_caminho_em && !a.chegou_em) {
        await db.execute(
          'UPDATE atendimento SET a_caminho_em=NOW(),previsao_minutos=?,previsao_registrada_em=IF(? IS NULL,NULL,NOW()) WHERE id_atendimento=?',
          [min ?? null, min ?? null, a.id_atendimento],
        );
        changed = true;
      }
    } else if (kind === 'cheguei') {
      if (!a.a_caminho_em) throw new E('Informe primeiro que está a caminho.');
      if (!a.chegou_em) {
        await db.execute(
          'UPDATE atendimento SET chegou_em=NOW() WHERE id_atendimento=?',
          [a.id_atendimento],
        );
        changed = true;
      }
    } else if (kind === 'previsao') {
      if (!a.a_caminho_em || a.chegou_em)
        throw new E('Previsão disponível somente durante o deslocamento.');
      if (
        a.previsao_minutos !== min ||
        !a.previsao_registrada_em ||
        Date.now() - new Date(a.previsao_registrada_em).getTime() > 60000
      ) {
        await db.execute(
          'UPDATE atendimento SET previsao_minutos=?,previsao_registrada_em=NOW() WHERE id_atendimento=?',
          [min, a.id_atendimento],
        );
        changed = true;
      }
    } else throw new E('Ação inválida.');
    if (changed)
      await notify(
        db,
        c.o.id_solicitante,
        id,
        kind,
        kind === 'a-caminho'
          ? 'O voluntário está a caminho.'
          : kind === 'cheguei'
            ? 'O voluntário informou que chegou ao local.'
            : 'O voluntário atualizou a previsão de chegada.',
      );
    await db.commit();
    return { ok: true };
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}
module.exports = { action };
