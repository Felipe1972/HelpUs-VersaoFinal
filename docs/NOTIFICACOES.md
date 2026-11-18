# Notificações do Help Us

Implementado em 17/11/2026, exclusivamente em C:\Users\Usuario\Desktop\HelpUsTeste. Expo SDK 58 mantido. Nada enviado ao GitHub. OneDrive não alterado.

## Funcionamento entregue

- expo-notifications ~58.1.9, instalado com npx expo install expo-notifications e Node portátil 22.23.5.
- Reutiliza notificacao_privada no help_us2. Não existe uma segunda caixa de avisos.
- Criação do pedido e avisos aos voluntários são atômicos na mesma transação. Recebem usuários eh_voluntario=1 não bloqueados, exceto autor. Não há região de atuação confiável para todos os voluntários; nesta etapa todos os elegíveis recebem. Nenhuma coleta extra/contínua de GPS.
- Aceite, compartilhamento/revogação, desistência, cancelamento, conclusão solicitada/recusada/confirmada mantêm os avisos persistentes existentes.
- Cada nova mensagem grava um aviso genérico para o destinatário na mesma transação. Repetir request_id não duplica mensagem nem aviso. O remetente não recebe seu próprio aviso de mensagem.
- O WebSocket existente continua entregando o chat. O provedor global consulta os avisos reais a cada 15 segundos, apenas com sessão validada, tela autenticada e aplicativo ativo; não abre outro WebSocket.
- Local notifications usam canal Android helpus-events de alta importância, apresentação em primeiro plano e som padrão (sujeitos aos ajustes do sistema).
- Permissão solicitada uma única vez quando ainda indeterminada; recusa não impede login, mapa, chat ou caixa de avisos. Perfil → Permissão de notificações consulta o estado e abre ajustes do aparelho. Atualiza ao retornar dos ajustes.
- Sino: quantidade real de avisos não lidos, incluindo os que excedem os 100 itens da página. Acima de 99 mostra 99+. Ler um item marca apenas o aviso da própria conta. Avisos de oportunidades deixam de contar/aparecer quando o usuário perde elegibilidade ou o pedido deixa de estar disponível.

## Controle de apresentação e sessão

Cursor persistente por ID de usuário. A primeira consulta em cada conta/aparelho estabelece uma linha de base sem disparar o histórico. Depois disso, só são apresentados avisos novos, não lidos, com menos de dois minutos; no máximo três por consulta. Todos continuam na caixa de avisos, mesmo quando não há alerta local. O cursor é reservado antes de chamar o sistema, favorecendo ausência de repetição em uma falha de apresentação.

Mensagem da conversa atualmente aberta não gera alerta local. Consultas não se sobrepõem. Respostas que chegam após logout/troca de conta são descartadas. Logout remove alertas locais apresentados/agendados pelo app e zera o indicador; cursores das contas permanecem separados. O conteúdo nativo tem título/texto genéricos e somente source, accountId, tipo, id_ocorrencia, id_conversa opcional e id_notificacao em data. Não inclui endereço, coordenadas, nome privado ou texto da mensagem.

O toque é capturado em primeiro plano, ao retornar do segundo plano e pela última resposta nativa no arranque, quando o ambiente a fornece. Aguarda sessão verificada em /usuarios/me e NavigationContainer pronto. Em arranque com sessão válida abre Home + destino; sem sessão válida aguarda login. Uma notificação de outra conta é descartada. O backend resolve novamente o destino autorizado. Recursos bloqueados/removidos dão mensagem de indisponibilidade, nunca acesso pelo payload antigo.

## Rotas

- GET /notificacoes → { notificacoes: [...], nao_lidas }. Até 100 avisos visíveis, priorizando não lidos e depois os mais recentes; ao ler, os próximos não lidos entram na lista. Contagem não limitada a 100.
- POST /notificacoes/:id/lida → autenticação, usuário ativo e propriedade do aviso. Idempotente.
- GET /notificacoes/:id/abrir → autenticação, propriedade, autorização atual do recurso; retorna { tela, params }. Não usa destino fornecido pelo cliente.
- novo_pedido → OcorrenciaDetalhes; mensagem com UUID → Chat; avisos antigos de conversa sem UUID → Conversas filtradas por ocorrência; demais → Acompanhamento.
- As telas também consultam os dados atuais na API. Aceite nunca libera localização automaticamente; consentimento continua obrigatório.

## Banco: alteração única já aplicada

Script: backend/scripts/notifications-migration.js. Verifica help_us2 e existência da coluna antes de executar. Backup privado dos 90 avisos anteriores em .private-backups/notificacoes-before-*.local.json; comparação após ALTER confirmou preservação. Não reaplicar migrações antigas.

SQL executado:

