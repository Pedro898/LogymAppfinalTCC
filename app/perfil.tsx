import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  atualizarNomeECepUsuario,
  buscarUsuarioPorId,
  formatarCep,
  formatarNomeUsuario,
  getFotoUsuarioUrl,
  limparCep,
  type Usuario,
} from '@/lib/api';

export default function Perfil() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nome, setNome] = useState('');
  const [cep, setCep] = useState('');
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const nomeUsuario = formatarNomeUsuario(usuario);
  const fotoUrl = getFotoUsuarioUrl(usuario?.id);

  useFocusEffect(
    useCallback(() => {
      async function carregarUsuario() {
        setMensagem('');

        const usuarioSalvo = await AsyncStorage.getItem('usuario');

        if (!usuarioSalvo) {
          setUsuario(null);
          setNome('');
          setCep('');
          return;
        }

        const usuarioLocal: Usuario = JSON.parse(usuarioSalvo);

        setUsuario(usuarioLocal);
        setNome(usuarioLocal.nome || '');
        setCep(formatarCep(usuarioLocal.cep || ''));

        try {
          setCarregando(true);

          // Busca o usuário no banco para trazer o CEP real.
          const usuarioBanco = await buscarUsuarioPorId(usuarioLocal.id);

          await AsyncStorage.setItem('usuario', JSON.stringify(usuarioBanco));

          setUsuario(usuarioBanco);
          setNome(usuarioBanco.nome || '');
          setCep(formatarCep(usuarioBanco.cep || ''));
        } catch (error) {
          console.error(error);
          setMensagem('Não foi possível buscar os dados atualizados do banco.');
        } finally {
          setCarregando(false);
        }
      }

      carregarUsuario();
    }, [])
  );

  function alterarCep(valor: string) {
    setCep(formatarCep(valor));
  }

  async function salvarPerfil() {
    setMensagem('');

    if (!usuario?.id) {
      setMensagem('Usuário não encontrado. Faça login novamente.');
      return;
    }

    if (!nome.trim()) {
      setMensagem('Informe o nome do usuário.');
      return;
    }

    const cepLimpo = limparCep(cep);

    if (cepLimpo.length !== 8) {
      setMensagem('O CEP precisa ter 8 números.');
      return;
    }

    try {
      setSalvando(true);

      // Envia nome e CEP para o backend/banco.
      const usuarioAtualizado = await atualizarNomeECepUsuario(
        usuario.id,
        nome,
        cepLimpo
      );

      // Atualiza também o AsyncStorage para as outras telas usarem o dado novo.
      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));

      setUsuario(usuarioAtualizado);
      setNome(usuarioAtualizado.nome || '');
      setCep(formatarCep(usuarioAtualizado.cep || ''));

      setEditando(false);
      setMensagem('Perfil atualizado!');
    } catch (error) {
      console.error(error);
      setMensagem('Erro ao atualizar nome e CEP no banco.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#000' }}
        contentContainerStyle={{
          paddingTop: 60,
          paddingHorizontal: 25,
          paddingBottom: 60,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.replace('/academias')}
          style={{ marginBottom: 20 }}
        >
          <Ionicons name="arrow-back-outline" size={38} color="#f97316" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 25 }}>
          {fotoUrl ? (
            <Image
              source={{ uri: fotoUrl }}
              style={{
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: '#222',
                borderWidth: 2,
                borderColor: '#f97316',
              }}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={130} color="#fff" />
          )}

          <Text
            style={{
              color: '#fff',
              fontSize: 26,
              fontWeight: 'bold',
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            {nomeUsuario}
          </Text>
        </View>

        <Text
          style={{
            color: '#f97316',
            fontSize: 26,
            fontWeight: 'bold',
            marginBottom: 22,
            alignSelf: 'center',
          }}
        >
          Seus dados pessoais
        </Text>

        {carregando ? (
          <View style={{ marginBottom: 15 }}>
            <ActivityIndicator color="#f97316" />

            <Text
              style={{
                color: '#ccc',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              Buscando dados do banco...
            </Text>
          </View>
        ) : null}

        {mensagem ? (
          <Text
            style={{
              color: mensagem.includes('atualizado') ? '#86efac' : '#ffb4b4',
              marginBottom: 15,
              textAlign: 'center',
            }}
          >
            {mensagem}
          </Text>
        ) : null}

        <Text style={{ color: '#aaa', fontSize: 18, marginBottom: 8 }}>
          Nome
        </Text>

        <TextInput
          value={nome}
          onChangeText={setNome}
          editable={editando}
          placeholder="Digite seu nome"
          placeholderTextColor="#777"
          style={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: 18,
            borderRadius: 18,
            fontSize: 18,
            marginBottom: 22,
            borderWidth: 1,
            borderColor: '#f97316',
            opacity: editando ? 1 : 0.7,
          }}
        />

        <Text style={{ color: '#aaa', fontSize: 18, marginBottom: 8 }}>
          Usuário / E-mail
        </Text>

        <TextInput
          value={usuario?.username || ''}
          editable={false}
          style={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: 18,
            borderRadius: 18,
            fontSize: 18,
            marginBottom: 22,
            borderWidth: 1,
            borderColor: '#333',
            opacity: 0.7,
          }}
        />

        <Text style={{ color: '#aaa', fontSize: 18, marginBottom: 8 }}>
          CEP
        </Text>

        <TextInput
          value={cep}
          onChangeText={alterarCep}
          editable={editando}
          keyboardType="numeric"
          maxLength={9}
          placeholder="00000-000"
          placeholderTextColor="#777"
          style={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: 18,
            borderRadius: 18,
            fontSize: 18,
            marginBottom: 25,
            borderWidth: 1,
            borderColor: '#f97316',
            opacity: editando ? 1 : 0.7,
          }}
        />

        {!editando ? (
          <TouchableOpacity
            onPress={() => {
              setMensagem('');
              setEditando(true);
            }}
            style={{
              backgroundColor: '#f97316',
              padding: 16,
              borderRadius: 15,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 16,
              }}
            >
              Editar Perfil
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={salvarPerfil}
            disabled={salvando}
            style={{
              backgroundColor: salvando ? '#9a4d12' : '#f97316',
              padding: 16,
              borderRadius: 15,
              alignItems: 'center',
            }}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 16,
                }}
              >
                Salvar Alterações
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}