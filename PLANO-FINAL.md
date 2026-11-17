# Finalização Help Us

Pasta exclusiva: Desktop/HelpUsTeste. SDK 58, Node portátil do mobile e help_us2 preservados. Sem push e sem alterações no OneDrive.

1. Preparação concluída: testes de referência backend (7) e mobile (smoke + 6); commit 7db0621; tag backup-sdk58-pre-finalizacao. Dump completo privado em .private-backups, ignorado pelo Git.
2. Banco: migração aditiva database/finalizacao.sql. Novos estados de atendimento, conclusão solicitada, reabertura explícita, consentimento por vínculo com histórico, notificações privadas, endereço estruturado e snapshot do pedido, avaliação única por atendimento. Não preencher endereços antigos nem escolher responsável em vínculos ambíguos.
3. Backend: transações serializadas pela ocorrência; autorização relida do banco; consentimento revogável; cancelamento/desistência/conclusão; avaliações e notificações privadas.
4. Mobile: acompanhamento dedicado, endereço próprio, notificações reais, contexto no chat e Home compacta conforme desenho. Preservar mapa durante polling, GPS real, áreas seguras e alternativas de acessibilidade.
5. Validação: regressão unitária, integração com dados identificados novos, hashes dos registros anteriores, smoke mobile, Expo Doctor, exportações Android/iOS. Validação física separada.
6. Entrega: RELATORIO-FINAL-HELPUS.md e CHECKLIST-TESTES-FINAIS.md; commits locais por etapa validada.

Decisões: aceite não implica consentimento; localização precisa exige compartilhamento explícito e vínculo ativo único. Desistência reabre pedidos futuros/sem horário, mas pedidos com horário passado aguardam decisão do dono. Conclusão pode ser confirmada diretamente pelo dono; voluntário somente solicita. Conversa de vínculo desistente permanece histórica. Dados previamente vistos não podem ser apagados da memória ou capturas do destinatário.

## Checkpoint concluído

Migração finalizacao.sql já aplicada; não reaplicar. Ciclo completo, Home, endereço e avisos implementados. Integrações reais passaram; Expo Doctor 20/20 e bundles Android/iOS aprovados. API da pasta Desktop reiniciada em 3000 e testada via LAN. 128 registros anteriores preservados. Ver RELATORIO-FINAL-HELPUS.md para limitações e CHECKLIST-TESTES-FINAIS.md para validação física pendente. Commits 7db0621, cde6f60 e 8e727f6, além do checkpoint documental final. Sem push.
