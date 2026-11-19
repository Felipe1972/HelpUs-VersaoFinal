# Help Us

O Help Us é um aplicativo desenvolvido como projeto acadêmico que busca conectar pessoas que precisam de ajuda a voluntários da comunidade.

Através do aplicativo, os usuários podem solicitar ajuda, conversar com voluntários e acompanhar seus atendimentos.

## Tecnologias

O aplicativo foi desenvolvido em JavaScript utilizando React Native e Expo SDK 58. O backend utiliza Node.js e Express, com MySQL para armazenamento dos dados.

Para a autenticação dos usuários, foi utilizado JWT. A comunicação em tempo real do chat é realizada através de WebSocket.

O mapa utiliza a biblioteca react-native-maps, enquanto a localização é obtida através do expo-location. As notificações são implementadas com expo-notifications.

## Estrutura do projeto

A pasta backend contém a API e as regras de negócio do sistema. A pasta mobile contém as telas, componentes e funcionalidades do aplicativo. Na pasta database estão os scripts SQL utilizados durante o desenvolvimento.

## Instalação

Para executar o projeto, é necessário ter Node.js, MySQL e Expo Go instalados.

Instale as dependências utilizando `npm ci` nas pastas backend e mobile.

Configure o arquivo `.env` do backend com os dados de conexão do MySQL, utilizando o banco `help_us2` e uma chave JWT.

No arquivo `.env` do mobile, configure a variável `EXPO_PUBLIC_API_URL` com o endereço IP do computador e a porta 3000.

É necessário possuir a estrutura atualizada do banco, pois os scripts SQL existentes registram diferentes etapas do desenvolvimento.

## Execução

Backend:


cd backend
npm start


Mobile:

cd mobile
source ./scripts/use-node.sh
npx expo start --clear


O mobile utiliza Node.js 22.13 ou superior. O script use-node.sh configura a versão portátil do Node quando instalada no computador.

O celular e o computador devem estar conectados à mesma rede. Após iniciar o Expo, basta escanear o QR Code.

## Funcionalidades

Cadastro e autenticação, solicitação de ajuda, mapa de ocorrências, chat em tempo real, acompanhamento de atendimentos, notificações, avaliações e contatos de emergência.

O projeto também possui testes automatizados para auxiliar na validação das funcionalidades.

## Considerações

O Help Us é um protótipo acadêmico. As notificações remotas com o aplicativo fechado e a verificação de identidade ainda não foram implementadas. O SOS permite acessar contatos de emergência e abrir o discador, sem realizar chamadas automaticamente.