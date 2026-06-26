import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Academia = {
  id: string | number;
  nome: string;
  cnpj?: string;
  descricao?: string;

  cep: string;
  endereco: string;
  numero?: number;
  complemento?: string;
  bairro?: string;
  cidade: string;
  estado?: string;

  telefone?: string;
  celular?: string;
  email?: string;

  categorias?: string;
  facilidades?: string;

  nota?: number | null;
  statusAcademia?: string;
};

export type Usuario = {
  id: string | number;
  nome: string;
  username: string;
  nivelAcesso?: string;
  statusUsuario?: string;
  cep?: string;
};

type LoginResponse = {
  message?: string;
  mensagem?: string;
  usuario?: Usuario;
};

// Tipo da foto da academia retornada pelo backend.
// A imagem em si vem pela rota:
// GET /fotos-academia/{fotoId}/imagem
export type FotoAcademia = {
  id: string | number;
  nomeArquivo?: string;
  tipoArquivo?: string;
  statusFotoAcademia?: string;
};

// Tipo usado no Mobile para guardar o endereço retornado pelo ViaCEP.
export type EnderecoViaCep = {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
};

// Remove barra final da URL, caso venha algo como http://localhost:8080/
function removerBarraFinal(url: string) {
  return url.replace(/\/$/, '');
}

// Descobre automaticamente qual URL usar para conectar no backend.
function buscarApiUrl() {
  // Permite configurar manualmente a URL da API pelo .env:
  // EXPO_PUBLIC_API_URL=http://SEU_IP:8080
  if (process.env.EXPO_PUBLIC_API_URL) {
    return removerBarraFinal(process.env.EXPO_PUBLIC_API_URL);
  }

  // Quando roda no navegador, localhost aponta para o próprio computador.
  if (Platform.OS === 'web') {
    return 'http://localhost:8080';
  }

  // Quando roda no Expo Go, tenta descobrir o IP da máquina que está rodando o Expo.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  const host = hostUri?.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8080`;
  }

  // Emulador Android usa esse endereço especial para acessar o localhost do computador.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  return 'http://localhost:8080';
}

export const API_URL = buscarApiUrl();

const REQUEST_TIMEOUT_MS = 10000;

