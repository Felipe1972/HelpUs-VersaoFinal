# Help Us

Aplicativo acadêmico de ajuda comunitária: pessoas solicitam ajuda e voluntários acompanham pedidos, conversam e realizam atendimentos. Uma mesma conta pode solicitar ajuda e atuar como voluntária.

## Tecnologias e estrutura

React Native 0.88, React 19.3 e Expo SDK 58 no aplicativo; Express sobre Node.js, MySQL `help_us2`, JWT e WebSocket no servidor. Axios realiza chamadas HTTP; AsyncStorage mantém a sessão local. As versões exatas estão nos lockfiles.

```text
backend/
  server.js         Servidor HTTP e WebSocket
  src/              routes, controllers, services, middlewares, config, websocket
  scripts/          Migrações controladas já executadas
  tests/            Testes unitários e de integração
mobile/
  App.js, index.js   Entrada do aplicativo
  src/              screens, components, navigation, context, data, hooks, services
  assets/           Imagens e ícones
  scripts/          Ativação do Node portátil
  tests/            Testes de lógica e renderização simulada
database/           SQL e migrações preservados
docs/               Arquitetura, banco e funcionalidades
.private-backups/   Apenas artefatos atuais necessários aos testes; ignorados pelo Git
```

Históricos e backups foram separados na pasta irmã `../HelpUs-Arquivo`, fora do repositório. Ela contém `backups-banco`, `documentacao-historica`, `execucoes-testes`, `diagnosticos` e o guia privado de defesa técnica. Não publicar seu conteúdo. Novas execuções de testes/migrações ainda podem gerar arquivos privados locais.

## Pré-requisitos e instalação

- MySQL iniciado, com a base `help_us2` preparada.
- Node 20.19.6 utilizado no backend desta instalação.
- Node portátil 22.23.5 no mobile; requisito do projeto: Node >=22.13.0.
- Expo Go compatível, celular e computador com acesso à mesma rede.

Em uma cópia nova, execute `npm ci` em `backend` e em `mobile` (ative primeiro o Node portátil no mobile). Preserve os lockfiles. Não atualize o Expo para executar esta versão.

O banco já existente não precisa de novas migrações. Os SQL históricos não formam um instalador único: para uma máquina nova, restaure uma cópia autorizada do esquema completo e configure um usuário MySQL apropriado. Veja [Banco de dados](docs/BANCO-DE-DADOS.md).

Configure `backend/.env` a partir de `backend/.env.example`: `PORT=3000`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=help_us2` e um `JWT_SECRET` forte. Não versionar valores privados.

No `mobile/.env`, defina `EXPO_PUBLIC_API_URL=http://SEU_IPV4_ATUAL:3000`, substituindo pelo IPv4 real do computador. Essa URL é pública no bundle; nunca coloque senhas nesse arquivo.

## Inicialização manual no VS Code / Git Bash

Abra a pasta do projeto. Inicie o MySQL e use dois terminais separados.

Backend:

```bash
cd backend
npm start
```

Mobile:

```bash
cd mobile
source ./scripts/use-node.sh
npx expo start --clear
```

O script ativa o Node instalado em `%LOCALAPPDATA%/HelpUsTools/node-v22.23.5-win-x64` somente no terminal atual. No PowerShell use `. ./scripts/use-node.ps1`. Ele não instala nem substitui o Node global. Leia o QR com o celular. `Ctrl+C` encerra cada processo. Evite iniciar duas APIs: `EADDRINUSE` indica porta já ocupada.

## Rede e mudança de Wi-Fi

1. Conecte computador e celular à mesma rede.
2. Execute `ipconfig` no computador e identifique o IPv4 do adaptador ativo.
3. Atualize `EXPO_PUBLIC_API_URL` e reinicie Metro com `npx expo start --clear`.
4. No navegador do celular, teste `http://SEU_IPV4_ATUAL:3000/status`.
5. `/status/db` permite conferir a conexão com MySQL sem alterar registros.

A API escuta conexões de rede na porta 3000. Se necessário, permita Node/porta 3000 apenas em rede privada confiável no firewall, sem desativá-lo. Em rede escolar com isolamento de clientes, use hotspot que permita comunicação entre os aparelhos, obtenha o novo IPv4 e repita o teste. O túnel do Metro não expõe automaticamente a API. Na instalação local usa-se HTTP; uma implantação pública exige HTTPS/WSS e configuração de segurança própria.

## Testes

Sem criar dados de integração:

```bash
# em backend
npm test
# em mobile, após ativar o Node portátil
npm test
npm run check:syntax
```

Os scripts `test:integration`, `test:ocorrencias`, `test:permissoes`, `test:atendimento`, `test:finalizacao` e `test:notificacoes` do backend gravam dados de teste. Não os execute na base de apresentação sem backup e planejamento de limpeza. Os testes de ocorrências/permissões dependem do artefato atual de chat, preservado em `.private-backups/execucoes-testes/backend`.

Validações adicionais no mobile: `npx expo-doctor`, `npm run export:android` e `npm run export:ios`. Bundles são gerados em `mobile/dist`; não substituem teste físico.

## Limitações reais

- Eventos de notificações são consultados em primeiro plano; não há push remoto com aplicativo fechado. Lembretes locais já agendados dependem do sistema operacional.
- Distância é estimada em linha reta; não há cálculo próprio de trânsito ou trajeto.
- SOS abre o discador, sem realizar chamada automática ou despachar equipes.
- Telas comunitárias antigas mantêm exemplos identificados como demonstração; a Home usa dados reais.
- GPS, mapas, permissões, notificações, teclado e discador precisam de validação em aparelhos reais.
- É um protótipo acadêmico; não oferece verificação documental de identidade nem recuperação de senha por e-mail.

## Documentação

[Arquitetura](docs/ARQUITETURA.md) · [Banco de dados](docs/BANCO-DE-DADOS.md) · [Funcionalidades](docs/FUNCIONALIDADES.md).

O guia privado de estudo está em `../HelpUs-Arquivo/GUIA-DEFESA-TECNICA.md`. Ele não faz parte do código distribuído.
