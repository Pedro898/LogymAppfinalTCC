import { login, type Usuario } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  function criarUsuarioLocal(): Usuario {
    const usuarioDigitado = username.trim();
    const nome = usuarioDigitado.includes('@')
      ? usuarioDigitado.split('@')[0]
      : usuarioDigitado;

    return {
      id: usuarioDigitado,
      nome: nome || 'Usuario',
      username: usuarioDigitado,
    };
  }

  async function entrar() {
    setErro('');

    if (!username || !password) {
      setErro('Preencha usuario e senha.');
      return;
    }

    try {
      setCarregando(true);
      const resposta = await login(username, password);
      const usuarioLogado = resposta.usuario || criarUsuarioLocal();

      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioLogado));
      router.replace('/academias');
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : '';
      setErro(
        mensagem.includes('Failed to fetch') ||
          mensagem.includes('Network request failed') ||
          mensagem.includes('Tempo esgotado')
          ? 'Nao foi possivel conectar ao backend. Confira o endereco da API.'
          : 'Usuario ou senha invalidos.'
      );
      setCarregando(false);
      return;
    }
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
      padding: 25
    }}>
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
          shadowRadius: 20
        }}
      />

      <View style={{
        backgroundColor: '#000000',
        padding: 20,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10
      }}>
        <Text style={{ color: '#ffffff', marginBottom: 5 }}>
          Usuario
        </Text>

        <TextInput
          placeholder="Digite seu usuario"
          placeholderTextColor="#ffffff"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={{
            backgroundColor: '#8b8a8a',
            color: '#fff',
            padding: 15,
            borderRadius: 12,
            marginBottom: 15
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
            marginBottom: 10
          }}
        />

        {erro ? (
          <Text style={{
            color: '#ffb4b4',
            marginBottom: 12
          }}>
            {erro}
          </Text>
        ) : null}

        <Text
          onPress={() => Linking.openURL('https://meusite.com/esqueci-senha')}
          style={{
            color: '#f97316',
            textAlign: 'right',
            marginBottom: 20
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
            shadowRadius: 10
          }}
        >
          <Text style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16
          }}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </Text>
        </TouchableOpacity>

        <Text style={{
          color: '#fff',
          marginTop: 20,
          textAlign: 'center'
        }}>
          Ainda nao possui uma conta?{' '}

          <Text
            onPress={() => Linking.openURL('https://meusite.com/cadastro')}
            style={{
              color: '#f97316',
              fontWeight: 'bold',
              textDecorationLine: 'underline'
            }}
          >
            Cadastre-se
          </Text>
        </Text>
      </View>
    </View>
  );
}