~~~sql
ALTER TABLE notificacao_privada
  ADD COLUMN id_conversa CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD CONSTRAINT fk_notificacao_conversa
    FOREIGN KEY (id_conversa) REFERENCES conversa(id_conversa) ON DELETE SET NULL;
~~~

O UUID opcional evita abrir a conversa errada quando um pedido tem vários interlocutores. Nenhum valor anterior foi atualizado. A alteração já está no banco desta máquina; o script é apenas para instalação em outra cópia compatível.

## Arquivos

Criados:
- backend/scripts/notifications-migration.js
- backend/src/services/notificacaoService.js
- backend/tests/notificacoes-integration.js
- mobile/src/context/NotificationsContext.js
- mobile/src/services/notificationPolicy.js
- mobile/src/screens/NotificationSettingsScreen.js
- mobile/tests/notifications.test.cjs
- NOTIFICACOES.md

Alterados:
- backend/package.json
- backend/src/routes/acompanhamentoRoutes.js
- backend/src/services/ocorrenciaService.js
- backend/src/services/chatService.js
- mobile/package.json e mobile/package-lock.json
- mobile/src/services/authStorage.js
- mobile/src/navigation/AppNavigator.js
- mobile/src/components/UI.js
- mobile/src/screens/NotificacoesReaisScreen.js
- mobile/src/screens/PerfilScreen.js
- mobile/tests/frontend-smoke.cjs

Não foram alterados Home, lógica de GPS, permissões de ocorrências, consentimento, protocolo WebSocket ou versão do Expo.

## Validações executadas

- Backend npm test: 8/8 testes unitários.
- test:finalizacao: fluxo real de endereço, aceite concorrente, consentimento/revogação, desistência, cancelamento, conclusão e avaliação; preservação de todos os registros anteriores. Novos usuários 55–58 e pedidos 61–67 identificados como teste.
- test:notificacoes: HTTP + MySQL reais; voluntário recebe, autor/comum/bloqueado não; alteração de papel revoga acesso ao aviso de oportunidade; recusa oculta e desfazer recusa restaura a oportunidade; propriedade e leitura; contagem; aceite sem duplicação; mensagem por destinatário com UUID e deduplicação; privacidade; chat após cancelamento somente histórico. Primeira execução: usuários 59–62, pedido 68. Após corrigir recusa desfeita: usuários 67–70, pedido 74. Snapshot de todos os registros anteriores preservado.
- test:integration: HTTP + WebSocket + MySQL; envio A↔B, persistência, isolamento, JWT inválido/expirado, remetente forjado, encerramento; cadastro, login, perfil, lista e troca de senha. Usuários 63–66 e pedidos 69–73 de teste.
- API reiniciada na porta 3000 e verificada sem escrita: Pedro ID 10 continua comum, somente pedidos 9/11/26/27/28, detalhe alheio 404, comunidade 403, privacidade e chat/auth OK.
- Mobile npm test: smoke de 21 rotas, mapa/polling/GPS/conta e 10 testes de chat/localização/notificações. Os testes de permissão, banner, troca de conta, resposta em voo e arranque frio usam adaptadores nativos simulados; não equivalem a teste físico.
- Sintaxe: 31 arquivos JS/JSX.
- Expo Doctor: 20/20.
- Export Android: 1.059 módulos, dist/android.
- Export iOS: 1.062 módulos, dist/ios.

## Como iniciar e testar no celular

O backend foi reiniciado com o código atualizado na porta 3000. Não execute outra instância simultânea. Caso tenha parado, no Git Bash:

~~~bash
cd /c/Users/Usuario/Desktop/HelpUsTeste/backend
npm start
~~~

Em outro terminal:

~~~bash
cd /c/Users/Usuario/Desktop/HelpUsTeste/mobile
source ./scripts/use-node.sh
npx expo start --clear
~~~

Computador e celular precisam alcançar a mesma API configurada em mobile/.env. Abra o QR do processo dessa pasta. Não é necessário repetir SQL.

Roteiro físico pendente no Samsung/iPhone:
1. Entre como voluntário e aguarde carregar a Home e a primeira consulta de avisos; aceite a permissão.
2. Em outro aparelho/conta crie um pedido real. Mantendo o voluntário ativo, aguarde até 15 segundos. Confira banner, sino e abertura do pedido correto.
3. Aceite o pedido; no solicitante confira aviso e Acompanhamento. Endereço ainda deve depender de consentimento explícito.
4. Troque mensagens: com destinatário fora da conversa deve haver aviso; dentro da mesma conversa não deve haver banner. Confira toque abrindo o UUID correto.
5. Compartilhe/revogue localização, desista, cancele, solicite e confirme conclusão conforme o fluxo. Confira estado atualizado e histórico.
6. Negue permissão: Avisos e indicador devem continuar funcionando. Perfil permite consultar e abrir ajustes; confirme atualização ao retornar.
7. Troque contas com consulta em andamento: nada da conta anterior deve aparecer. Toque em aviso antigo de outra conta e confira descarte.
8. Teste toque em aviso já apresentado ao retornar do segundo plano e após encerrar/reabrir, caso o Expo Go disponibilize a resposta nativa. GPS, banner/som, ajustes do SO e cold start só podem ser confirmados fisicamente.

