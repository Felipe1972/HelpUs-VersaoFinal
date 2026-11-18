# Estabilidade do mapa e auditoria do atendimento — 16/11/2026

## Diagnóstico e correções
1. **São Paulo — causa confirmada:** Home inicializava região fixa (-23.5505, -46.6333). Falha, permissão negada ou demora no GPS mantinham essa região. Agora começa sem coordenadas e só monta o mapa após posição válida; apresenta aviso e nova tentativa quando não há posição. Não usa São Paulo ou outra cidade fictícia.
2. **Instabilidade do polling — causa confirmada no código:** a cada 15 segundos, usePollingRefresh incrementava attempt, desmontando o efeito de consulta (não o MapView), limpando pedidos, seleção e perfil. O sumiço/reaparecimento dos controles de voluntário mudava o espaço disponível. Agora há um ciclo por foco/filtro, atualização sem limpeza, sem sobreposição, mantendo marcadores em falhas transitórias. 401/403 continuam limpando dados; sair da tela cancela a consulta e limpa dados da sessão.
3. **Mapa sem altura garantida — risco concreto de layout:** mapContainer tinha somente flex:1, enquanto controles, seleção e ações consumiam a altura. Agora a Home pode rolar e o mapa possui altura base de 320 e mínimo de 280 pontos, sem depender do espaço que sobrar entre controles. MapView não ganha key dinâmica nem é desmontado a cada consulta.
4. **Câmera:** anteriormente region e onRegionChangeComplete alimentavam estado controlado. Agora initialRegion vem da localização real, movimento do usuário é preservado e apenas localizar/centralizar aciona animateToRegion. A atualização de pedidos e o retorno da criação não deslocam a câmera.
5. **GPS:** reutiliza obtainLocation com permissão, serviço habilitado, timeout de 20 segundos e fallback limitado a posição de até 2 minutos e precisão de até 100 m. Botão Centralizar em mim reutiliza posição obtida há menos de 60 segundos; depois busca posição nova. Voltar do segundo plano só tenta GPS automaticamente se ainda não existe posição válida. Falha posterior mantém mapa/local anterior e apresenta aviso.

Não havia evidência de desmontagem do MapView a cada polling. Sem logs do Samsung ou reprodução física, não é possível atribuir com certeza todo caso de tiles brancos ao layout: falhas nativas/rede do provedor de mapas continuam possíveis. As causas determinísticas acima foram corrigidas e verificadas por testes simulados. Não há alegação de validação física concluída.

## Seletores
Removido ✓ de Tipo, Urgência e Agora/Agendar. Seleção usa borda de 1 ponto, fundo claro e contraste no texto; accessibilityRole radio e checked permanecem. Sem nova biblioteca ou redesign.

## Auditoria após o aceite
| Item | Situação | Evidência/comportamento |
|---|---|---|
| Aceitar pedido | Existente | Transação bloqueia ocorrência, valida voluntariado/autoria/disponibilidade, insere atendimento e muda status para em_atendimento; reutiliza/cria conversa e abre Chat. |
| Dois voluntários concorrentes | Existente | Serviço impede novo responsável; conserva exceções legadas dos pedidos 3 e 12 sem adicionar responsáveis. |
| Confirmação ao solicitante | Parcial | Status aparece como Em atendimento ao atualizar detalhes/Meus pedidos e o chat fica disponível. Polling em primeiro plano atualiza em até 15 s. Não existe confirmação destacada, push ou aceite adicional do solicitante. |
| Horário para ambos | Existente | Mesmo instante UTC retornado; interface exibe no fuso local de cada aparelho, com identificação de agendamento. Pedidos antigos mostram horário não informado. |
| Dados privados | Existente | Dono e responsável aceito têm acesso enquanto ativo; outros voluntários recebem dados públicos/posição aproximada. Nos vínculos legados múltiplos, todos os responsáveis aceitos conservam seu acesso. |
| Atendimento em andamento | Parcial | Lista Meus atendimentos abre os detalhes compartilhados e o Chat. Não há tela dedicada de acompanhamento ou etapas adicionais. |
| Chat após aceite | Existente | Conversa é reutilizada e permite mensagens aos participantes responsáveis; demais pré-chats ficam somente leitura e anônimos para o voluntário não escolhido. |
| Cancelar pelo solicitante | Ausente | Nenhuma rota ou botão de cancelamento. O status cancelada é respeitado se já existir no banco. |
| Finalizar pelas partes | Ausente | Nenhuma rota ou botão de finalização; status finalizada/finalizado são respeitados. |
| Voluntário não pode comparecer | Ausente | Não existe desistência após aceite, reabertura ou substituição. Recusar é apenas antes do aceite, não equivale a desistir. |
| Pedido aceito como oportunidade | Corrigido anteriormente/existente | Aceite remove das oportunidades e do mapa comunitário de outros voluntários. Link direto de voluntário ainda pode retornar detalhes públicos; não permite novo aceite. |

