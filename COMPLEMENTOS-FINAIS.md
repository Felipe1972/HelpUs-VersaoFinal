# Complementos finais — checkpoint

Projeto Desktop/HelpUsTeste. Alterações anteriores preservadas. Sem push.

- [x] Como chegar
- [x] Copiar endereço
- [x] Deslocamento e chegada
- [x] Previsão
- [ ] Lembretes
- [ ] Mensagens não lidas
- [ ] Disponibilidade
- [ ] Distância
- [ ] Perfil público
- [ ] Editar perfil
- [ ] Contatos privados
- [ ] Validação final

Checkpoint: Linking/web e clipboard validados com adaptadores nativos; API destino testada com responsável, proprietário, terceiros e revogação. Migração deslocamento adicionou quatro campos opcionais e preservou 82 atendimentos. Etapas 3–4 aguardam teste integrado.

## Prioridade 1 validada

Endpoints: GET /ocorrencias/:id/destino; POST /ocorrencias/:id/a-caminho, /cheguei e /previsao. Corpo opcional minutos inteiro 1–1440 (obrigatório para atualizar previsão). O JWT determina o voluntário, trava da ocorrência serializa alterações. Destino só para responsável ativo com consentimento atual; recusas, terceiros e revogação bloqueados.

Migração scripts/deslocamento-migration.js já aplicada: atendimento.a_caminho_em DATETIME NULL, chegou_em DATETIME NULL, previsao_minutos SMALLINT UNSIGNED NULL, previsao_registrada_em DATETIME NULL. Backup privado e 82 registros anteriores conferidos sem alteração. Não reaplicar migrações anteriores.

Arquivos: backend/src/services/deslocamentoService.js, acompanhamentoService.js, routes/ocorrenciaRoutes.js e acompanhamentoRoutes.js, scripts/deslocamento-migration.js, tests/finalizacao-integration.js; mobile/src/services/destino.js, notificationPolicy.js, screens/AcompanhamentoScreen.js, tests/destino.test.cjs, frontend-smoke.cjs, package.json e lock. Dependência nova: expo-clipboard instalada com expo install (SDK preservado).

Testes: integração real finalizacao com usuários novos 75–78/pedidos 82–88, registros anteriores preservados; testes mobile (11 + renderização recursiva e cenários), sintaxe/escopo de 32 arquivos. Linking e Clipboard simulados; verificar fisicamente Samsung/iPhone, destino externo, fallback web, texto copiado e avisos. Localização já aberta/copied fora do app não pode ser apagada pelo Help Us.

Prioridades 2–4 ainda pendentes: não foram implementados lembretes, mensagens não lidas, disponibilidade, distância, perfil público, edição de perfil ou contatos. Próxima etapa obrigatória: lembretes locais autorizados, antes das demais. Nenhuma dessas funções é considerada concluída.

## Validação do checkpoint

Backend: 8 testes unitários, integração completa finalizacao e autorização da API em execução aprovados. Mobile: 11 testes, smoke/renderização e sintaxe/escopo aprovados. Bundles Android/iOS gerados. Doctor 19/20: somente patch Expo esperado 58.0.26 versus instalado 58.0.25; não atualizado por restrição. API confirmada/reiniciada: Desktop/HelpUsTeste/backend/server.js, PID 5624, porta 3000. Prioridades 2–4 e validação final dessas prioridades continuam pendentes.

Commit local do conjunto estável: aa1fc1f. Inclui a implementação de notificações já existente e as quatro primeiras funções dos complementos. Sem push. Retomar pela etapa 5 (lembretes), sem repetir a migração de deslocamento.
