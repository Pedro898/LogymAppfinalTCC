import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Academia = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  cep: string;
  descricao?: string;
  imagemUrl?: string;
  infos?: string[];
};

export type Usuario = {
  id: string | number;
  nome: string;
  username: string;
  nivelAcesso?: string;
  statusUsuario?: string;
};

export function formatarNomeUsuario(usuario: Usuario | null) {
  const primeiroNome = (usuario?.nome || usuario?.username || 'Usuario')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();

  return primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
}

type LoginResponse = {
  message?: string;
  mensagem?: string;
  usuario?: Usuario;
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

const API_URL = buscarApiUrl();
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
    throw new Error(mensagem || 'Erro na comunicacao com o backend.');
  }

  const texto = await resposta.text();
  return texto ? (JSON.parse(texto) as T) : (undefined as T);
}

export async function login(username: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
  });
}
