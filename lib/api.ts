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

function removerBarraFinal(url: string) {
  return url.replace(/\/$/, '');
}

function buscarApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return removerBarraFinal(process.env.EXPO_PUBLIC_API_URL);
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8080';
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  const host = hostUri?.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8080`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  return 'http://localhost:8080';
}

export const API_URL = buscarApiUrl();

const REQUEST_TIMEOUT_MS = 10000;

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

export function formatarNomeUsuario(usuario: Usuario | null) {
  const primeiroNome = (usuario?.nome || usuario?.username || 'Usuário')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

  return primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
}

export function limparCep(cep: string) {
  return String(cep || '').replace(/\D/g, '').slice(0, 8);
}

export function formatarCep(cep?: string) {
  const numeros = limparCep(cep || '');

  if (numeros.length <= 5) {
    return numeros;
  }

  return numeros.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

export function getFotoUsuarioUrl(usuarioId?: string | number) {
  if (!usuarioId) {
    return null;
  }

  // Date.now evita cache antigo quando a foto é alterada.
  return `${API_URL}/usuarios/${usuarioId}/foto?v=${Date.now()}`;
}

export function normalizarCategorias(categorias?: string) {
  return String(categorias || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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

export async function atualizarFotoPerfil(
  id: string | number,
  imageUri: string,
  mimeType = 'image/jpeg'
) {
  const formData = new FormData();

  const extensao = mimeType.includes('png') ? 'png' : 'jpg';

  formData.append('file', {
    uri: imageUri,
    name: `foto-perfil-${id}.${extensao}`,
    type: mimeType,
  } as any);

  const resposta = await fetch(`${API_URL}/usuarios/${id}/foto`, {
    method: 'PUT',
    body: formData,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      // Não colocar Content-Type aqui.
      // O fetch monta o multipart/form-data automaticamente.
    },
  });

  if (!resposta.ok) {
    const mensagem = await resposta.text();
    throw new Error(mensagem || 'Erro ao atualizar foto de perfil.');
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

  // Dependendo do backend, pode vir usuário completo ou só alguns campos.
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
// Rota: GET /avaliacoes/academia/{academiaId}
export async function buscarAvaliacoesDaAcademia(academiaId: string | number) {
  return request<Avaliacao[]>(`/avaliacoes/academia/${academiaId}`);
}

// Cria uma avaliação para uma academia.
// Rota: POST /avaliacoes?usuarioId={usuarioId}&academiaId={academiaId}
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

export function getNomeUsuarioAvaliacao(avaliacao: Avaliacao) {
  return (
    avaliacao.usuario?.nome ||
    avaliacao.usuario?.username ||
    'Usuário'
  );
}