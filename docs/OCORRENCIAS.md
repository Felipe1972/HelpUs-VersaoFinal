# Pedidos reais de ajuda

## Revisão: mapa, referência e localização

O fluxo atual é **Home → Solicitar ajuda → formulário → Pedido criado → Voltar ao mapa**. SOS é uma rota informativa separada e não cria pedidos. As referências abaixo ao fluxo antigo via SOS descrevem a primeira versão.

- Adicionada em `help_us2.ocorrencia` a coluna opcional `endereco_referencia VARCHAR(255) NULL`, após conferir o esquema e informar o SQL. Registros anteriores permanecem intactos. O SQL está em `database/ocorrencia-referencia.sql`; a alteração já foi aplicada, não é necessário executá-la novamente.
- POST aceita `endereco_referencia` opcional, com trim, até 255 caracteres; texto vazio vira NULL. GET e detalhes retornam o campo. Referência aparece antes das coordenadas, que continuam obrigatórias na criação.
- O pedido 9 foi encontrado salvo, aberto e com coordenadas válidas. A listagem já filtrava corretamente os status e a Home já consultava ao ganhar foco. Foram corrigidos riscos visuais: o pin azul podia cobrir o pedido no mesmo ponto e não havia centralização após criar.
- Após sucesso, um sinal contendo somente o ID solicita atualização. Ao voltar, a Home executa GET e centraliza nas coordenadas do registro retornado. Não injeta marcadores a partir do POST. O usuário aparece como ponto azul; pedidos têm pins com prioridade visual maior. O card só aparece após tocar em um marcador e identifica “Pedido selecionado”.
- Cores: verde baixa, laranja média, vermelho alta; azul usuário. Legenda na Home e texto de urgência nos marcadores/detalhes. Formulário usa escolhas compactas com área mínima de 48 pontos, quebra de linha, borda e check na seleção; a urgência selecionada tem explicação.
- GPS verifica permissão e serviço de localização. Cada nova tentativa chama o GPS novamente; resultados de tentativas antigas não substituem a tentativa atual. Após demora de 20 segundos ou falha, pode usar uma última posição conhecida somente se tiver até 2 minutos e precisão conhecida de até 100 m. A interface identifica esse fallback e pede conferir se ainda está no local; se envelhecer antes do envio, exige nova tentativa. Nenhuma coordenada fictícia é usada.
- Sucesso: “Pedido criado com sucesso. Seu pedido foi salvo e está disponível no mapa para outros usuários.”

Validação desta revisão: criação real do pedido **10** com referência textual, conferida no MySQL; testes backend/chat, formulário, refresh/centralização pelo GET, separação SOS, GPS/fallback e navegação aprovados. Expo Doctor **18/18**. Testes de mapa e GPS usam componentes/serviços simulados; aparência dos pins sobrepostos e GPS no aparelho devem ser conferidos no Expo Go.

Novos arquivos: `mobile/src/services/pedidoLocation.js`, `mobile/src/services/pedidoRefresh.js`, `mobile/tests/pedido-location.test.cjs`, `database/ocorrencia-referencia.sql`. Alterados: serviço e testes de ocorrências do backend, Home, PedidosScreen, CommunityScreens, AppNavigator e smoke test do mobile. Nenhuma dependência instalada; SDK 54 mantido.

Para testar: reinicie backend e Expo, faça login, toque **Solicitar ajuda**, preencha referência e crie. Volte ao mapa: deve centralizar no pedido retornado pela API. Toque no pin para abrir o card e os detalhes. Teste também **Obter localização novamente**, GPS desligado/negado e o SOS separado. No Workbench:

```sql
SELECT id_ocorrencia, id_solicitante, status, latitude, longitude, endereco_referencia
FROM help_us2.ocorrencia ORDER BY id_ocorrencia DESC;
```

Teste específico de GPS: `node --test tests/pedido-location.test.cjs` na pasta mobile. Bundle da revisão: `mobile/dist/pedidos-revisados`.

Implementação no projeto `C:\Users\Usuario\Desktop\HelpUsTeste`. Expo SDK 54 e dependências existentes foram preservados; nenhum pacote foi instalado. Não houve migração, exclusão ou mudança de tipos no MySQL.

## Banco e API

Banco: `help_us2`. Tipos consultados em `tipo_ocorrencia`: 1 Queda, 2 Esforço físico, 3 Medicamento, 4 Aviso da região, 5 Outro. O aplicativo carrega esses registros pela API.

ENUM de urgência: `baixa`, `media`, `alta`. ENUM de status: `aberta`, `em_atendimento`, `finalizada`, `cancelada`.

As quatro rotas requerem `Authorization: Bearer JWT` e usuário existente, não bloqueado:

| Rota | Resposta |
| --- | --- |
| GET /tipos-ocorrencia | `{ tipos: [{id_tipo,nome,descricao}], urgencias: [...] }` |
| POST /ocorrencias | HTTP 201, `{ ocorrencia: {...} }` |
| GET /ocorrencias | `{ ocorrencias: [...] }`, ativas com coordenadas válidas, mais recentes primeiro |
| GET /ocorrencias/:id | `{ ocorrencia: {...} }`, ou 404 |

POST aceita somente `id_tipo`, `descricao`, `nivel_urgencia`, `latitude` e `longitude`. IDs devem ser inteiros positivos, descrição obrigatória com trim e até 2.000 caracteres, coordenadas números finitos nos limites latitude ±90 e longitude ±180. Campos adicionais são rejeitados.

O servidor obtém `id_solicitante` do JWT, gera `titulo` como `Pedido de ajuda: [nome do tipo]`, define `status='aberta'` e deixa o MySQL gerar `id_ocorrencia`, `criada_em` e `atualizada_em`. Usa SQL parametrizado. A resposta inclui os campos da ocorrência e `nome_tipo`; DECIMAL é convertido em número para o mapa.

