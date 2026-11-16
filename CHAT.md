# Chat real do Help Us

Atualização posterior: criação real de pedidos e marcadores no mapa implementados; veja [OCORRENCIAS.md](OCORRENCIAS.md). O chat permanece com as mesmas regras de atendimento aceito. Referências a SOS demonstrativo abaixo descrevem a etapa original do chat.

Implementado em `C:\Users\Usuario\Desktop\HelpUsTeste`, preservando as telas existentes. O projeto continua no Expo SDK 54. Não foi usado Socket.IO.

## Arquitetura e permissões

REST e WebSocket compartilham o mesmo `http.Server`, porta 3000 por padrão. Axios continua responsável por login, cadastro, perfil e histórico. O WebSocket nativo do React Native envia mensagens; `ws` recebe no Node. A mensagem é validada e persistida em transação MySQL antes do `chat_ack`. Somente conexões autenticadas dos dois participantes recebem o evento, nunca todos os clientes.

Cada conversa é identificada pela ocorrência e pelo par solicitante/voluntário. O atendimento mais recente desse voluntário na ocorrência define o vínculo. `aceito` permite escrever; `finalizado` mantém somente histórico. Ocorrências `finalizada` ou `cancelada` também ficam somente leitura. Atendimento `recusado`, ausência de vínculo, usuário inexistente ou bloqueado impedem acesso. Outro voluntário na mesma ocorrência tem sua própria conversa com o solicitante, sem acesso ao histórico dos demais.

`eh_voluntario` é independente de `tipo_usuario`: uma pessoa pode solicitar ajuda e atuar como voluntária em outra ocorrência. O cadastro continua recebendo esse booleano; novos usuários são cadastrados com `tipo_usuario='solicitante'`. O chat usa os vínculos reais de ocorrência/atendimento para autorização, sem tornar os papéis exclusivos.

## Banco e migração já executada

- Banco utilizado: **help_us2**, que já existia. Nenhum outro banco foi criado.
- `mensagem` já tinha todos os seis campos necessários e foreign keys. Não foi alterada.
- Adicionada a `usuario`: `eh_voluntario TINYINT(1) NOT NULL DEFAULT 0`; os voluntários existentes receberam 1.
- Copiadas as seis contas de `help_us.usuario`, preservando todos os hashes de senha, sem substituir as quatro contas existentes no destino e sem reaproveitar IDs antigos.
- As nove tabelas e os relacionamentos existentes foram preservados. Não foram usados DROP, TRUNCATE ou exclusões de teste.
- `backend/.env` passou a usar `DB_NAME=help_us2`. O segredo JWT foi renovado para invalidar tokens do banco anterior, cujos IDs poderiam apontar para outras contas. É necessário fazer novo login.
- Script executado: `backend/scripts/migrate-chat.js --apply`. SQL equivalente: `database/chat-help-us2.sql`. **Não execute novamente o ALTER manual: ele já foi aplicado.** O script Node verifica se a coluna existe e não recopia e-mails existentes.
- Após os testes: 14 usuários (4 anteriores + 6 copiados + 4 de teste) e 6 mensagens (2 anteriores + 4 de teste). As seis contas de origem continuam intactas; os seis hashes copiados foram conferidos por comparação, sem exibição.

A exclusão de conta existente continua real e usa as cascatas já presentes no banco. A confirmação no Perfil avisa sobre dados vinculados. Não excluímos contas durante a validação.

## Iniciar no computador e abrir no celular

Terminal 1, Git Bash:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/backend"
npm start
```

Se já houver uma API antiga nessa porta, encerre-a com Ctrl+C no terminal dela e inicie esta cópia. Mantenha MySQL em execução.

Terminal 2, Git Bash:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/mobile"
npx expo start --clear
```

Abra Expo Go compatível com SDK 54 e leia o QR code deste terminal. Use a mesma rede Wi-Fi do computador. Faça novo login; Login leva à Home. Toque no balão da barra inferior para abrir Conversas e escolha o participante/pedido. Os usuários sem atendimento aceito verão a lista vazia corretamente. O botão de aceite do protótipo ainda é demonstrativo e não cria atendimento real.

Configuração privada de `backend/.env`:

```dotenv
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=help_us2
JWT_SECRET=segredo_privado_do_servidor
```

Preserve os valores de credenciais já configurados. Nunca copie o segredo JWT para o aplicativo. Em `mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://IP_WIFI_DO_PC:3000
```

Na conferência desta implementação, o IPv4 Wi-Fi era `192.168.1.10`, correspondente à configuração do aplicativo. Se a rede mudar, atualize somente esse endereço e reinicie o Expo. Não use localhost no celular. O WebSocket é derivado automaticamente: `http://IP:3000` → `ws://IP:3000/ws/chat`; HTTPS → WSS. Não precisa de `EXPO_PUBLIC_WS_URL`. O telefone precisa alcançar a porta da API, além da porta do Metro.

