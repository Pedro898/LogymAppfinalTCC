import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import BottomTabBar from '../components/BottomTabBar';

import {
  alternarFavoritoNoBanco,
  buscarFavoritosDoUsuario,
  buscarPrimeiraFotoAcademia,
  getFotoAcademiaUrl,
  type Academia,
  type Usuario,
} from '@/lib/api';

type AcademiaFavorita = Academia & {
  fotoUrl?: string | null;
};

function getImagemAcademia(academia: AcademiaFavorita) {
  if (academia.fotoUrl) {
    return { uri: academia.fotoUrl };
  }

  return require('../assets/images/gym1.jpeg');
}

export default function Favoritos() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [academiasFavoritas, setAcademiasFavoritas] = useState<AcademiaFavorita[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function carregarFavoritos() {
        try {
          setCarregando(true);
          setErro('');

          const usuarioSalvo = await AsyncStorage.getItem('usuario');

          const usuarioLogado: Usuario | null = usuarioSalvo
            ? JSON.parse(usuarioSalvo)
            : null;

          setUsuario(usuarioLogado);

          if (!usuarioLogado?.id) {
            setAcademiasFavoritas([]);
            setErro('Usuário não encontrado. Faça login novamente.');
            return;
          }

          const academiasBanco = await buscarFavoritosDoUsuario(usuarioLogado.id);

          const academiasComFotos = await Promise.all(
            academiasBanco.map(async (academia) => {
              try {
                const primeiraFoto = await buscarPrimeiraFotoAcademia(academia.id);

                return {
                  ...academia,
                  fotoUrl: primeiraFoto
                    ? getFotoAcademiaUrl(primeiraFoto.id)
                    : null,
                };
              } catch (error) {
                console.error(
                  `Erro ao buscar foto da academia favorita ${academia.id}:`,
                  error
                );

                return {
                  ...academia,
                  fotoUrl: null,
                };
              }
            })
          );

          setAcademiasFavoritas(academiasComFotos);
        } catch (error) {
          console.error(error);
          setErro('Erro ao carregar favoritos do banco.');
        } finally {
          setCarregando(false);
        }
      }

      carregarFavoritos();
    }, [])
  );

  async function removerFavorito(academiaId: string | number) {
    if (!usuario?.id) {
      return;
    }

    const idString = String(academiaId);
    const listaAnterior = academiasFavoritas;

    setAcademiasFavoritas((listaAtual) =>
      listaAtual.filter((academia) => String(academia.id) !== idString)
    );

    try {
      await alternarFavoritoNoBanco(usuario.id, academiaId);
    } catch (error) {
      console.error('Erro ao remover favorito do banco:', error);
      setAcademiasFavoritas(listaAnterior);
      setErro('Erro ao remover favorito do banco.');
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        paddingTop: 60,
        paddingHorizontal: 15,
        paddingBottom: 86,
      }}
    >
      <TouchableOpacity
        onPress={() => router.replace('/academias')}
        style={{ marginBottom: 25 }}
      >
        <Ionicons name="arrow-back-outline" size={35} color="#f97316" />
      </TouchableOpacity>

      <Text
        style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 25,
        }}
      >
        Academias Favoritas
      </Text>

      {carregando ? (
        <View style={{ marginTop: 40 }}>
          <ActivityIndicator color="#f97316" />

          <Text
            style={{
              color: '#fff',
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            Carregando favoritos do banco...
          </Text>
        </View>
      ) : erro ? (
        <Text style={{ color: '#ffb4b4', fontSize: 16 }}>
          {erro}
        </Text>
      ) : academiasFavoritas.length === 0 ? (
        <Text style={{ color: '#ccc', fontSize: 16 }}>
          Você ainda não favoritou nenhuma academia.
        </Text>
      ) : (
        <FlatList
          data={academiasFavoritas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 18 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/detalhes',
                  params: { id: String(item.id) },
                })
              }
              style={{
                flexDirection: 'row',
                backgroundColor: '#0a0a0a',
                borderRadius: 20,
                marginBottom: 15,
                overflow: 'hidden',
              }}
            >
              <Image
                source={getImagemAcademia(item)}
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: '#111',
                }}
              />

              <View style={{ flex: 1, padding: 10 }}>
                <Text
                  style={{
                    color: '#f97316',
                    fontSize: 18,
                    fontWeight: 'bold',
                  }}
                >
                  {item.nome}
                </Text>

                <Text style={{ color: '#ccc', marginTop: 5 }}>
                  {item.endereco}
                  {item.numero ? `, ${item.numero}` : ''}
                </Text>

                <Text style={{ color: '#ccc' }}>
                  {item.bairro ? `${item.bairro} - ` : ''}
                  {item.cidade}
                  {item.estado ? `, ${item.estado}` : ''}
                </Text>

                <Text style={{ color: '#f97316', marginTop: 5 }}>
                  CEP: {item.cep}
                </Text>

                {item.nota !== null && item.nota !== undefined ? (
                  <Text style={{ color: '#fff', marginTop: 4 }}>
                    {Number(item.nota).toFixed(1)} ⭐
                  </Text>
                ) : (
                  <Text style={{ color: '#777', marginTop: 4 }}>
                    Sem avaliações
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  removerFavorito(item.id);
                }}
                style={{
                  justifyContent: 'flex-end',
                  padding: 10,
                }}
              >
                <Ionicons name="star" size={26} color="#facc15" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <BottomTabBar />
    </View>
  );
}