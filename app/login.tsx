import { login, type Usuario } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Login() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Descobre automaticamente a URL da Web.
  // No navegador usa localhost.
  // No celular físico tenta usar o IP do computador pelo Expo.
  function buscarWebUrl() {
    if (process.env.EXPO_PUBLIC_WEB_URL) {
      return process.env.EXPO_PUBLIC_WEB_URL.replace(/\/$/, '');
    }

    if (Platform.OS === 'web') {
      return 'http://localhost:5173';
    }

    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri;

    const host = hostUri?.split(':')[0];

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5173`;
    }

    return 'http://localhost:5173';
  }

  const WEB_URL = buscarWebUrl();

  function abrirWebLoginComRedirect(redirect: string) {
    const redirectFormatado = encodeURIComponent(redirect);

    Linking.openURL(`${WEB_URL}/login?redirect=${redirectFormatado}`);
  }

  function abrirCadastroWeb() {
    Linking.openURL(`${WEB_URL}/cadastrar`);
  }

  function criarUsuarioLocal(): Usuario {
    const usuarioDigitado = username.trim();

    const nome = usuarioDigitado.includes('@')
      ? usuarioDigitado.split('@')[0]
      : usuarioDigitado;

    return {
      id: usuarioDigitado,
      nome: nome || 'Usuário',
      username: usuarioDigitado,
      cep: '',
    };
  }

  async function entrar() {
    setErro('');

    if (!username || !password) {
      setErro('Preencha usuário e senha.');
      return;
    }

    try {
      setCarregando(true);

      const resposta = await login(username, password);

      const usuarioBackend = resposta.usuario || criarUsuarioLocal();

      const usuarioParaSalvar: Usuario = {
        id: usuarioBackend.id,
        nome: usuarioBackend.nome || usuarioBackend.username || username,
        username: usuarioBackend.username || username,
        nivelAcesso: usuarioBackend.nivelAcesso,
        statusUsuario: usuarioBackend.statusUsuario,
        cep: usuarioBackend.cep || '',
      };

      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioParaSalvar));

      router.replace('/academias');
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : '';

      setErro(
        mensagem.includes('Failed to fetch') ||
          mensagem.includes('Network request failed') ||
          mensagem.includes('Tempo esgotado')
          ? 'Não foi possível conectar ao backend. Confira o endereço da API.'
          : 'Usuário ou senha inválidos.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        padding: 25,
      }}
    >
      <Image
        source={require('../assets/images/logo.png')}
        style={{
          width: 290,
          height: 290,
          alignSelf: 'center',
          marginBottom: -30,
          shadowColor: '#f97316',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 20,
        }}
      />

      <View
        style={{
          backgroundColor: '#000000',
          padding: 20,
          borderRadius: 25,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 10,
        }}
      >
        <Text style={{ color: '#ffffff', marginBottom: 5 }}>
          Usuário
        </Text>

        <TextInput
          placeholder="Digite seu usuário"
          placeholderTextColor="#ffffff"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            backgroundColor: '#8b8a8a',
            color: '#fff',
            padding: 15,
            borderRadius: 12,
            marginBottom: 15,
          }}
        />

        <Text style={{ color: '#ffffff', marginBottom: 5 }}>
          Senha
        </Text>

        <TextInput
          placeholder="Digite sua senha"
          placeholderTextColor="#ffffff"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            backgroundColor: '#8b8a8a',
            color: '#fff',
            padding: 15,
            borderRadius: 12,
            marginBottom: 10,
          }}
        />

        {erro ? (
          <Text
            style={{
              color: '#ffb4b4',
              marginBottom: 12,
            }}
          >
            {erro}
          </Text>
        ) : null}

        <Text
          onPress={() => abrirWebLoginComRedirect('/esqueci-minha-senha')}
          style={{
            color: '#f97316',
            textAlign: 'right',
            marginBottom: 16,
            fontWeight: 'bold',
          }}
        >
          Esqueceu a senha?
        </Text>

        <TouchableOpacity
          onPress={entrar}
          disabled={carregando}
          style={{
            backgroundColor: carregando ? '#9a4d12' : '#f97316',
            padding: 18,
            borderRadius: 15,
            alignItems: 'center',
            shadowColor: '#f97316',
            shadowOpacity: 0.6,
            shadowRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            color: '#fff',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Ainda não possui uma conta?{' '}

          <Text
            onPress={abrirCadastroWeb}
            style={{
              color: '#f97316',
              fontWeight: 'bold',
              textDecorationLine: 'underline',
            }}
          >
            Cadastre-se
          </Text>
        </Text>
      </View>
    </View>
  );
}