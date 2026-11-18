# Perfis, permissões e privacidade — Help Us

Implementado em 16/11/2026 no projeto `C:\Users\Usuario\Desktop\HelpUsTeste`.
Expo SDK 58 e dependências preservados. Sem push, migração SQL ou exclusão de registros.
As alterações locais da migração SDK 58 anterior continuam presentes; não foram descartadas.

## Diagnóstico anterior

- `usuario.eh_voluntario` já era TINYINT(1), NOT NULL, DEFAULT 0.
- Cadastro aceita booleano e grava esse campo; login e perfil o retornam como booleano. Uma conta voluntária continua sendo solicitante também.
- JWT identifica o usuário; o perfil de voluntário não deve ser autorizado por claims ou AsyncStorage.
- Ocorrências só verificavam usuário existente/não bloqueado: todos os autenticados podiam consultar pedidos alheios, coordenadas exatas e endereço/referência.
- `/usuarios` entregava e-mail, telefone e status de verificação de todas as contas.
- Chat já exigia vínculo de atendimento aceito/finalizado, com restrição de participantes e histórico de conversas encerradas. Não havia, na inspeção, vínculo aceito/finalizado com usuário não voluntário nem com o próprio solicitante.

## Regras implementadas

O controller consulta `id_usuario`, `eh_voluntario` e `status_verificacao` no MySQL a cada requisição de ocorrências. Usuário ausente/bloqueado recebe 403. O banco é a fonte de autorização, mesmo com JWT antigo ou campos adulterados pelo cliente.

| Recurso | Usuário comum | Voluntário |
| --- | --- | --- |
| Criar pedido | Sim, em seu nome | Sim, em seu nome |
| Mapa | Somente seus pedidos ativos com coordenadas | Pedidos próprios e de terceiros ativos com coordenadas |
| Meus pedidos | Todos os próprios, inclusive encerrados/sem localização | Igual |
| Detalhes próprios | Completos | Completos |
| Detalhes alheios ativos | 404, sem conteúdo | Dados públicos, salvo vínculo autorizado |
| Filtro comunidade | 403 | Ativos de terceiros, excluindo os próprios |
| Lista de usuários | ID, nome e indicação de voluntário | Igual |
| Aceitar/recusar | Não implementado | Não implementado; guarda preparada para impedir aceite próprio |

Participantes voluntários com vínculo aceito/finalizado anterior podem consultar detalhes públicos de pedidos encerrados, preservando contexto de histórico. Isso não libera dados privados após o encerramento. O chat continua usando suas regras próprias de vínculo, sem alteração do protocolo ou histórico.

### Privacidade

- Antes do aceite, coordenadas alheias são arredondadas em uma grade fixa de 0,01 grau, cerca de 1 km; a distância real varia com latitude. Não é geolocalização exata, anonimização garantida nem cálculo de distância.
- O JSON público não contém posição original em outro campo, endereço/referência, ID do solicitante ou texto livre privado. O título público é gerado pelo tipo de ajuda.
- Descrição completa também fica restrita: registros antigos podem conter endereço/contato no texto livre. Não é possível assegurar privacidade apenas removendo o campo separado de endereço. A tela de criação explica essa regra.
- Proprietário recebe seus dados completos. Voluntário recebe endereço/referência, descrição e posição exata somente se o atendimento MAIS RECENTE dele naquele pedido estiver `aceito` e a ocorrência ainda estiver `aberta` ou `em_atendimento`.
- Finalização/cancelamento revoga essa liberação privada. Histórico de chat permanece conforme regras anteriores; conteúdo das mensagens não é apagado ou reescrito.
- Não é consultada a tabela `endereco` para divulgar endereço cadastral. A liberação refere-se ao endereço/referência do pedido.
- O dono ainda encontra seu e-mail/telefone no próprio perfil. A listagem pública não retorna contatos nem status de verificação, inclusive para administradores.

## Contratos HTTP e navegação

Mantidas as rotas, sem criar dois logins ou duplicar endpoints:

