# Help Us — migração Expo SDK 58

Execução: 15/11/2026. Projeto: `C:\Users\Usuario\Desktop\HelpUsTeste`.
A cópia do OneDrive não foi alterada. Branch local: `codex/expo-sdk58`.
A migração ainda não foi publicada no GitHub; aguarda validação física do usuário.

## Backup confirmado antes da atualização

- Repositório: https://github.com/Felipe1972/Teste_HelpUs
- Commit: `345447c785abc31bac795175f511989a89540aeb`.
- Tag anotada: `backup-sdk54`, objeto `991798818f7119d13c661f4204e889bfdebc7708`.
- O commit da tag e a branch remota `main` foram conferidos com `git ls-remote`.
- Inclui backend, mobile, documentação e scripts SQL existentes, sem executá-los.
- Arquivos `.env`, credenciais `*.local.json`, node_modules e bundles ficaram fora do Git. A varredura dos arquivos candidatos e histórico não encontrou os segredos locais nem os padrões de tokens/chaves verificados. Essa varredura não equivale a uma auditoria completa de segurança.

## Ambiente e alterações

Node portátil: **22.23.5**, npm **10.9.9**. Local: `%LOCALAPPDATA%\HelpUsTools\node-v22.23.5-win-x64`.
O ZIP oficial foi conferido por SHA-256: `4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3`.
Node global **20.19.6** e npm global **10.8.2** permanecem inalterados; o backend continua nesse ambiente.

| Dependência | Referência anterior SDK 54 | Instalada ao final |
| --- | --- | --- |
| expo | ~54.0.37 | 58.0.25 |
| react | 19.1.0 | 19.3.0 |
| react-native | 0.81.5 | 0.88.1 |
| expo-font | ~14.0.12 | 58.0.12 |
| expo-location | ~19.0.8 | 58.0.22 |
| expo-status-bar | ~3.0.9 | 58.0.5 |
| react-native-maps | 1.20.1 | 1.29.11 |
| react-native-safe-area-context | ~5.6.0 | 5.11.1 |
| react-native-screens | ~4.16.0 | 4.30.1 |
| @expo/vector-icons | ^15.0.3 | 15.1.1 |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0, preservada |
| @react-navigation/native | ^7.3.4 | 7.5.2 |
| @react-navigation/native-stack | ^7.17.6 | 7.21.1 |
| axios | ^1.18.1 | 1.21.1 |

As ferramentas que os testes já utilizavam passaram a ser dependências de desenvolvimento explícitas: `@babel/core@7.29.7`, `@babel/plugin-transform-react-jsx@7.29.7`, `@babel/plugin-transform-modules-commonjs@7.29.14`.
As versões exatas transitivas estão no package-lock.json; preserve esse arquivo e use npm ci em uma instalação nova.

Arquivos alterados, todos em `mobile`:

- `package.json`: matriz SDK 58, versões mínimas corrigidas, Node >=22.13, comandos de teste/exportação e ferramentas de teste explícitas.
- `package-lock.json`: árvore reproduzível das dependências atualizadas.
- `app.json`: plugin `expo-status-bar` acrescentado pelo instalador oficial na passagem pelo SDK 56.

Arquivos criados em `mobile`:

- `.node-version`: versão do Node portátil.
- `scripts/use-node.ps1` e `scripts/use-node.sh`: ativação apenas no terminal atual, sem alterar PATH global.
- `tests/syntax.cjs`: validação dos 21 arquivos JS/JSX do aplicativo.
- `MIGRACAO-SDK58.md`: este relatório e roteiro.

Não houve mudanças no código das telas, design, navegação, rotas HTTP, JWT, WebSocket ou backend. Não houve alteração dos .env ou esquema MySQL. Os arquivos locais de auditoria/testes e os bundles em dist são ignorados pelo Git.

## Validações realizadas e limitações

A atualização foi incremental: 54 → 55 → 56 → 57 → 58, usando a matriz de cada SDK e `expo install --fix`.

| Etapa | Resultado |
| --- | --- |
| Referência SDK 54 | 4 testes backend; 6 mobile; smoke das 18 rotas aprovados |
| SDK 55 | Testes mobile aprovados; Doctor 20/20 |
| SDK 56 | Testes/sintaxe aprovados; Doctor 21/22, regressão conhecida do Hermes |
| SDK 57 | Testes/sintaxe aprovados; Doctor 21/21, regressão resolvida |
| SDK 58 | Testes mobile aprovados; Doctor 20/20 |
| Dependências | expo install --check aprovado; npm ls --depth=0 sem dependências inválidas |
| Sintaxe | 21 arquivos JS/JSX aprovados |
| Android | Exportação Hermes aprovada, 986 módulos, dist/android |
| iOS | Exportação Hermes aprovada, 991 módulos, dist/ios |
| Integração HTTP/WS/MySQL | Cadastro, login, perfil, listagem, senha de conta nova, conversas, autorização, histórico e persistência aprovados |
| Pedidos reais | Tipo/urgência/descrição/coordenadas/referência, validações, autoria, status, listagem e detalhes aprovados |
| Axios atualizado | Login e consultas reais à API pela LAN com Axios 1.21.1 aprovados |
| Protocolo do cliente | Auth via evento e auth_ok contra servidor real aprovados, usando WebSocket do Node 22 |
| Dados antigos | Comparação de hashes por registro: nenhum modificado ou removido; esquema preservado |

