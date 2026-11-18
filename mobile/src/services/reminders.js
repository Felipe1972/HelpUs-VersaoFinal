// Reconcilia lembretes futuros por conta, atendimento e horário sem duplicá-los.
export async function reconcileReminders(
  native,
  uid,
  items,
  allowed,
  isCurrent = () => true,
  now = Date.now(),
) {
  const desired = new Map();
  if (allowed)
    for (const item of items) {
      const at = Date.parse(item.horario) - 30 * 60000;
      if (Number.isFinite(at) && at > now) {
        const id = 'helpus-reminder-' + uid + '-' + item.id_atendimento + '-' + at;
        desired.set(id, { item, at });
      }
    }
  const pending = await native.getAllScheduledNotificationsAsync();
  if (!isCurrent()) return;
  for (const n of pending) {
    if (n.content.data?.tipo === 'lembrete' && !desired.has(n.identifier))
      await native.cancelScheduledNotificationAsync(n.identifier);
  }
  for (const [identifier, { item, at }] of desired) {
    if (!isCurrent()) return;
    if (pending.some((n) => n.identifier === identifier)) continue;
    await native.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Atendimento agendado',
        body: 'Você possui um atendimento marcado para daqui a 30 minutos.',
        sound: 'default',
        data: {
          source: 'helpus',
          tipo: 'lembrete',
          accountId: uid,
          id_atendimento: item.id_atendimento,
          id_ocorrencia: item.id_ocorrencia,
        },
      },
      trigger: {
        type: native.SchedulableTriggerInputTypes.DATE,
        date: new Date(at),
        channelId: 'helpus-events',
      },
    });
    if (!isCurrent()) await native.cancelScheduledNotificationAsync(identifier);
  }
}
