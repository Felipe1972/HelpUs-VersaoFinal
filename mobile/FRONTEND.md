# Front-end e navegação — Help Us

Atualização: SOS agora cria pedidos reais e a Home carrega marcadores da API. Veja [OCORRENCIAS.md](../OCORRENCIAS.md) para o fluxo atual; as referências abaixo a SOS simulado descrevem a etapa anterior.

Referência: Figma `Mx6cfp0sHXCrIrzGxvQfjd`, página 0:1. As seis telas desenhadas são Login, Home, Avisos e Alertas, Alerta de Emergência, mapa da ocorrência e detalhes da ocorrência. Chat, menu, favoritos, SOS e recuperação de acesso complementam os fluxos com a mesma identidade visual. A moldura de iPhone do Figma não faz parte da interface.

## Executar no Git Bash

```bash
cd "/c/Users/Usuario/Desktop/HelpUsTeste/mobile"
npx expo start --clear
```

Use Expo Go compatível com SDK 54 e leia o QR code desta execução. Se houver outro Metro, encerre-o ou use a porta alternativa e leia o novo QR code. Computador e celular precisam alcançar a mesma rede. Mantenha a API em execução para os recursos reais de conta e chat; `EXPO_PUBLIC_API_URL` deve apontar para ela. A etapa posterior do chat passou a usar `help_us2`; veja [CHAT.md](../CHAT.md).

## Telas e caminhos

| Origem | Destino / comportamento |
| --- | --- |
| Login → Entrar | Home após autenticação real; limpa o estado demonstrativo da sessão anterior |
| Login → Não tenho conta | Cadastro real |
| Login → Esqueci a senha | Explicação de recuperação ainda indisponível; não envia e-mail |
| Barra inferior | Home, Conversas, Avisos e Alertas, Perfil |
| Menu no cabeçalho | Atalhos para Home, Favoritos, Conversas, Avisos, Perfil, Usuários e SOS |
| Coração no cabeçalho | Favoritos |
| Home → SOS | Formulário de pedido simulado e confirmação local |
| Avisos → Segurança / Notícias | Leitura do aviso fictício |
| Avisos → Emergência | Alerta de exemplo → Ver no mapa |
| Avisos → Ocorrência local | Mapa fictício → Abrir → Detalhes |
| Detalhes → Coração | Adiciona/remove dos favoritos nesta sessão |
| Detalhes → Aceitar / Recusar | Resposta simulada; não notifica ninguém |
| Detalhes demonstrativos → Enviar mensagem | Abre a lista de conversas reais; não cria vínculo fictício no banco |
| Conversas → participante | Chat real da ocorrência e do par solicitante/voluntário; mensagens persistidas no MySQL |
| Perfil → Ir para a Home | Retorna à Home existente |
| Perfil → Ver usuários / Trocar senha / Sair / Excluir conta | Integrações reais existentes; exclusão continua exigindo confirmação |

Há 17 rotas registradas. Voltar usa o histórico da pilha; a barra inferior reutiliza uma rota que já existe na pilha, evitando empilhar cópias da Home. A Home continua com MapView, Marker do próprio usuário e localização em primeiro plano. A ocorrência fictícia usa coordenadas fixas de exemplo, sem distância real ou cálculo de trajeto. O chat consulta conversas/histórico pela API e usa WebSocket para mensagens.

## Organização

- `src/components/UI.js`: cabeçalho, barra inferior, tela com rolagem/teclado, cards, botões, linhas e cores.
- `src/context/DemoContext.js`: favoritos, respostas e avisos lidos em memória; reiniciados após novo login. Não contém mensagens de chat.
- `src/data/demo.js`: conteúdo fictício separado da interface.
- `src/screens/CommunityScreens.js`: notificações, leitura de aviso, emergência, mapa/detalhes da ocorrência, favoritos, menu, SOS e recuperação.
- `src/screens/ChatScreens.js`: conversas e chat.
- Telas antigas atualizadas: Login, Cadastro, Home, Perfil, Usuários e TrocarSenha.
- Navegador atualizado: `src/navigation/AppNavigator.js`.

Sem dependências novas. Ícones Ionicons de `@expo/vector-icons`, navegação com `@react-navigation/native-stack`, mapas com `react-native-maps`, GPS com `expo-location`. Tipografia nativa, sem fonte ou imagem externa necessária. SDK 54, Axios, AsyncStorage e serviços de autenticação preservados.

## Validação automatizada

```bash
node tests/frontend-smoke.cjs
node --test tests/chat.test.cjs
npx expo-doctor
npx expo export --platform android --output-dir dist/frontend-navigation-validated
```

O smoke test simula React, componentes nativos, GPS e serviços: verifica rotas, ações de navegação, login para Home, cadastro, troca de senha, lista de usuários, exclusão com confirmação, logout e GPS concedido/negado/com erro. Não chama backend nem apaga contas reais. Não substitui teste visual e integração no aparelho.

## Roteiro no Expo Go

1. Entrar com conta de teste. Confirmar abertura da Home, mapa e título “Você está aqui” ao tocar no marcador com GPS permitido.
2. Alternar entre as quatro abas e voltar à Home. Testar menu e coração, inclusive botão Voltar do Android.
3. Abrir os quatro avisos. Seguir Emergência → mapa → detalhes; aceitar/recusar, favoritar e abrir Favoritos. Remover o favorito e conferir o estado vazio.
4. Seguir o teste com duas contas em [CHAT.md](../CHAT.md). Abrir o teclado e verificar se o campo continua acessível. Voltar às conversas e reabrir o chat; o histórico deve permanecer no banco.
5. Abrir SOS, preencher a mensagem e simular o envio. Confirmar o aviso explícito de que ninguém foi notificado.
6. No Perfil, testar Home, lista, troca de senha e logout com API disponível. Para testar exclusão, criar uma conta descartável, pois esta ação continua real.
7. Sair e cadastrar uma conta de teste. Fazer novo login e confirmar que os dados demonstrativos da sessão anterior foram reiniciados.
8. Nas configurações Android → Aplicativos → Expo Go → Permissões → Localização, negar a permissão. Reabrir/recarregar o app e verificar mapa padrão com aviso. Conceder novamente, ativar localização e recarregar para testar GPS.
9. Verificar em aparelho pequeno e com tamanho de fonte aumentado: rolagem de formulários, títulos, cards e botões. Não há emulador Android configurado no ambiente de implementação; esta conferência visual e de serviços reais ainda precisa ser feita no celular.
