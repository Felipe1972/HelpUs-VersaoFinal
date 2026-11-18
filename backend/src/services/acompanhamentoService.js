const pool = require('../config/database');
const { context, AtendimentoError: ErrorHTTP } = require('./atendimentoService');

async function notify(db, uid, oid, type, title) {
  await db.execute('INSERT INTO notificacao_privada(id_usuario,id_ocorrencia,tipo,titulo) VALUES(?,?,?,?)', [uid, oid, type, title]);
}
async function shared(db, appointment) {
  if (!appointment) return false;
  const [[row]] = await db.execute('SELECT acao FROM consentimento_localizacao WHERE id_atendimento=? ORDER BY id_consentimento DESC LIMIT 1', [appointment.id_atendimento]);
  return row?.acao === 'compartilhar';
}
async function revoke(db, a, uid, oid) {
  if (await shared(db, a)) {
    await db.execute("INSERT INTO consentimento_localizacao(id_atendimento,id_autor,acao) VALUES(?,?,'revogar')", [a.id_atendimento, uid]);
    await notify(db, a.id_voluntario, oid, 'revogacao', 'Compartilhamento de localização encerrado');
  }
}
async function metadata(db, c, uid) {
  const owner = c.o.id_solicitante === uid;
  const a = c.accepted.length === 1 ? c.accepted[0] : null;
  const active = ['aberta', 'em_atendimento'].includes(c.o.status);
  const consent = !!(active && a && await shared(db, a));
  const participant = owner || (a && a.id_voluntario === uid && Number(c.u.eh_voluntario) === 1);
  const [[review]] = await db.execute('SELECT id_avaliacao,nota FROM avaliacao WHERE id_ocorrencia=? AND id_avaliador=? AND id_atendimento IS NOT NULL LIMIT 1', [c.o.id_ocorrencia, uid]);
  const done = c.a.find(x => x.status === 'finalizado');
  const [[person]] = a && participant ? await db.execute('SELECT nome FROM usuario WHERE id_usuario=?', [a.id_voluntario]) : [[]];
  const [[conversation]] = participant && a ? await db.execute('SELECT id_conversa FROM conversa WHERE id_ocorrencia=? AND id_voluntario=?', [c.o.id_ocorrencia, a.id_voluntario]) : [[]];
  const [[rating]] = a && participant ? await db.execute('SELECT AVG(nota) media,COUNT(*) quantidade FROM avaliacao WHERE id_avaliado=?', [a.id_voluntario]) : [[]];
  return {
    privado: owner || (!!participant && consent),
    acompanhamento: {
      deslocamento: participant&&a?{a_caminho_em:a.a_caminho_em,chegou_em:a.chegou_em,previsao_minutos:a.previsao_minutos,previsao_registrada_em:a.previsao_registrada_em}:null,
      pode_acompanhar: !!participant, ambiguo: c.accepted.length > 1,
      id_atendimento: participant ? a?.id_atendimento || null : null,
      responsavel: person?.nome || null, id_conversa: conversation?.id_conversa || null,
      compartilhado: !!participant && consent,
      conclusao_solicitada: !!participant && !!a?.conclusao_solicitada_em,
      aguarda_reabertura: !!c.o.aguarda_reabertura,
      pode_cancelar: owner && active,
      pode_compartilhar: owner && !!a && active,
      pode_desistir: !!a && !owner && !!participant && active,
      pode_solicitar_conclusao: !!a && !owner && !!participant && active,
      pode_finalizar: owner && !!a && c.o.status === 'em_atendimento',
      pode_reabrir: owner && !!c.o.aguarda_reabertura && c.o.status === 'aberta',
      pode_avaliar: owner && c.o.status === 'finalizada' && !!done && !review,
      avaliacao: review || null,
      reputacao: rating?.quantidade ? { media: Number(rating.media), quantidade: Number(rating.quantidade) } : null,
    },
  };
}
async function action(uid, id, kind, body = {}) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new ErrorHTTP('Pedido inválido.');
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const c = await context(db, id, uid, true), { o, accepted } = c;
    const owner = o.id_solicitante === uid;
    const a = accepted.length === 1 ? accepted[0] : null;
    const responsible = a?.id_voluntario === uid && Number(c.u.eh_voluntario) === 1;
    const active = ['aberta', 'em_atendimento'].includes(o.status);
    const ownerActions = ['cancelar', 'compartilhar', 'revogar', 'finalizar', 'rejeitar-conclusao', 'reabrir', 'avaliar'];
    if (ownerActions.includes(kind) ? !owner : !responsible) {
      // Repeated withdrawal remains harmless, but never grants rights to another user.
      if (!(kind === 'desistir' && c.latest?.status === 'desistiu')) throw new ErrorHTTP('Ação não permitida.', 403);
    }
    if (kind === 'cancelar') {
      if (o.status === 'cancelada') { await db.commit(); return { ok: true }; }
      if (!active) throw new ErrorHTTP('Pedido já encerrado.', 409);
      for (const x of accepted) {
        await revoke(db, x, uid, id);
        await db.execute("UPDATE atendimento SET status='cancelado',finalizado_em=NOW() WHERE id_atendimento=?", [x.id_atendimento]);
        await notify(db, x.id_voluntario, id, 'cancelamento', 'O solicitante cancelou o pedido');
      }
      await db.execute("UPDATE ocorrencia SET status='cancelada',aguarda_reabertura=0 WHERE id_ocorrencia=?", [id]);
    } else if (kind === 'reabrir') {
      if (o.status !== 'aberta' || accepted.length) throw new ErrorHTTP('Pedido indisponível para reabertura.', 409);
      await db.execute('UPDATE ocorrencia SET aguarda_reabertura=0 WHERE id_ocorrencia=?', [id]);
    } else if (kind === 'avaliar') {
      const done = c.a.find(x => x.status === 'finalizado');
      if (o.status !== 'finalizada' || !done || done.id_voluntario === uid) throw new ErrorHTTP('Conclua o atendimento antes de avaliar.', 409);
      if (!Number.isInteger(body.nota) || body.nota < 1 || body.nota > 5 || (body.comentario != null && (typeof body.comentario !== 'string' || body.comentario.trim().length > 500))) throw new ErrorHTTP('Escolha nota de 1 a 5 e comentário de até 500 caracteres.');
      const [[old]] = await db.execute('SELECT id_avaliacao FROM avaliacao WHERE id_atendimento=?', [done.id_atendimento]);
      if (!old) await db.execute('INSERT INTO avaliacao(id_ocorrencia,id_avaliador,id_avaliado,id_atendimento,nota,comentario) VALUES(?,?,?,?,?,?)', [id, uid, done.id_voluntario, done.id_atendimento, body.nota, body.comentario?.trim() || null]);
    } else if (kind === 'finalizar' && o.status === 'finalizada' || kind === 'desistir' && c.latest?.status === 'desistiu') {
      // Idempotent terminal action.
    } else {
      if (!active || !a) throw new ErrorHTTP('É necessário um único atendimento ativo.', 409);
      if (kind === 'compartilhar' || kind === 'revogar') {
        if (Number(body.id_atendimento) !== a.id_atendimento) throw new ErrorHTTP('O responsável mudou. Confira antes de compartilhar.', 409);
        const granted = await shared(db, a);
        if (kind === 'compartilhar' && !granted) {
          await db.execute("INSERT INTO consentimento_localizacao(id_atendimento,id_autor,acao) VALUES(?,?,'compartilhar')", [a.id_atendimento, uid]);
          await notify(db, a.id_voluntario, id, 'compartilhamento', 'O solicitante compartilhou o local do pedido');
        } else if (kind === 'revogar') await revoke(db, a, uid, id);
      } else if (kind === 'desistir') {
        await revoke(db, a, uid, id);
        await db.execute("UPDATE atendimento SET status='desistiu',finalizado_em=NOW() WHERE id_atendimento=?", [a.id_atendimento]);
        await db.execute("UPDATE ocorrencia SET status='aberta',aguarda_reabertura=(necessaria_em_utc IS NOT NULL AND necessaria_em_utc<=UTC_TIMESTAMP(3)) WHERE id_ocorrencia=?", [id]);
        await notify(db, o.id_solicitante, id, 'desistencia', 'O voluntário não poderá comparecer. Confira seu pedido');
      } else if (kind === 'solicitar-conclusao') {
        if (!a.conclusao_solicitada_em) {
          await db.execute('UPDATE atendimento SET conclusao_solicitada_em=NOW() WHERE id_atendimento=?', [a.id_atendimento]);
          await notify(db, o.id_solicitante, id, 'conclusao_pendente', 'O voluntário solicitou a confirmação de conclusão');
        }
      } else if (kind === 'rejeitar-conclusao') {
        if (a.conclusao_solicitada_em) {
          await db.execute('UPDATE atendimento SET conclusao_solicitada_em=NULL WHERE id_atendimento=?', [a.id_atendimento]);
          await notify(db, a.id_voluntario, id, 'conclusao_recusada', 'O solicitante informou que o atendimento continua');
        }
      } else if (kind === 'finalizar') {
        await revoke(db, a, uid, id);
        await db.execute("UPDATE atendimento SET status='finalizado',finalizado_em=NOW() WHERE id_atendimento=?", [a.id_atendimento]);
        await db.execute("UPDATE ocorrencia SET status='finalizada',aguarda_reabertura=0 WHERE id_ocorrencia=?", [id]);
        await notify(db, a.id_voluntario, id, 'conclusao', 'O solicitante confirmou a conclusão do atendimento');
        await notify(db, uid, id, 'conclusao', 'Atendimento concluído. Você já pode avaliar');
      } else throw new ErrorHTTP('Ação inválida.');
    }
    await db.commit(); return { ok: true };
  } catch (e) { await db.rollback(); throw e; } finally { db.release(); }
}
module.exports = { action, metadata, shared, notify };
