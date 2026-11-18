# Atendimento real e chat anônimo — entrega

Implementado em C:\Users\Usuario\Desktop\HelpUsTeste. Não foi alterada a cópia do OneDrive, o SDK 58 ou as dependências; não houve push.

## Banco e compatibilidade
A migração `database/atendimento-chat.sql` foi aplicada ao help_us2. NÃO execute novamente: ela é aditiva, mas não idempotente. Acrescenta descricao_publica, modalidade_horario, necessaria_em_utc e fuso_horario à ocorrência; recusado_em e recusa_desfeita_em ao atendimento; cria conversa com UUID, participantes, foreign keys e unicidade por ocorrência/participantes. O backfill insere vínculos na nova tabela sem alterar mensagens anteriores.

As ocorrências legadas 3 e 12 têm dois responsáveis aceitos. Seus vínculos foram preservados; não é permitido novo aceite nessas ocorrências. Não foram executados DROP, TRUNCATE ou exclusões. Os testes compararam cada registro preexistente de usuario, ocorrencia, atendimento e mensagem antes/depois e confirmaram preservação.

## Contratos
- POST /ocorrencias: campos anteriores + descricao_publica (1–500), modalidade_horario (agora/agendado), fuso_horario IANA e necessaria_em (ISO UTC para agendado). Data futura e calendário real são validados. Agora usa relógio do servidor.
- GET /ocorrencias: escopos mapa, meus, disponiveis, recusados, assumidos. O servidor determina a identidade, voluntariado e elegibilidade. DTO inclui horários, resumo, recusa e ações permitidas.
- POST /ocorrencias/:id/aceitar: transação com bloqueio da ocorrência, revalidação, criação do atendimento e status em_atendimento. Repetição do responsável é idempotente; concorrente recebe 409.
- POST /ocorrencias/:id/recusar: recusa individual persistente, sem cancelamento global; repetição não duplica registro.
- POST /ocorrencias/:id/desfazer-recusa: reversão registrada, somente enquanto disponível.
- POST /ocorrencias/:id/conversas: abre/reutiliza UUID. Recusados, usuários comuns e autores não iniciam contato consigo mesmos.
- GET /conversas e GET /conversas/:id/mensagens: conversas e histórico paginado com DTO por destinatário.
- O endpoint antigo de histórico continua protegido pela mesma autorização e projeção. Novas versões mobile usam exclusivamente UUID.
- WebSocket /ws/chat: autenticar por evento auth com JWT; chat_message envia id_conversa, request_id e text. Identidades e destinatário são resolvidos no servidor; id_remetente, id_destinatario e id_ocorrencia enviados no novo protocolo são rejeitados. Atualize/recarregue o aplicativo junto com a API.

## Uso
Voluntários encontram oportunidades no mapa, com atualização a cada 15 segundos em primeiro plano e em telas focadas. Não há push em segundo plano. Detalhes, listas e chat atualizam seus estados; o chat entrega mensagens ao vivo por WebSocket.

Em detalhes: Aceitar pedido, Recusar e Enviar mensagem são exibidos conforme a autorização. A Home também permite abrir Meus atendimentos e Recusados; a reversão fica nos detalhes de um chamado recusado ainda disponível. Meus pedidos e histórico, Solicitar ajuda, SOS e o header compacto continuam disponíveis. Favoritos não foi reintroduzido.

Antes do aceite, solicitante aparece como Anônimo para o voluntário. Nome real e IDs globais não integram o DTO do interlocutor anônimo. Mensagens retornam `minha` em vez de IDs de remetente/destinatário. Descrição privada, referência e coordenada exata continuam restritas. Depois do aceite, o responsável tem acesso aos dados autorizados. Chats de outros interessados passam a somente leitura, conservando anonimato. Conta bloqueada perde acesso; perda de voluntariado e cancelamento bloqueiam escrita. Texto digitado pelo próprio usuário não é automaticamente anonimizado: o formulário orienta a não incluir dados pessoais no resumo público.

Abertura de conversa: 10 tentativas/minuto por usuário e 20 novas conversas/hora. WebSocket: 30 eventos/10 segundos, limite de tamanho e fila. Janelas em memória são reiniciadas com o servidor; o limite de novas conversas consulta os registros persistidos.

Distância: Haversine usando o GPS disponível e a posição fornecida pela API. Antes do aceite, grade de 0,01 grau e estimativa em quilômetros; sem GPS, Distância indisponível. Após aceite, permite metros/quilômetros com posição autorizada. Não usa API paga.

Calendário e hora/minuto usam componentes existentes. Horários novos são armazenados em UTC explícito e retornados com Z; exibidos no fuso local do aparelho. criada_em não foi substituída nem reinterpretada. Pedidos antigos exibem horário não informado; agendados vencidos são identificados sem cancelamento automático.