- `GET /ocorrencias`: `escopo=mapa` por padrão; ativos e coordenadas válidas, filtrados pelo perfil. Resposta mantém `ocorrencias` e acrescenta `perfil: { eh_voluntario }` obtido do banco.
- `GET /ocorrencias?escopo=meus`: todos os pedidos do usuário atual, independentemente de status/GPS. Essa é a base de **Meus pedidos e histórico**.
- `GET /ocorrencias?escopo=disponiveis`: somente voluntário; ativos de terceiros. Inclui pedidos em atendimento para consulta, mas eles não são elegíveis ao futuro aceite. Sem filtro por raio/distância nesta etapa.
- `GET /ocorrencias/:id`: aplica autorização e projeção privada/pública. Pedido inexistente ou de terceiro sem acesso responde 404. Filtro inválido responde 400.
- `POST /ocorrencias`: continua aceitando apenas os campos já definidos; solicitante vem do JWT, após consulta do usuário no banco. Retorna o pedido completo do próprio autor.
- `GET /tipos-ocorrencia`: preservado, com verificação do usuário ativo.
- `GET /usuarios`: somente `{id_usuario, nome, eh_voluntario}`; verifica usuário atual existente/não bloqueado.

DTO de ocorrência acrescenta `meu_pedido`, `localizacao_aproximada`, `endereco_disponivel`, `descricao_restrita` e `elegivel_para_aceite_futuro`. Descrição/endereço restritos são null. O ID do solicitante só é incluído na projeção privada. Campos internos de atendimento não são expostos.

A Home consulta novamente ao ganhar foco e limpa dados anteriores durante atualização/saída. Mostra **Meus pedidos e histórico**, mantém **Solicitar ajuda** e **SOS** separados e oferece o filtro de comunidade somente ao voluntário. Um pedido próprio nunca aparece nesse filtro. Localização aproximada é identificada no marcador/resumo e detalhes.
A nova rota `MeusPedidos` usa componentes existentes e permite abrir detalhes inclusive dos encerrados. Total: 19 rotas. Nenhum botão de aceite real foi criado; os antigos botões simulados ACEITAR/RECUSAR foram retirados do exemplo para evitar confusão.

## Preparação do atendimento futuro

`ocorrenciaPermissoes.js` centraliza consulta, privacidade e elegibilidade. `exigirElegibilidadeParaAtendimento` rejeita não voluntário, pedido próprio ou status diferente de aberta. Essa guarda NÃO é endpoint e não grava dados.
O futuro serviço de aceite deverá reler o usuário e bloquear a ocorrência em transação, aplicar a guarda, definir regras de concorrência, criar atendimento e mudar status. A consulta de detalhes já reconhece o vínculo aceito real e libera a referência apenas ao voluntário correspondente. O chat já usa esse vínculo.
Ainda faltam endpoints e telas para aceitar, recusar e finalizar, além das respectivas regras de concorrência. Não foram criados atendimentos fictícios nesta execução. Não foram implementados notificações, rotas ou filtros por distância.

## Arquivos desta etapa

Criados:

- `backend/src/services/ocorrenciaPermissoes.js`
- `backend/tests/permissoes.test.js`
- `backend/tests/permissoes-integration.js`
- `PERMISSOES.md`

Alterados:

- `backend/src/services/ocorrenciaService.js`
- `backend/src/controllers/ocorrenciaController.js`
- `backend/src/services/usuarioService.js`
- `backend/src/controllers/usuarioController.js`
- `backend/package.json` — somente comandos de teste; nenhuma dependência nova.
- `mobile/src/screens/HomeScreen.js`
- `mobile/src/screens/PedidosScreen.js` — formulário, detalhes e nova tela MeusPedidos.
- `mobile/src/screens/UsuariosScreen.js`
- `mobile/src/screens/CommunityScreens.js`
- `mobile/src/navigation/AppNavigator.js`
- `mobile/tests/frontend-smoke.cjs`

Arquivos locais ignorados: `backend/.permissoes-test.local.json` contém relatório e credenciais de teste. Não publicar.

## Testes executados