## Limites do Expo Go

Esta entrega NÃO recebe novos eventos do servidor com aplicativo fechado ou suspenso. Não há serviço de background, token push ou envio FCM/APNs. Ao voltar, a caixa persistente é consultada; alertas antigos não são reproduzidos em massa. Um aviso já apresentado pode continuar na central do sistema e permitir toque, conforme o Expo Go/SO.

## Push real futuro: proposta isolada, não ativada

Não foram criadas contas externas, credenciais, builds ou registros de tokens. Para ativar futuramente:

1. Criar Development Build do próprio Help Us com expo-notifications no config plugin e projectId EAS. Configurar FCM v1 Android e APNs iOS no projeto autorizado; não inserir credenciais no mobile ou no Git. Push remoto no Android não funciona no Expo Go desde SDK 53.
2. Implementar registro autenticado por JWT de instalação/dispositivo e ExpoPushToken. ID do usuário sempre vem do JWT; múltiplas instalações por usuário, token único, plataforma, data de atualização, ativo e versão de associação. Transferir associação atomicamente em troca de conta. Não aceitar userId arbitrário.
3. No logout, desassociar a instalação autenticada antes de limpar sessão; se offline, revalidar/reconciliar no próximo contato, usar payload genérico e nunca incluir informações privadas. A autorização ao toque continuará obrigatória.
4. Adicionar worker/outbox no backend sobre os mesmos avisos persistidos. Deduplicar por aviso+instalação; reconsultar vínculo, bloqueio, papel e elegibilidade antes de enviar; lidar com expiração, retentativas limitadas e rate limit. Não entregar ao token associado a outra conta.
5. Usar Expo Push Service pelo backend. Processar tickets e receipts, desativar DeviceNotRegistered, tratar falhas transitórias sem multiplicar envios. Tokens e access tokens de envio não entram em logs públicos.
6. Testar Android/iOS físicos em development/release builds: fechado, suspenso, conta trocada, logout offline, token rotacionado, dispositivo removido, múltiplos aparelhos e privacidade na tela bloqueada. Evitar duplicar push remoto com a apresentação local usando o mesmo id_notificacao/cursor.

Essas etapas são um contrato para a próxima fase, não endpoints ou push funcional já entregue. A configuração atual do Expo Go foi preservada.

## Referências consultadas

- Material anexado notificacoes-react-native-expo.pdf: 17 páginas, notificação local vs push, canais, permissões, apresentação, agendamento e limitações físicas. Não foi implementado o app de lembretes de exemplo, pois o pedido é baseado em eventos reais do Help Us.
- https://docs.expo.dev/versions/v58.0.0/sdk/notifications/ — versão compatível ~58.1.9, locais no Expo Go, handler, canal Android e respostas de navegação.


## Complementos — checkpoint prioridade 1

Novos eventos a-caminho, cheguei e previsao: avisos genéricos ao solicitante, destino Acompanhamento. Idempotência serializada por ocorrência. Lembretes agendados ainda PENDENTES nesta rodada; não há novo agendamento local implementado.

## Entrega de complementos — 18/11/2026
Concluídos: lembretes locais, leitura por destinatário/IDs visíveis, disponibilidade independente, distância 2/5/10/25km/Todos e ordenação, perfil público contextual com avaliações reais, edição nome/telefone, contatos privados CRUD.
Testes: 8 backend, 13 mobile, renderização/24 rotas, sintaxe/36 arquivos; integrações finalização, chat, permissões, atendimento e notificações aprovadas. Dados anteriores preservados. Bundles Android/iOS gerados. Doctor 19/20: patch esperado 58.0.26 versus 58.0.25, preservado. API Desktop reiniciada e /status confirmado na porta3000.
Pendente físico Samsung/iPhone: teclado/fontes, GPS/filtro/mapa/polling, lembrete com tela bloqueada e toque, mensagens visíveis/badge, logout/troca de conta, edição e contatos. Testes nativos simulados.
Limites: distância em linha reta, GPS até2min/precisão100m; sem GPS adequado mostra Todos. Notificações não filtradas geograficamente. Lembrete pode tocar após cancelamento com app fechado sem push; toque reautoriza na API. Badge usa polling.
Sem atualização Expo/Node global, sem OneDrive, sem push. Checkpoint anterior 5a1b7e8.