## Arquivos desta etapa
Backend:
- src/services/atendimentoService.js (novo)
- src/services/ocorrenciaService.js
- src/services/chatService.js
- src/routes/ocorrenciaRoutes.js
- src/routes/chatRoutes.js
- src/websocket/chatServer.js
- tests/atendimento-integration.js (novo)
- tests/chat-unit.test.js
- tests/ocorrencias.test.js
Mobile:
- src/components/SchedulePicker.js (novo)
- src/hooks/usePollingRefresh.js (novo)
- src/hooks/useChat.js
- src/screens/HomeScreen.js
- src/screens/PedidosScreen.js
- src/screens/ChatScreens.js
- tests/chat.test.cjs
- tests/frontend-smoke.cjs
Outros: database/atendimento-chat.sql e este documento. Alterações anteriores no git status pertencem às etapas anteriores e foram preservadas.

## Resultados
- Backend: 7 testes aprovados.
- Frontend: smoke de 18 rotas e 6 testes aprovados; sintaxe validada.
- Integração real: criação imediata/agendada, rejeição do passado, resumo separado, recusa/reversão/idempotência, isolamento, anonimato REST e WebSocket, entrega bidirecional, único aceite em corrida, preservação de histórico, perda de voluntariado, bloqueio e cancelamento aprovados.
- Pedro (id10) testado explicitamente: somente seus pedidos e 404 para terceiros.
- Expo Doctor: 20/20.
- Bundles Android e iOS exportados em mobile/dist/atendimento-final.
- API reiniciada a partir da pasta correta; porta 3000 validada pelo IP do mobile, com Pedro e quatro contas de teste.
- Duas rodadas de integração criaram usuários 24–31 e pedidos 22–25, todos identificados como teste, sem excluir nada. Credenciais da última rodada estão em backend/.atendimento-test.local.json, ignorado pelo Git. Não publique esse arquivo.
- Suites históricas de integração que usam o protocolo antigo não foram executadas nesta etapa; a integração atual é atendimento-integration.js.

## Comandos (Git Bash)
A API foi deixada ativa na porta 3000, PID observado 19312. NÃO inicie uma segunda cópia com npm start enquanto ela estiver ativa (EADDRINUSE). Quando o servidor estiver parado, inicie no terminal:

    cd /c/Users/Usuario/Desktop/HelpUsTeste/backend
    npm start

Mobile:

    cd /c/Users/Usuario/Desktop/HelpUsTeste/mobile
    source ./scripts/use-node.sh
    npx expo start --clear

Testes:

    cd /c/Users/Usuario/Desktop/HelpUsTeste/backend
    npm test
    node tests/atendimento-integration.js --allow-test-data

O último comando grava NOVAS contas/pedidos de teste em cada execução e os preserva.

    cd /c/Users/Usuario/Desktop/HelpUsTeste/mobile
    source ./scripts/use-node.sh
    npm test
    npm run check:syntax
    npx expo-doctor
    npx expo export --platform all --output-dir dist/atendimento-final

## Roteiro físico pendente — Samsung e iPhone
1. Recarregar o app atualizado e entrar como solicitante comum. Criar um pedido com resumo público, descrição privada e Agora; criar outro Agendado e conferir data/hora.
2. Em outro aparelho, entrar com voluntário. Conferir atualização em até 15 segundos, mapa, horário e distância aproximada; testar GPS negado.
3. Abrir Enviar mensagem antes do aceite. Conferir Anônimo no cabeçalho, lista e mensagens. Responder pela conta solicitante.
4. Usar segundo voluntário para abrir outro chat; aceitar com um deles e verificar o outro chat somente leitura. Conferir endereço/posição liberados apenas ao responsável.
5. Em outro pedido, recusar, abrir Recusados, desfazer e verificar retorno às oportunidades.
6. Alternar contas e conferir que usuário comum não herda marcadores/chat de outro usuário.
7. Conferir teclado, calendário, fonte ampliada, áreas seguras, botão voltar, header, GPS real e legibilidade no Samsung e iPhone. Compilação/testes automatizados não substituem essa validação física.

## SQL de conferência (somente leitura)
    SELECT id_ocorrencia,id_solicitante,status,modalidade_horario,necessaria_em_utc,fuso_horario,criada_em FROM ocorrencia WHERE id_ocorrencia IN (22,23,24,25);
    SELECT id_atendimento,id_ocorrencia,id_voluntario,status,aceito_em,recusado_em,recusa_desfeita_em FROM atendimento WHERE id_ocorrencia IN (22,23,24,25);
    SELECT id_conversa,id_ocorrencia,id_solicitante,id_voluntario FROM conversa WHERE id_ocorrencia IN (22,23,24,25);
    SELECT id_mensagem,id_ocorrencia,enviada_em FROM mensagem WHERE id_ocorrencia IN (22,23,24,25);