Os testes do frontend usam React, serviços nativos e API simulados. Cobrem fluxo de conta, formulário, GPS, prevenção de clique duplicado, falha de rede, atualização da Home, marcador/detalhes, separação Solicitar ajuda/SOS, reconexão e rascunho do chat. Não comprovam renderização nativa.
As integrações reais rodaram contra o backend Node 20 inalterado. O teste do cliente WebSocket no Node não substitui o WebSocket nativo no celular.
A exclusão de conta foi coberta apenas pelo teste simulado de interface; nenhuma conta foi excluída.

**Ainda pendente:** teste físico no Samsung e iPhone de mapa, GPS, teclado, barras, fontes, permissões, sessão, navegação, pedidos e comunicação entre aparelhos. Não foi realizada compilação nativa Xcode/Gradle, apenas exportação dos bundles. O sucesso no Windows não comprova funcionamento físico no iPhone.

Problemas encontrados e tratamento:

- Sandbox bloqueou socket local do teste de referência: repetido com acesso local autorizado, aprovado.
- SDK 56 tinha regressão Hermes: corrigida pela passagem planejada para SDK 57.
- Alertas críticos/altos: corrigidos com atualizações compatíveis de Axios, React Navigation e dependências transitivas. Sem audit fix --force.
- Auditoria final ainda indica **3 alertas moderados** na mesma cadeia `expo → @expo/fingerprint@0.21.10 → minimatch@10.2.6` (GHSA-g3hv-75wg-m249). Não foi aplicado o downgrade sugerido automaticamente para Expo 52 nem override de major. Acompanhar correção oficial compatível; não declarar ausência de vulnerabilidades.
- Porta 3000 já ocupada: havia backend funcional. Ele foi utilizado para o teste de LAN, sem encerrá-lo ou modificar sua configuração.

## Registros de teste preservados

Execução identificada por `1794792487867`, banco `help_us2`:

| Tabela | IDs novos |
| --- | --- |
| usuario | 16, 17, 18, 19 |
| ocorrencia | 12, 13, 14, 15, 16, 17 |
| atendimento | 8, 9, 10, 11, 12, 13 |
| mensagem | 9, 10, 11, 12 |

Ocorrência 17 foi criada via API: solicitante 16, tipo 1, urgência media, status aberta, latitude -29.99912345, longitude -51.00123456, referência `Portão azul — teste de referência`.
As ocorrências 12–16 e os atendimentos foram preparados pelo teste de chat para cobrir conversas permitidas, encerradas e recusadas. O pedido 12 é a conversa principal entre as contas A e B.

As credenciais das novas contas estão em `backend/.chat-test.local.json`, somente local. Abra esse arquivo no editor para usar email/senha no aplicativo; não execute cd nesse arquivo e não o publique. A cópia anterior foi preservada em `.chat-test.pre-sdk58-*.local.json`.
Os arquivos `.sdk58-before-1794792360572.local.json` e `.sdk58-validation.local.json`, no backend, registram hashes e IDs para comparação, sem conteúdo dos registros.
Nenhum registro foi limpo. Os testes alteraram a senha somente da conta nova D e a restauraram. Nenhuma migração SQL foi executada.

Consultas opcionais de conferência, somente leitura:

```sql
USE help_us2;
SELECT id_usuario, nome, email FROM usuario WHERE id_usuario IN (16,17,18,19);
SELECT id_ocorrencia, id_solicitante, id_tipo, titulo, nivel_urgencia, status,
       latitude, longitude, endereco_referencia, criada_em
FROM ocorrencia WHERE id_ocorrencia IN (12,13,14,15,16,17);
SELECT * FROM atendimento WHERE id_atendimento IN (8,9,10,11,12,13);
SELECT id_mensagem, id_ocorrencia, id_remetente, id_destinatario, texto, enviada_em
FROM mensagem WHERE id_mensagem IN (9,10,11,12);
```

## Como iniciar e testar

No Git Bash, em um terminal novo para o backend (Node global):

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/backend"
npm start
```

Se o backend já estiver funcionando na porta 3000, não inicie outra instância. `http://192.168.1.10:3000/status` e `/status/db` devem responder normalmente. O IP Wi-Fi conferido na migração foi 192.168.1.10, correspondente ao .env atual. Se a rede mudar, confira ipconfig antes de ajustar EXPO_PUBLIC_API_URL.

