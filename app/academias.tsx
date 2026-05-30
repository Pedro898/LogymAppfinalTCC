import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { academiasLocais, getAcademiaImagem } from '@/constants/academias';
import { formatarNomeUsuario, type Usuario } from '@/lib/api';

export default function Academias() {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function carregarDadosLocais() {
        const [favoritosSalvos, usuarioSalvo] = await Promise.all([
          AsyncStorage.getItem('favoritos'),
          AsyncStorage.getItem('usuario'),
        ]);

        setFavoritos(favoritosSalvos ? JSON.parse(favoritosSalvos) : []);
        setUsuario(usuarioSalvo ? JSON.parse(usuarioSalvo) : null);
      }

      carregarDadosLocais();
    }, [])
  );

  const academiasFiltradas = academiasLocais.filter((academia) => {
    const texto = `${academia.nome} ${academia.endereco} ${academia.cidade}`.toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  async function alternarFavorito(id: string) {
    const novosFavoritos = favoritos.includes(id)
      ? favoritos.filter((favoritoId) => favoritoId !== id)
      : [...favoritos, id];

    setFavoritos(novosFavoritos);
    await AsyncStorage.setItem('favoritos', JSON.stringify(novosFavoritos));
  }

  async function sair() {
    await AsyncStorage.removeItem('usuario');
    router.replace('/login');
  }

  const nomeUsuario = formatarNomeUsuario(usuario);

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#000',
      paddingTop: 20,
      paddingHorizontal: 15,
    }}>
      {menuAberto && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 260,
          height: '100%',
          backgroundColor: '#111111',
          borderRightWidth: 2,
          borderRightColor: '#f97316',
          zIndex: 999,
          paddingTop: 80,
          paddingHorizontal: 15,
        }}>
          <TouchableOpacity
            onPress={() => setMenuAberto(false)}
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 1000,
            }}
          >
            <Ionicons name="close-outline" size={35} color="white" />
          </TouchableOpacity>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 30,
          }}>
            <Ionicons name="person-circle-outline" size={55} color="#fff" />
            <View style={{ marginLeft: 10 }}>
              <Text style={{
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 20,
              }}>
                Olá, {nomeUsuario}
              </Text>
              <Text style={{ color: '#ccc' }}>{usuario?.username || 'logym@app'}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/perfil')}
            style={{
              backgroundColor: '#fff',
              padding: 10,
              borderRadius: 18,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="person-outline" size={24} color="#000" />
            <Text style={{ fontWeight: 'bold', fontSize: 15, marginLeft: 10 }}>
              MEU PERFIL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/favoritos')}
            style={{
              backgroundColor: '#fff',
              padding: 10,
              borderRadius: 18,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="star" size={20} color="#facc15" />
            <Text style={{ fontWeight: 'bold', fontSize: 15, marginLeft: 10 }}>
              FAVORITOS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sair}
            style={{
              backgroundColor: '#fff',
              padding: 10,
              borderRadius: 18,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#000" />
            <Text style={{ fontWeight: 'bold', fontSize: 15, marginLeft: 10 }}>
              SAIR
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: -40,
      }}>
        <TouchableOpacity
          onPress={() => setMenuAberto(!menuAberto)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="person-circle-outline" size={40} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 5 }}>{nomeUsuario}</Text>
        </TouchableOpacity>

        <Image
          source={require('../assets/images/logo.png')}
          style={{
            width: 550,
            height: 150,
            marginLeft: 'auto',
            marginRight: -10,
          }}
          resizeMode="contain"
        />
      </View>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginBottom: 15,
      }}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          placeholder="Localizar academias"
          placeholderTextColor="#888"
          value={busca}
          onChangeText={setBusca}
          style={{ flex: 1, color: '#fff', marginLeft: 10 }}
        />
        <Ionicons name="ellipsis-vertical" size={20} color="#888" />
      </View>

      <FlatList
        data={academiasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/detalhes', params: { id: item.id } })}
            style={{
              flexDirection: 'row',
              backgroundColor: '#0a0a0a',
              borderRadius: 20,
              marginBottom: 15,
              overflow: 'hidden',
            }}
          >
            <Image source={getAcademiaImagem(item)} style={{ width: 120, height: 120 }} />

            <View style={{ flex: 1, padding: 10 }}>
              <Text style={{ color: '#f97316', fontSize: 18, fontWeight: 'bold' }}>
                {item.nome}
              </Text>
              <Text style={{ color: '#ccc', marginTop: 5 }}>{item.endereco}</Text>
              <Text style={{ color: '#ccc' }}>{item.cidade}</Text>
              <Text style={{ color: '#f97316', marginTop: 5 }}>{item.cep}</Text>
            </View>

            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                alternarFavorito(item.id);
              }}
              style={{ justifyContent: 'flex-end', padding: 10 }}
            >
              <Ionicons
                name={favoritos.includes(item.id) ? 'star' : 'star-outline'}
                size={24}
                color="#facc15"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