// Função base para chamadas JSON ao backend.
async function request<T>(rota: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let resposta: Response;

  try {
    resposta = await fetch(`${API_URL}${rota}`, {
      credentials: 'include',
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo esgotado ao conectar com o backend.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resposta.ok) {
    const mensagem = await resposta.text();
    throw new Error(mensagem || 'Erro na comunicação com o backend.');
  }

  const texto = await resposta.text();

  return texto ? (JSON.parse(texto) as T) : (undefined as T);
}

// Mostra apenas o primeiro nome do usuário na interface.
export function formatarNomeUsuario(usuario: Usuario | null) {
  const primeiroNome = (usuario?.nome || usuario?.username || 'Usuário')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

  return primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
}

// Remove tudo que não for número e limita o CEP a 8 dígitos.
export function limparCep(cep: string) {
  return String(cep || '').replace(/\D/g, '').slice(0, 8);
}

// Formata CEP no padrão 00000-000.
export function formatarCep(cep?: string) {
  const numeros = limparCep(cep || '');

  if (numeros.length <= 5) {
    return numeros;
  }

  return numeros.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

// Busca endereço no ViaCEP.
// Essa função NÃO usa o backend.
// Ela funciona igual ao Web: chama diretamente a API pública do ViaCEP.
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCep> {
  const cepLimpo = limparCep(cep);

  if (cepLimpo.length !== 8) {
    throw new Error('O CEP precisa ter 8 números.');
  }

  const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

  if (!resposta.ok) {
    throw new Error('Não foi possível buscar o CEP no ViaCEP.');
  }

  const dados = await resposta.json();

  // Quando o ViaCEP não encontra o CEP, ele retorna:
  // { "erro": true }
  if (dados.erro) {
    throw new Error('CEP inválido ou não encontrado.');
  }

  return {
    cep: formatarCep(dados.cep || cepLimpo),
    endereco: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    estado: dados.uf || '',
  };
}

// Monta a URL da foto do usuário.
// Não colocamos Date.now() aqui para a imagem não ficar piscando
// toda vez que a tela renderizar, como ao digitar nome ou CEP.
//
// Quem controla a atualização da foto é a tela perfil.tsx,
// usando o estado fotoVersao somente quando a foto é realmente alterada.
export function getFotoUsuarioUrl(usuarioId?: string | number) {
  if (!usuarioId) {
    return null;
  }

  return `${API_URL}/usuarios/${usuarioId}/foto`;
}

// Transforma a string "Musculação, Yoga" em ["Musculação", "Yoga"].
export function normalizarCategorias(categorias?: string) {
  return String(categorias || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Transforma a string "Wi-Fi, Estacionamento" em ["Wi-Fi", "Estacionamento"].
export function normalizarFacilidades(facilidades?: string) {
  return String(facilidades || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// LOGIN
export async function login(username: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
  });
}

// USUÁRIO
export async function buscarUsuarioPorId(id: string | number) {
  return request<Usuario>(`/usuarios/${id}`);
}

export async function atualizarNomeECepUsuario(
  id: string | number,
  nome: string,
  cep: string
) {
  return request<Usuario>(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      nome: nome.trim(),
      cep: limparCep(cep),
    }),
  });
}

// Atualiza a foto de perfil do usuário.
// Essa função envia a imagem para:
// PUT /usuarios/{id}/foto
export async function atualizarFotoPerfil(
  id: string | number,
  imageUri: string,
  mimeType = 'image/jpeg'
) {
  const formData = new FormData();

  const extensao = mimeType.includes('png') ? 'png' : 'jpg';
  const nomeArquivo = `foto-perfil-${id}.${extensao}`;

  // IMPORTANTE:
  // O nome do campo precisa ser "file",
  // porque no backend está:
  // @RequestParam("file") MultipartFile file

  // No Expo Web/navegador, precisamos converter a imagem para Blob.
  if (Platform.OS === 'web') {
    const imagemResposta = await fetch(imageUri);
    const imagemBlob = await imagemResposta.blob();

    formData.append('file', imagemBlob, nomeArquivo);
  } else {
    // No Android/iOS, o React Native aceita enviar arquivo usando uri/name/type.
    formData.append('file', {
      uri: imageUri,
      name: nomeArquivo,
      type: mimeType,
    } as any);
  }

  const resposta = await fetch(`${API_URL}/usuarios/${id}/foto`, {
    method: 'PUT',
    body: formData,
    credentials: 'include',
    headers: {
      Accept: 'application/json',

      // Não colocar Content-Type aqui.
      // O fetch monta automaticamente o multipart/form-data com boundary.
    },
  });

  if (!resposta.ok) {
    const mensagem = await resposta.text();

    throw new Error(
      mensagem || `Erro ao atualizar foto de perfil. Status: ${resposta.status}`
    );
  }
}

// ACADEMIAS
export async function buscarAcademias() {
  return request<Academia[]>('/academias');
}

// Busca academias próximas usando a mesma lógica do backend/Web.
// Backend:
// GET /academias/proximas/usuario/{usuarioId}
export async function buscarAcademiasProximasDoUsuario(usuarioId: string | number) {
  return request<Academia[]>(`/academias/proximas/usuario/${usuarioId}`);
}

export async function buscarAcademiaPorId(id: string | number) {
  return request<Academia>(`/academias/${id}`);
}

// FOTOS DAS ACADEMIAS
export async function buscarFotosAcademia(academiaId: string | number) {
  return request<FotoAcademia[]>(`/fotos-academia/academia/${academiaId}`);
}

export function getFotoAcademiaUrl(fotoId?: string | number) {
  if (!fotoId) {
    return null;
  }

  // Date.now evita cache antigo quando a foto é alterada no Web.
  return `${API_URL}/fotos-academia/${fotoId}/imagem?v=${Date.now()}`;
}

export async function buscarPrimeiraFotoAcademia(academiaId: string | number) {
  const fotos = await buscarFotosAcademia(academiaId);

  if (!fotos || fotos.length === 0) {
    return null;
  }

  const fotoAtiva =
    fotos.find((foto) => foto.statusFotoAcademia === 'ATIVO') || fotos[0];

  return fotoAtiva;
}

// FAVORITOS
// Importante:
// No seu backend, esta rota retorna diretamente uma lista de Academia,
// e não uma lista de Favorito.
// Rota: GET /favoritos/usuario/{usuarioId}
export async function buscarFavoritosDoUsuario(usuarioId: string | number) {
  return request<Academia[]>(`/favoritos/usuario/${usuarioId}`);
}

// Favorita ou desfavorita uma academia.
// Rota: POST /favoritos/toggle?usuarioId={usuarioId}&academiaId={academiaId}
export async function alternarFavoritoNoBanco(
  usuarioId: string | number,
  academiaId: string | number
) {
  return request<{ favoritado: boolean }>(
    `/favoritos/toggle?usuarioId=${usuarioId}&academiaId=${academiaId}`,
    {
      method: 'POST',
    }
  );
}

// Como o backend já retorna Academia[], basta pegar o id de cada academia.
export function extrairIdsAcademiasFavoritas(academiasFavoritas: Academia[]) {
  return academiasFavoritas.map((academia) => String(academia.id));
}

// AVALIAÇÕES
export type Avaliacao = {
  id: string | number;
  comentario?: string;
  nota: number;
  dataCadastro?: string;
  statusAvaliacao?: string;

  // Campos que vêm do AvaliacaoDTO do backend.
  academiaId?: string | number;
  academiaNome?: string;
  nomeAcademia?: string;

  usuarioId?: string | number;
  usuarioNome?: string;
  nomeUsuario?: string;

  // Mantemos estes campos também por segurança,
  // caso alguma resposta antiga venha com objeto usuario/academia.
  usuario?: {
    id: string | number;
    nome?: string;
    username?: string;
  };

  academia?: {
    id: string | number;
    nome?: string;
  };
};

// Busca as avaliações de uma academia.
//
// Backend:
// GET /avaliacoes/academia/{academiaId}
//
// Também aceita usuarioId:
// GET /avaliacoes/academia/{academiaId}?usuarioId={usuarioId}
//
// O usuarioId é importante porque o backend pode retornar a avaliação
// do próprio usuário mesmo em casos específicos, igual acontece no Web.
export async function buscarAvaliacoesDaAcademia(
  academiaId: string | number,
  usuarioId?: string | number
) {
  const queryUsuario = usuarioId ? `?usuarioId=${usuarioId}` : '';

  return request<Avaliacao[]>(
    `/avaliacoes/academia/${academiaId}${queryUsuario}`
  );
}

// Cria ou edita uma avaliação.
//
// Regra do backend:
// Se o usuário ainda não avaliou, cria uma avaliação nova.
// Se o usuário já avaliou essa academia, atualiza a avaliação existente.
// Se a avaliação estava INATIVA, ela volta como ATIVO.
export async function criarAvaliacao(
  usuarioId: string | number,
  academiaId: string | number,
  dados: {
    nota: number;
    comentario: string;
  }
) {
  return request<Avaliacao>(
    `/avaliacoes?usuarioId=${usuarioId}&academiaId=${academiaId}`,
    {
      method: 'POST',
      body: JSON.stringify({
        nota: dados.nota,
        comentario: dados.comentario,
      }),
    }
  );
}

// Inativa a avaliação do usuário.
//
// Backend:
// PUT /avaliacoes/{avaliacaoId}/inativar?usuarioId={usuarioId}
//
// Importante:
// Isso NÃO apaga do banco.
// Apenas muda o status para INATIVO, igual ao Web.
export async function inativarAvaliacao(
  avaliacaoId: string | number,
  usuarioId: string | number
) {
  return request<void>(
    `/avaliacoes/${avaliacaoId}/inativar?usuarioId=${usuarioId}`,
    {
      method: 'PUT',
    }
  );
}

// Pega o nome do usuário que fez a avaliação.
//
// O backend atual usa DTO, então normalmente vem como nomeUsuario.
// Mas deixamos fallback para usuario.nome e usuario.username também.
export function getNomeUsuarioAvaliacao(avaliacao: Avaliacao) {
  return (
    avaliacao.nomeUsuario ||
    avaliacao.usuarioNome ||
    avaliacao.usuario?.nome ||
    avaliacao.usuario?.username ||
    'Usuário'
  );
}

// Descobre se uma avaliação pertence ao usuário logado.
export function avaliacaoPertenceAoUsuario(
  avaliacao: Avaliacao,
  usuarioId?: string | number
) {
  if (!usuarioId) {
    return false;
  }

  const idUsuarioAvaliacao =
    avaliacao.usuarioId ||
    avaliacao.usuario?.id;

  return String(idUsuarioAvaliacao) === String(usuarioId);
}