## Testar com dois usuários

As quatro contas criadas pelo teste estão em `backend/.chat-test.local.json`. Abra esse arquivo local no VS Code para consultar os e-mails e a senha comum aleatória. Ele é ignorado pelo Git, assim como os `.env`.

1. Inicie API e Expo conforme acima.
2. No celular A, entre como **Teste Chat A** (id 12). No celular B ou emulador/cliente separado, entre como **Teste Chat B** (id 13), com as credenciais desse arquivo.
3. Em ambos, abra Conversas e escolha o outro participante na ocorrência **3**. A é solicitante e B é voluntário com atendimento aceito.
4. A envia uma mensagem; B deve recebê-la sem atualizar. B responde; A recebe. O campo só limpa depois de confirmar a gravação.
5. Volte e reabra: o histórico deve continuar. Desligue a rede durante um envio: não deve travar nem apagar o rascunho. Restabeleça a rede e toque em Tentar novamente. Confira o histórico antes de reenviar um texto cujo envio ficou sem confirmação.
6. A também é voluntário na ocorrência **4**, solicitada por B. Teste essa conversa para conferir os dois papéis na mesma conta.
7. A e B têm as ocorrências **5** (finalizada) e **6** (cancelada): somente leitura. A ocorrência **7**, com atendimento recusado, não aparece.
8. Teste Chat C (id 14) é outro voluntário na ocorrência 3: só pode falar com A em conversa separada. Não deve receber mensagens entre A/B. Teste Chat D (id 15) não tem vínculo e não deve ver essas conversas.

Os IDs acima correspondem à execução inicial. Se rodar novamente o teste de integração, novos registros serão criados e o arquivo local será atualizado. Os anteriores não são apagados.

Consulta de conferência no Workbench:

```sql
SELECT id_mensagem, id_ocorrencia, id_remetente, id_destinatario, texto, enviada_em
FROM help_us2.mensagem
WHERE id_ocorrencia IN (3, 4)
ORDER BY enviada_em, id_mensagem;
```

## Rotas HTTP

Todas requerem `Authorization: Bearer JWT`, pelo interceptor Axios existente.

| Método e rota | Resultado |
| --- | --- |
| `GET /conversas` | `{ conversas: [...] }`, participantes e última mensagem de cada vínculo autorizado |
| `GET /mensagens/ocorrencia/:id_ocorrencia?id_interlocutor=ID` | `{ conversa, mensagens, proximo_cursor }` |
| Mesmo histórico com `limite=50&antes_de=ID` | Página anterior; limite padrão 50, máximo 100 |

`conversa` contém `id_ocorrencia`, `titulo`, `interlocutor: {id_usuario,nome}` e `somente_leitura`. Mensagens têm os seis campos persistidos, com horário ISO na resposta. São ordenadas cronologicamente, com ID como desempate. Nenhuma resposta de chat contém hash de senha.

## Protocolo WebSocket

Endpoint: `/ws/chat`, na mesma porta da API. A abertura não usa header customizado nem token na URL. Imediatamente após `onopen`, o cliente envia:

```json
{"type":"auth","token":"JWT"}
```

O servidor verifica assinatura HS256, expiração e existência/status do usuário, associa a conexão ao `id_usuario` do JWT e responde:

```json
{"type":"auth_ok","id_usuario":12}
```

Sem autenticar em 10 segundos, com token inválido/expirado ou ao tentar enviar antes do auth_ok, a conexão é encerrada com código 4401. Não é permitido trocar identidade na conexão. A expiração do token também encerra uma conexão já aberta.

Envio autenticado:

```json
{"type":"chat_message","request_id":"envio-1","id_ocorrencia":3,"id_destinatario":13,"text":"Olá! Posso ajudar?"}
```

`id_remetente` informado pelo cliente é rejeitado. O horário vem do servidor. Texto deve ser string, ter 1–1.000 caracteres após trim, IDs inteiros positivos e request_id de 1–80 letras, números, hífen ou sublinhado.

Após COMMIT, o remetente recebe:

```json
{"type":"chat_ack","request_id":"envio-1","mensagem":{"id_mensagem":7,"id_ocorrencia":3,"id_remetente":12,"id_destinatario":13,"texto":"Olá! Posso ajudar?","enviada_em":"2026-11-06T03:00:00.000Z"}}
```

Exemplo ilustrativo: ID e horário reais são gerados no servidor. O destinatário e as outras conexões do remetente recebem `{ "type":"chat_message", "mensagem":{...} }`. Falhas retornam `{ "type":"chat_error", "request_id":"...", "codigo":"...", "mensagem":"..." }`. Falha de autenticação usa `auth_error` e fecha a conexão. Erro de banco não produz confirmação de sucesso.

