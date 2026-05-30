import type { Academia } from '@/lib/api';

export const imagensAcademias: Record<string, any> = {
  '1': require('../assets/images/gym1.jpeg'),
  '2': require('../assets/images/gym2.webp'),
  '3': require('../assets/images/gym3.jpg'),
  '4': require('../assets/images/gym4.jpg'),
};

export const academiasLocais: Academia[] = [
  {
    id: '1',
    nome: 'SMART FIT',
    endereco: 'Av. Vinte e Seis de Marco, 701 Centro',
    cidade: 'Barueri, SP',
    cep: '06401-050',
    descricao: 'Academia de musculacao com aparelhos modernos.',
    infos: [
      'Academia de musculacao',
      'Aparelhos de alta qualidade',
      'Plano Black - direito de treinar em qualquer Smart Fit',
      'Banheiros com duchas',
    ],
  },
  {
    id: '2',
    nome: 'BLUE FIT',
    endereco: 'Av. Trindade, 344 Bethaville I',
    cidade: 'Barueri, SP',
    cep: '06404-326',
    descricao: 'Academia com musculacao e aulas coletivas.',
    infos: [
      'Academia de musculacao',
      'Aparelhos de alta qualidade',
      'Plano Gold - treine em todas unidades',
    ],
  },
  {
    id: '3',
    nome: 'BIO RITMO',
    endereco: 'Av. Piracema, 669 - Tambore',
    cidade: 'Barueri, SP',
    cep: '06460-030',
    descricao: 'Academia premium com equipamentos de alta qualidade.',
    infos: [
      'Academia de musculacao, ginastica, burn e race',
      'Aparelhos de ultima geracao',
      'Plano Platinum',
      'Acesso aos estudios da unidade',
    ],
  },
  {
    id: '4',
    nome: 'GAVIOES',
    endereco: 'Av. Jurua, 253 - Alphaville',
    cidade: 'Barueri, SP',
    cep: '06455-020',
    descricao: 'Academia focada em musculacao e lutas.',
    infos: [
      'Musculacao e artes marciais',
      'Sala de bike e rooftop',
      'Pilates e aulas aerobicas',
      'Planos mensal, trimestral e anual',
    ],
  },
];

export function getAcademiaImagem(academia: Academia) {
  if (academia.imagemUrl) {
    return { uri: academia.imagemUrl };
  }

  return imagensAcademias[academia.id] || imagensAcademias['1'];
}
