# Help Us

Aplicativo acadêmico de ajuda comunitária. React Native/Expo SDK58, Node.js/Express, MySQL help_us2, JWT, Axios, AsyncStorage e WebSocket.

## Estrutura e arquitetura
- mobile/src: screens, components, navigation, context, hooks e services.
- backend/src: routes, controllers, services, middlewares, config e websocket.
- database: SQL; DER consolidado em docs/BANCO-DE-DADOS.md. backend/scripts: migrações controladas, não reaplicar.
- backend/tests e mobile/tests: testes; docs: documentação técnica consolidada.

REST e WebSocket compartilham porta3000. JWT identifica conta, servidor relê permissões; WebSocket exige auth antes de mensagens. Aceite usa transação/travas. Consentimento libera posição exata. Contatos privados só pertencem ao proprietário. Diretório geral desabilitado.

## Instalação em uma cópia nova
Preserve os lockfiles. No backend execute npm ci; no mobile ative primeiro o Node portátil e execute npm ci. Configure os .env locais com credenciais próprias e EXPO_PUBLIC_API_URL apontando para a API. O banco existente help_us2 já está preparado: não reaplique migrações. Nunca versionar senhas ou backups.

## Iniciar manualmente no VS Code / Git Bash
Abra Desktop/HelpUsTeste e inicie MySQL.
Terminal backend: cd backend e npm start.
Terminal mobile: cd mobile, source ./scripts/use-node.sh e npx expo start --clear.
Ctrl+C encerra cada terminal. Não inicie duas APIs. Node portátil preservado, não atualizar Node global/Expo. Credenciais permanecem nos .env privados.

## Outra rede Wi-Fi
Computador e celular na mesma rede. Execute ipconfig, obtenha IPv4 do Wi-Fi ativo. Edite mobile/.env para EXPO_PUBLIC_API_URL=http://SEU_IPV4_ATUAL:3000 substituindo pelo IP real. Reinicie Metro com Ctrl+C e npx expo start --clear; leia o novo QR.
No navegador do celular abra http://SEU_IPV4_ATUAL:3000/status. Deve retornar status ok. Backend escuta todas as interfaces na porta3000. Não desative firewall: permita Node/porta3000 apenas na rede privada confiável se necessário.
Se a escola isolar dispositivos, use hotspot conectando computador e aparelho de teste à mesma rede; descubra novo IPv4 e teste /status. Alguns hotspots também isolam clientes. Túnel Metro sozinho não expõe API.

## Testes
Backend: npm test, npm run test:integration, npm run test:permissoes, npm run test:finalizacao. Integrações criam dados: planeje novo backup/limpeza antes de executá-las na base de apresentação.
Mobile com Node portátil: npm test, npm run check:syntax, npx expo-doctor, npm run export:android, npm run export:ios.

## Apresentar arquitetura
Tela chama REST com JWT; servidor autoriza e persiste em MySQL; aceite coordena atendimento; chat autentica via WebSocket; consentimento controla localização. Mostre AppNavigator, routes/services, websocket e database.

[Arquitetura](docs/ARQUITETURA.md) · [Banco de dados](docs/BANCO-DE-DADOS.md) · [Funcionalidades](docs/FUNCIONALIDADES.md).

Originais históricos íntegros em .private-backups/documentacao-historica/2026-11-18, separados por pasta de origem; manifesto SHA256 privado. Resultados e credenciais de testes ficam em .private-backups/execucoes-testes. Ambas as pastas são ignoradas pelo Git.
