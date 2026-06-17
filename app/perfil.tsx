import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
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

import BottomTabBar from '../components/BottomTabBar';

import {
  atualizarFotoPerfil,
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

  // Guarda os dados do usuário logado.
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Campos editáveis do perfil.
  const [nome, setNome] = useState('');
  const [cep, setCep] = useState('');

  // Controla se Nome/CEP estão em modo edição.
  const [editando, setEditando] = useState(false);

  // Estados de carregamento.
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // Mensagem exibida na tela.
  const [mensagem, setMensagem] = useState('');

  // Usado para forçar atualização da foto após trocar.
  // Isso evita que o app mostre imagem antiga em cache.
  const [fotoVersao, setFotoVersao] = useState(Date.now());

  const nomeUsuario = formatarNomeUsuario(usuario);

  // URL da foto do usuário.
  // O &mobile muda quando a foto é alterada, forçando recarregamento.
  const fotoUrlBase = getFotoUsuarioUrl(usuario?.id);
  const fotoUrl = fotoUrlBase ? `${fotoUrlBase}&mobile=${fotoVersao}` : null;

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

          // Busca o usuário atualizado no banco.
          const usuarioBanco = await buscarUsuarioPorId(usuarioLocal.id);

          // Atualiza o AsyncStorage para manter o app sincronizado.
          await AsyncStorage.setItem('usuario', JSON.stringify(usuarioBanco));

          setUsuario(usuarioBanco);
          setNome(usuarioBanco.nome || '');
          setCep(formatarCep(usuarioBanco.cep || ''));

          // Atualiza a versão da foto quando entra na tela.
          setFotoVersao(Date.now());
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

  // Abre a galeria, seleciona uma imagem e envia para o backend.
  async function escolherFotoPerfil() {
    setMensagem('');

    if (!usuario?.id) {
      setMensagem('Usuário não encontrado. Faça login novamente.');
      return;
    }

    // Pede permissão para acessar a galeria.
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      setMensagem('Permissão negada para acessar suas fotos.');
      return;
    }

    // Abre a galeria para escolher a imagem.
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    // Se o usuário cancelar, não acontece nada.
    if (resultado.canceled) {
      return;
    }

    const imagem = resultado.assets[0];

    if (!imagem?.uri) {
      setMensagem('Não foi possível carregar a imagem selecionada.');
      return;
    }

    try {
      setSalvandoFoto(true);

      // Envia a foto para:
      // PUT /usuarios/{id}/foto
      await atualizarFotoPerfil(
        usuario.id,
        imagem.uri,
        imagem.mimeType || 'image/jpeg'
      );

      // Atualiza a imagem no Mobile imediatamente.
      setFotoVersao(Date.now());

      // Busca novamente o usuário atualizado.
      const usuarioAtualizado = await buscarUsuarioPorId(usuario.id);

      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));

      setUsuario(usuarioAtualizado);
      setMensagem('Foto de perfil atualizada!');
    } catch (error) {
      console.error(error);

      // Mostra a mensagem real do backend quando existir.
      if (error instanceof Error) {
        setMensagem(error.message);
      } else {
        setMensagem('Erro ao atualizar foto de perfil.');
      }
    } finally {
      setSalvandoFoto(false);
    }
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

      // Atualiza nome e CEP no banco.
      const usuarioAtualizado = await atualizarNomeECepUsuario(
        usuario.id,
        nome,
        cepLimpo
      );

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

  async function sair() {
    await AsyncStorage.removeItem('usuario');
    router.replace('/login');
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
          paddingBottom: 130,
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

          <TouchableOpacity
            onPress={escolherFotoPerfil}
            disabled={salvandoFoto}
            style={{
              backgroundColor: salvandoFoto ? '#9a4d12' : '#f97316',
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 14,
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {salvandoFoto ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color="#fff" />

                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    marginLeft: 8,
                  }}
                >
                  Alterar foto
                </Text>
              </>
            )}
          </TouchableOpacity>

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
              color:
                mensagem.includes('atualizada') ||
                mensagem.includes('atualizado')
                  ? '#86efac'
                  : '#ffb4b4',
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
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
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
              marginBottom: 12,
            }}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Salvar Alterações
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={sair}
          style={{
            backgroundColor: '#111',
            padding: 16,
            borderRadius: 15,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#333',
          }}
        >
          <Text
            style={{
              color: '#ffb4b4',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            Sair da conta
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar />
    </KeyboardAvoidingView>
  );
}