Há limite de payload (16 KiB), fila de 20 eventos por conexão, 30 eventos por usuário/10s, 30 aberturas por IP/10s e heartbeat. Repetir o mesmo request_id e conteúdo na mesma conexão retorna o ack salvo em memória (últimos 100), sem reinserir. Reutilizar o ID com outro conteúdo é rejeitado.

## Ciclo de vida e limites

- O cliente conecta ao focar a conversa e autentica com o JWT do AsyncStorage; carrega o histórico por REST. Fecha ao sair da tela ou ir para segundo plano; ao voltar, autentica novamente e carrega as últimas 50 mensagens. “Carregar anteriores” pagina o restante.
- Eventos recebidos durante a consulta são mesclados por ID, sem duplicar nem deixar lacunas entre páginas. Queda de rede mostra estado e botão Tentar novamente; não há reenvio automático.
- Sem ack em 15 segundos, o texto é preservado e o usuário é orientado a conferir o histórico. Não há garantia de deduplicação entre conexões ou após reiniciar o servidor; a persistência das mensagens permanece no MySQL.
- WebSocket não faz push com o aplicativo fechado. Só fica ativo no chat em primeiro plano; a lista consulta dados ao ganhar foco.
- SOS, avisos, favoritos e aceite visual de ocorrências continuam demonstrativos. Não foram criadas APIs de gestão de ocorrências/atendimentos.
- Sem áudio, arquivos, imagens, chamadas, indicadores de digitação, leitura ou criptografia ponta a ponta. Para publicação, servir por HTTPS/WSS; HTTP/WS local é usado no teste pela rede doméstica.
- Registro de conexões e limites em memória atendem uma instância Node. Escala entre vários processos não está nesta etapa.

## Arquivos e dependências desta etapa

Instalada somente **ws ^8.22.1 no backend**. Nenhuma dependência nova no mobile. Expo Doctor foi executado via npx, sem adicionar dependência ao projeto.

Criados:

- `backend/src/services/chatService.js`
- `backend/src/controllers/chatController.js`
- `backend/src/routes/chatRoutes.js`
- `backend/src/websocket/chatServer.js`
- `backend/scripts/migrate-chat.js`
- `backend/tests/chat-unit.test.js`
- `backend/tests/chat-integration.js`
- `database/chat-help-us2.sql`
- `mobile/src/services/chatProtocol.js`
- `mobile/src/hooks/useChat.js`
- `mobile/tests/chat.test.cjs`
- `CHAT.md` e arquivo privado `backend/.chat-test.local.json` (dados de teste).

Alterados:

- `.gitignore`, `README.md`
- `backend/package.json`, `backend/package-lock.json`, `backend/server.js`, `backend/src/app.js`
- `backend/src/services/usuarioService.js`, `backend/.env`, `backend/.env.example`
- `mobile/src/screens/ChatScreens.js`, `mobile/src/screens/CommunityScreens.js`, `mobile/src/screens/PerfilScreen.js`
- `mobile/src/components/UI.js`, `mobile/src/context/DemoContext.js`
- `mobile/tests/frontend-smoke.cjs`, `mobile/FRONTEND.md`.

Outras alterações de front-end já estavam na cópia de trabalho antes desta etapa e foram preservadas. A Home/mapa, serviços Axios/AsyncStorage e demais telas de autenticação não foram redesenhados pelo chat.

## Validações realizadas

```bash
# backend
npm test
npm run test:integration
# mobile
node --test tests/chat.test.cjs
node tests/frontend-smoke.cjs
npx expo-doctor
npx expo export --platform android --output-dir dist/chat-validated
```

Sintaxe Node validada em server, src, scripts e testes. Testes unitários do servidor passaram. Integração real HTTP + WebSocket + MySQL passou com quatro contas, gravações conferidas na tabela mensagem (IDs 3–6), privacidade entre pares, tokens inválidos/expirados, texto/JSON inválidos, falsificação de remetente, paginação e histórico ao reabrir. Cadastro, login, perfil, listagem e troca de senha foram exercitados pela API real. Falha de persistência e timeout de autenticação foram exercitados com servidor WebSocket e serviço de banco simulado.

Quatro testes de protocolo/hook passaram (incluindo queda, ack, paginação, foco/segundo plano e sessão expirada). O smoke test com serviços simulados passou para 17 rotas, navegação, Login → Home, cadastro, perfil, troca de senha, lista, exclusão com confirmação, logout e GPS permitido/negado/com erro. Exclusão real não foi executada.

Expo Doctor: **18/18**. Bundle Android: **948 módulos**, exportado em `mobile/dist/chat-validated`. A validação foi feita com clientes WebSocket reais no computador e componentes nativos simulados nos testes do hook; o teste visual e o teste simultâneo em dois celulares/Expo Go ainda devem ser feitos seguindo o roteiro acima. Não foi alegado teste físico do GPS nesta etapa.
