// Somente dados de apresentação. Nenhum deles é enviado para a API.
export const occurrence = {
  id: 'demo-1',
  title: 'Pedido de ajuda',
  description: 'Preciso de ajuda para mover meu armário',
  latitude: -23.5505,
  longitude: -46.6333,
  author: 'Marina',
};
export const notices = [
  {
    id: 'security',
    title: 'Alerta de segurança',
    time: '20 min',
    icon: 'alert',
    color: '#E3A124',
    text: 'Exemplo de aviso de segurança da comunidade. Confira as informações antes de sair.',
    route: 'Aviso',
  },
  {
    id: 'news',
    title: 'Aviso de notícias',
    time: '1 h',
    icon: 'newspaper-outline',
    color: '#2876E7',
    text: 'Nossa comunidade está organizando uma ação de apoio aos moradores. Este conteúdo é demonstrativo.',
    route: 'Aviso',
  },
  {
    id: 'emergency',
    title: 'Alerta de emergência',
    time: '2 h',
    icon: 'alert',
    color: '#EF3036',
    route: 'AlertaEmergencia',
  },
  {
    id: 'local',
    title: 'Ocorrência local',
    time: '1 d',
    icon: 'locate-outline',
    color: '#31A878',
    route: 'OcorrenciaMapa',
  },
];