- Backend: 6 testes aprovados, incluindo auth WebSocket, validações de pedidos, autorização e projeção de privacidade.
- Integração real de permissões: aprovada. Comum/voluntário/terceiro, criação por ambos perfis, acesso direto proibido, filtro comunidade, histórico próprio encerrado/sem GPS, perfil alterado no banco com o MESMO JWT, claims/query adulterados, usuário bloqueado, lista sem contatos e autoria forjada.
- Chat real anterior: login das contas de teste existentes, histórico, auth WebSocket e rejeição de terceiro por leitura. Sem criar novo atendimento ou enviar mensagens a conversas anteriores.
- Testes de mobile: smoke das 19 rotas e 6 testes de chat/localização aprovados. Cobrem Home comum/voluntário, filtros e rótulos aproximados, pedidos próprios, detalhes protegidos, cadastro/login/perfil/senha/exclusão com confirmação/logout, formulário, erro/reconexão e GPS simulado.
- Sintaxe backend e 21 arquivos JS/JSX mobile: aprovada.
- `expo install --check`: aprovado; Expo Doctor: **20/20**.
- Bundle Android: **986 módulos**, aprovado.
- Bundle iOS: **991 módulos**, aprovado.
- Comparação de hashes dos registros preexistentes e do esquema, antes/depois da integração: **nenhuma diferença**.

Execução `1794831388638` criou somente:

| Registro | Identificação |
| --- | --- |
| Usuário 20 | Teste Permissoes Comum |
| Usuário 21 | Teste Permissoes Voluntario |
| Usuário 22 | Teste Permissoes Terceiro |
| Pedido 18 | Do comum 20, aberto |
| Pedido 19 | Do voluntário 21, aberto |
| Pedido 20 | Do terceiro 22, aberto |
| Pedido 21 | Do comum 20, finalizado e sem GPS, para testar histórico |

Os testes mudaram temporariamente apenas flags dos usuários novos 21/22, restauradas ao final. Não houve exclusão/limpeza de teste, mudança em dados anteriores, DDL, criação de atendimento ou mensagem. Os dados novos permanecem identificados. A confirmação de aceite/endereço utilizou um vínculo de teste anterior já existente, somente por leitura.

## Como testar no Expo Go

**Reinicie o backend** para carregar o novo código. No terminal que já o executa, Ctrl+C; depois:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/backend"
npm start
```

Em outro Git Bash:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/mobile"
source ./scripts/use-node.sh
npx expo start --clear
```

Use Expo Go SDK 58, mesma rede do computador e o QR novo. No iPhone, mantenha a mesma conta Expo do CLI caso o cliente solicite. Essa conta Expo é separada das contas Help Us abaixo.

1. Abra `backend/.permissoes-test.local.json` no editor. Copie o email da conta Comum e a senha local para o login do aplicativo. Não é necessário cadastrar novamente.
2. Na Home, confira somente seus marcadores. Abra **Meus pedidos e histórico**: devem aparecer o aberto 18 e o encerrado 21, com detalhes próprios completos. Não deve existir filtro de comunidade.
3. Faça logout e entre com a conta Voluntario. O mapa pode incluir pedidos próprios e alheios. Toque em **Mostrar somente pedidos da comunidade**: o pedido próprio 19 desaparece desse filtro, permanecendo em **Meus pedidos e histórico**.
4. Abra o pedido 18 como voluntário: localização aproximada, descrição e endereço protegidos, sem botões para aceitar/recusar. Os próprios detalhes do pedido 19 continuam completos.
5. Entre com Terceiro: somente o pedido 20 deve aparecer entre os dados novos; detalhes alheios são bloqueados também por chamada direta à API.
6. Em **Perfil → Ver usuários**, confira apenas nomes e indicação de voluntário. E-mail/telefone continuam visíveis no próprio perfil, não na lista.
7. Crie pedidos identificados de teste como comum e voluntário. Confira retorno ao mapa e detalhes, GPS concedido/negado, ausência de travamentos e separação do SOS.
8. As três novas contas não têm atendimento aceito e, portanto, não devem ganhar conversas automaticamente. Para testar o chat anterior, use as contas de `backend/.chat-test.local.json` e o vínculo já aceito que existe naquele conjunto.
9. Confira layout/rolagem/teclado no Samsung e no iPhone. A exportação e os testes simulados não substituem essa validação física, ainda pendente.

Comandos de validação:

```bash
# backend
npm test
npm run test:permissoes
# Atenção: test:permissoes cria um novo conjunto de contas/pedidos a cada execução.
# Requer MySQL help_us2 e o conjunto anterior .chat-test.local.json para regressão somente leitura.

# mobile, após source ./scripts/use-node.sh
npm test
npm run check:syntax
npx expo-doctor
npm run export:android
npm run export:ios
```

Nenhum push foi realizado nesta etapa.