Em OUTRO terminal Git Bash para o mobile:

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/mobile"
source ./scripts/use-node.sh
npx expo start --clear
```

O ativador deve mostrar Node v22.23.5 e npm 10.9.9. Em PowerShell, o equivalente é:

```powershell
Set-Location 'C:\Users\Usuario\Desktop\HelpUsTeste\mobile'
. ./scripts/use-node.ps1
npx expo start --clear
```

Se houver um Metro antigo ocupando a porta, encerre aquele terminal com Ctrl+C ou aceite a nova porta oferecida pelo Expo. Leia o QR recém-gerado nesta pasta, evitando abrir a cópia do OneDrive ou um servidor SDK 54 antigo.

1. Samsung: instale/atualize o Expo Go oficial com suporte ao SDK 58. iPhone: confirme SDK 58 no Expo Go. O cliente SDK 54 não abre este projeto.
2. Deixe computador e celulares na mesma rede Wi-Fi; permita acesso à rede local para o Expo Go no iPhone. Não é necessário alterar a API para localhost.
3. Leia o QR com Expo Go no Android ou Câmera no iPhone. Faça login com uma das contas de teste novas; não há login demonstrativo que dispense o backend.
4. Confirme Login → Home, menu, favoritos, abas, perfil, lista de usuários, troca de senha da conta de teste e logout. Confirme o comportamento atual da sessão após reabrir; não foi adicionada uma nova política de login automático.
5. Conceda localização durante o uso. Confira o marcador azul e pedidos; toque em um pedido e abra detalhes. Android usa Google Maps; iPhone usa Apple Maps. Nenhuma chave Google foi adicionada. As bibliotecas utilizadas suportam Expo Go; não foi identificada necessidade de development build para estas funcionalidades.
6. Em Ajustes do aparelho → Expo Go → Permissões/Localização, negue localização e reabra a tela. A Home deve manter o fallback; Solicitar ajuda deve impedir envio sem posição válida. Restaure a permissão e tente novamente. Teste também localização desligada/indisponível, sem travamento.
7. Crie um pedido identificado como teste usando somente a conta nova. Confira referência, urgência, marcador, detalhes e atualização da Home. Em falha de rede, o formulário deve continuar preenchido; em timeout, confira o mapa antes de reenviar.
8. Para chat, entre como A em um aparelho e B no outro. Abra a conversa da ocorrência 12, envie nos dois sentidos, reconecte e consulte o histórico. Conversas encerradas devem impedir envio. Os testes físicos adicionarão registros; anote seus IDs e não apague dados anteriores.
9. Teste teclado, rolagem, áreas seguras e retorno entre telas em ambos. Não conclua validação do iPhone apenas pelo resultado do Android.

Para repetir checks sem criar registros (terminal do mobile com Node portátil):

```bash
npm test
npm run check:syntax
npx expo install --check
npx expo-doctor
npm run export:android
npm run export:ios
```

No backend, `npm test` usa simulações. Já `npm run test:integration` e `npm run test:ocorrencias` criam novos dados a cada execução; não são necessários apenas para abrir o aplicativo.

Se o Node portátil não existir em outra máquina, instale o ZIP Windows x64 oficial de Node 22.23.5 em `%LOCALAPPDATA%\HelpUsTools`, compare o SHA-256 com o SHASUMS256.txt oficial e mantenha a pasta `node-v22.23.5-win-x64`. Não altere a instalação global para usar esses scripts.

## Retornar ao backup SDK 54

Crie outra cópia em pasta nova, preservando a migração:

```bash
cd "/c/Users/Usuario/Desktop"
git clone --branch backup-sdk54 --single-branch https://github.com/Felipe1972/Teste_HelpUs.git HelpUsBackupSDK54
cd HelpUsBackupSDK54/mobile
npm ci
```

Use um terminal novo com Node global 20.19.6 para essa cópia. Copie os .env localmente para os respectivos diretórios, sem publicá-los. O backend original já pode continuar atendendo essa cópia; não inicie dois servidores na mesma porta. Para testar o mobile SDK 54 no Samsung, use Expo Go compatível com 54; o Expo Go 58 do iPhone não abrirá o backup SDK 54. O retorno do código não reverte nem apaga dados do help_us2.
Não execute reset --hard, force push, limpeza de banco ou sobrescrita da pasta da migração.

Referências oficiais: [atualização incremental](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [matriz SDK 58](https://docs.expo.dev/versions/v58.0.0/), [SDK 57 e Hermes](https://expo.dev/changelog/sdk-57), [mapas e Expo Go](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/), [Node portátil](https://nodejs.org/dist/v22.23.5/), [alerta residual minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).