Auditoria real somente leitura na API configurada no celular, pedido de teste 24:
- Solicitante 28: em_atendimento, acesso privado próprio, conversa do responsável gravável e outra somente leitura.
- Responsável 29: em_atendimento, assumido=true, acesso privado e chat gravável.
- Outro voluntário 30: acesso privado=false, chat somente leitura e Anônimo.
- Mesmo instante de atendimento retornado às três contas. Pedido não consta como oportunidade para os voluntários.
Não foram criados ou alterados registros nesta auditoria.

## Arquivos desta etapa
- mobile/src/screens/HomeScreen.js
- mobile/src/screens/PedidosScreen.js (somente apresentação das opções)
- mobile/src/components/SchedulePicker.js (somente apresentação das opções)
- mobile/tests/frontend-smoke.cjs
- MAPA-AUDITORIA.md
Backend, schema, SDK, dependências, cópia OneDrive e registros preservados. Nenhum push.

## Validações
- Smoke de 18 rotas: aprovado, incluindo novos testes de polling, preservação de marcadores/câmera, consulta sem sobreposição, erro de rede, coordenadas inválidas, segundo plano/retorno e limpeza ao sair.
- GPS: permissão concedida/negada, serviço desligado, falha, timeout e fallback recente validados nos testes existentes.
- Mobile: 6 testes adicionais aprovados; backend: 7 testes unitários aprovados, sem gravação no banco.
- Expo Doctor: 20/20.
- Exportação Android/iOS: mobile/dist/map-stability.
- Limite: mocks de React Native não medem Yoga nem renderizam tiles reais. Altura, gestos e estabilidade visual exigem o roteiro físico abaixo.

## Conferir agora no Samsung e iPhone
1. Recarregar o aplicativo atualizado, entrar como voluntário e conceder localização. Conferir que não passa por São Paulo e centraliza na posição real.
2. Mover/zoomer o mapa e aguardar pelo menos três ciclos de 15 segundos. Confirmar que não desloca, não pisca e não perde altura quando os controles aparecem.
3. Abrir detalhes/Chat e voltar; testar Centralizar em mim. Perfil, filtros, Meus pedidos, Solicitar ajuda e SOS devem continuar acessíveis por rolagem.
4. Ir ao segundo plano por 30 segundos e voltar. Testar perda de rede: mapa/câmera permanecem e a mensagem informa falha de atualização.
5. Desativar GPS ou negar permissão antes de entrar: aviso sem localização fictícia e botão de tentativa. Reativar e tentar novamente. Testar também fonte ampliada e orientação do aparelho.
6. Se tiles ainda ficarem brancos, registrar captura, momento do problema e log do Metro/Expo: isso separa falta de espaço de falha nativa ou de rede do mapa.

Não é necessário reiniciar a API para estas alterações. Recarregue o mobile pelo Expo Go/terminal do Expo. Com o prazo de entrega, a prioridade restante é este teste físico; cancelamento/finalização/desistência são funcionalidades futuras, não foram implementadas escondidas nesta correção.
