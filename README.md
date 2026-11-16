# Help Us

Pedidos de ajuda reais, formulário SOS e marcadores no mapa: veja [OCORRENCIAS.md](OCORRENCIAS.md). Esta etapa substitui o SOS demonstrativo; o aceite de atendimentos continua fora do escopo.

Aplicativo mobile assistivo com contas de usuário, Home com mapa, navegação e chat textual por ocorrência.

## Estrutura

- `backend/`: API REST e WebSocket no mesmo servidor Node.js/Express, MySQL `help_us2` e JWT.
- `mobile/`: React Native/Expo SDK 54, Axios, AsyncStorage e WebSocket nativo.
- `database/`: scripts SQL; a migração do chat está documentada separadamente.

Veja [CHAT.md](CHAT.md) para iniciar backend/aplicativo, testar com duas contas, consultar mensagens e entender protocolo, migração e limitações. A cópia usada nesta etapa é `C:\Users\Usuario\Desktop\HelpUsTeste`.

Veja [mobile/FRONTEND.md](mobile/FRONTEND.md) para navegação e teste das telas. SOS, avisos e aceite de ocorrências na interface ainda são demonstrativos. O chat usa somente vínculos reais já presentes no banco.