## Funcionamento no aplicativo

Home → SOS abre o formulário real. Seleção de tipo é obrigatória; urgência começa em Média. A localização é solicitada em primeiro plano com `expo-location`, utilizando `getCurrentPositionAsync` com precisão Balanced. Há limite de espera de 20 segundos para obter a posição e opção de repetir. Falha ou permissão negada bloqueiam envio; a região padrão da Home nunca é usada como localização do pedido.

O botão de envio fica bloqueado durante o POST e há proteção contra cliques duplicados. Em falha, os campos permanecem. Em timeout/ausência de resposta, confira o mapa antes de reenviar: a API pode ter gravado o pedido. Não existe reenvio automático ou chave de idempotência nesta etapa.

Após sucesso, o usuário pode abrir detalhes ou voltar ao mapa. A Home consulta ocorrências sempre que ganha foco e oferece Atualizar pedidos. Mantém o marcador e a localização do próprio usuário. Marcadores mostram tipo/urgência; ao tocar, aparece um resumo com Ver detalhes. A consulta não altera a região que o usuário está explorando.

Detalhes recebem `id_ocorrencia` e consultam dados atuais pela API. Não incluem aceitar/recusar ou abrir chat. O chat continua dependendo de atendimento aceito e não é liberado pela criação. Demonstrações de avisos/favoritos continuam identificadas e separadas dos pedidos reais.

## Testar no Expo Go

No primeiro terminal Git Bash, reinicie a API para carregar as novas rotas:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/backend"
npm start
```

No segundo terminal:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/mobile"
npx expo start --clear
```

Mantenha o MySQL ligado e use Expo Go compatível com SDK 54, na mesma rede do computador. `backend/.env` deve continuar com `DB_NAME=help_us2`; `mobile/.env` usa `EXPO_PUBLIC_API_URL=http://IP_WIFI_DO_PC:3000`. Não foi criada nova variável de ambiente.

1. Faça login e toque em SOS na Home.
2. Escolha um tipo, urgência e descrição; conceda localização e aguarde a confirmação.
3. Toque Criar pedido de ajuda. Deve aparecer Pedido criado.
4. Volte ao mapa. O pedido será mostrado na posição capturada. Se coincidir com o marcador do usuário, aumente o zoom e selecione o marcador da ocorrência.
5. Toque no marcador e em Ver detalhes; confira título, descrição, urgência e status.
6. Volte à Home e toque Atualizar pedidos. Também é possível conferir com outra conta autenticada.
7. Negue Localização nas configurações Android do Expo Go e abra um novo formulário. O envio deve ficar bloqueado com explicação. Conceda novamente e use Obter localização novamente.
8. Teste falha de rede: o mapa continua visível, a consulta oferece nova tentativa e o formulário preserva o texto. Em envio sem confirmação, consulte o mapa antes de repetir.
9. Confira login, cadastro, perfil, troca de senha e chat. Não é necessário excluir contas reais para validar esta etapa.

Sem push, filtro por distância, atendimento ou garantia de ajuda imediata. O registro é compartilhado no mapa com usuários autenticados; não envia notificação a pessoas ou serviços de emergência.

## Conferência no MySQL

O teste integrado criou a ocorrência **8**, solicitante **12**, tipo **1**, status **aberta**, latitude **-29.99912345** e longitude **-51.00123456**. Ela foi mantida no banco, identificada na descrição como teste.

```sql
SELECT o.id_ocorrencia, o.id_solicitante, o.id_tipo, t.nome,
       o.titulo, o.descricao, o.nivel_urgencia, o.status,
       o.latitude, o.longitude, o.criada_em
FROM help_us2.ocorrencia o
JOIN help_us2.tipo_ocorrencia t ON t.id_tipo = o.id_tipo
ORDER BY o.id_ocorrencia DESC;
```

## Validação e arquivos

Validados: sintaxe Node, testes de entrada, integração HTTP/MySQL real de criação/leitura, conferência de campos no banco, login/perfil/conversas pela API, regressões unitárias WebSocket e protocolo/hook do chat. O caso de usuário bloqueado na integração foi simulado no serviço para não alterar contas existentes.

O smoke test do aplicativo usa API e serviços nativos simulados. Cobre tipos carregados, localização concedida/negada/com falha, prevenção de envio duplicado, formulário preservado em erro, navegação após sucesso e Marker → detalhes, mantendo o marcador do usuário; inclui regressões de cadastro, login, perfil, senha, lista, exclusão com confirmação e logout. A verificação visual e de GPS em aparelho físico deve seguir o roteiro acima.

Comandos:

```bash
# backend: integração insere um pedido identificado e não o apaga
npm test
npm run test:ocorrencias
# mobile
node tests/frontend-smoke.cjs
node --test tests/chat.test.cjs
npx expo-doctor
npx expo export --platform android --output-dir dist/ocorrencias-validated
```

Criados: `backend/src/services/ocorrenciaService.js`, `backend/src/controllers/ocorrenciaController.js`, `backend/src/routes/ocorrenciaRoutes.js`, `backend/tests/ocorrencias.test.js`, `backend/tests/ocorrencias-integration.js`, `mobile/src/screens/PedidosScreen.js` e este documento.

Alterados: `backend/src/app.js`, `backend/package.json`, `mobile/src/navigation/AppNavigator.js`, `mobile/src/screens/HomeScreen.js`, `mobile/src/screens/CommunityScreens.js`, `mobile/tests/frontend-smoke.cjs`, `README.md`, `mobile/FRONTEND.md` e `CHAT.md` (referências de documentação).
