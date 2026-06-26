import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import BottomTabBar from '../components/BottomTabBar';
import UserAvatarPlaceholder from '../components/UserAvatarPlaceholder';

import {
  alternarFavoritoNoBanco,
  buscarAcademias,
  buscarAcademiasProximasDoUsuario,
  buscarFavoritosDoUsuario,
  buscarPrimeiraFotoAcademia,
  extrairIdsAcademiasFavoritas,
  formatarNomeUsuario,
  getFotoAcademiaUrl,
  getFotoUsuarioUrl,
  normalizarCategorias,
  normalizarFacilidades,
  type Academia,
  type Usuario,
} from '@/lib/api';

const filtrosRapidos = [
  'Musculação',
  'Crossfit',
  'Pilates',
  'Yoga',
  'Funcional',
  'Natação',
  'Lutas',
  'Dança',
  'Spinning',
  'Wi-Fi',
  'Estacionamento',
  'Acessibilidade',
  'Ar Condicionado',
  'Vestiário',
];

type AcademiaComFoto = Academia & {
  fotoUrl?: string | null;
};

function getInicialAcademia(nome?: string) {
  const nomeLimpo = String(nome || 'A').trim();

  if (!nomeLimpo) {
    return 'A';
  }

  return nomeLimpo.charAt(0).toUpperCase();
}

function AcademiaSemFoto({ nome }: { nome?: string }) {
  return (
    <LinearGradient
      colors={['#1a0700', '#f97316']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 33,
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: '#f97316',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#000',
            fontSize: 34,
            fontWeight: '900',
          }}
        >
          {getInicialAcademia(nome)}
        </Text>
      </View>
    </LinearGradient>
  );
}

export default function Academias() {
  const router = useRouter();

  const [busca, setBusca] = useState('');
  const [filtrosSelecionados, setFiltrosSelecionados] = useState<string[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Quando a foto do usuário não existe no banco, a URL ainda é criada por causa do usuario.id.
  // Então usamos esse controle para trocar para o bonequinho quando a imagem falhar.
  const [fotoUsuarioErro, setFotoUsuarioErro] = useState(false);

  const [academias, setAcademias] = useState<AcademiaComFoto[]>([]);
  const [carregandoAcademias, setCarregandoAcademias] = useState(false);
  const [erroAcademias, setErroAcademias] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function carregarDados() {
        const usuarioSalvo = await AsyncStorage.getItem('usuario');

        const usuarioLogado: Usuario | null = usuarioSalvo
          ? JSON.parse(usuarioSalvo)
          : null;

        setUsuario(usuarioLogado);
        setFotoUsuarioErro(false);

        try {
          setCarregandoAcademias(true);
          setErroAcademias('');

          if (usuarioLogado?.id) {
            try {
              const academiasFavoritas = await buscarFavoritosDoUsuario(
                usuarioLogado.id
              );

              setFavoritos(extrairIdsAcademiasFavoritas(academiasFavoritas));
            } catch (error) {
              console.error('Erro ao buscar favoritos do banco:', error);
              setFavoritos([]);
            }
          } else {
            setFavoritos([]);
          }

          const lista = usuarioLogado?.id
            ? await buscarAcademiasProximasDoUsuario(usuarioLogado.id)
            : await buscarAcademias();

          const listaComFotos = await Promise.all(
            lista.map(async (academia) => {
              try {
                const primeiraFoto = await buscarPrimeiraFotoAcademia(
                  academia.id
                );

                return {
                  ...academia,
                  fotoUrl: primeiraFoto
                    ? getFotoAcademiaUrl(primeiraFoto.id)
                    : null,
                };
              } catch (error) {
                console.error(
                  `Erro ao buscar foto da academia ${academia.id}:`,
                  error
                );

                return {
                  ...academia,
                  fotoUrl: null,
                };
              }
            })
          );

          setAcademias(listaComFotos);
        } catch (error) {
          console.error(error);
          setErroAcademias('Não foi possível carregar as academias do banco.');
        } finally {
          setCarregandoAcademias(false);
        }
      }

      carregarDados();
    }, [])
  );

  function alternarFiltro(filtro: string) {
    setFiltrosSelecionados((listaAtual) => {
      if (listaAtual.includes(filtro)) {
        return listaAtual.filter((item) => item !== filtro);
      }

      return [...listaAtual, filtro];
    });
  }

  function limparFiltros() {
    setFiltrosSelecionados([]);
    setBusca('');
  }

  const academiasFiltradas = academias.filter((academia) => {
    const categoriasAcademia = normalizarCategorias(academia.categorias);
    const facilidadesAcademia = normalizarFacilidades(academia.facilidades);

    const texto = `
      ${academia.nome}
      ${academia.endereco}
      ${academia.numero || ''}
      ${academia.bairro || ''}
      ${academia.cidade}
      ${academia.estado || ''}
      ${academia.cep}
      ${academia.descricao || ''}
      ${academia.categorias || ''}
      ${academia.facilidades || ''}
    `.toLowerCase();

    const correspondeBusca = texto.includes(busca.toLowerCase());

    const correspondeFiltros = filtrosSelecionados.every((filtro) => {
      return (
        categoriasAcademia.includes(filtro) ||
        facilidadesAcademia.includes(filtro)
      );
    });

    return correspondeBusca && correspondeFiltros;
  });

  async function alternarFavorito(id: string | number) {
    if (!usuario?.id) {
      console.log('Usuário não encontrado para favoritar.');
      return;
    }

    const idString = String(id);
    const favoritosAnteriores = favoritos;

    const novosFavoritos = favoritos.includes(idString)
      ? favoritos.filter((favoritoId) => favoritoId !== idString)
      : [...favoritos, idString];

    setFavoritos(novosFavoritos);

    try {
      await alternarFavoritoNoBanco(usuario.id, id);
    } catch (error) {
      console.error('Erro ao atualizar favorito no banco:', error);
      setFavoritos(favoritosAnteriores);
    }
  }

  const nomeUsuario = formatarNomeUsuario(usuario);
  const fotoUsuarioUrl = getFotoUsuarioUrl(usuario?.id);
  const deveMostrarFotoUsuario = fotoUsuarioUrl && !fotoUsuarioErro;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        paddingTop: 20,
        paddingHorizontal: 15,
        paddingBottom: 86,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: -40,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            maxWidth: 160,
          }}
        >
          {deveMostrarFotoUsuario ? (
            <Image
              source={{ uri: fotoUsuarioUrl }}
              onError={() => setFotoUsuarioErro(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#222',
              }}
            />
          ) : (
            <UserAvatarPlaceholder size={40} />
          )}

          <Text
            numberOfLines={1}
            style={{
              color: '#fff',
              marginLeft: 5,
              flexShrink: 1,
            }}
          >
            {nomeUsuario}
          </Text>
        </View>

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

      <View style={{ marginBottom: 15 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#111',
            borderRadius: 20,
            paddingHorizontal: 15,
          }}
        >
          <Ionicons name="search" size={20} color="#888" />

          <TextInput
            placeholder="Localizar academias"
            placeholderTextColor="#888"
            value={busca}
            onChangeText={setBusca}
            style={{ flex: 1, color: '#fff', marginLeft: 10 }}
          />
        </View>

        <View
          style={{
            marginTop: 12,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            Filtros rápidos
          </Text>

          {(filtrosSelecionados.length > 0 || busca.length > 0) && (
            <TouchableOpacity onPress={limparFiltros}>
              <Text
                style={{
                  color: '#f97316',
                  fontWeight: 'bold',
                }}
              >
                Limpar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingBottom: 8,
          }}
        >
          {filtrosRapidos.map((filtro) => {
            const selecionado = filtrosSelecionados.includes(filtro);

            return (
              <TouchableOpacity
                key={filtro}
                onPress={() => alternarFiltro(filtro)}
                style={{
                  backgroundColor: selecionado ? '#f97316' : '#111',
                  borderColor: selecionado ? '#f97316' : '#333',
                  borderRadius: 18,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {selecionado ? (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color="#000"
                    style={{ marginRight: 4 }}
                  />
                ) : null}

                <Text
                  style={{
                    color: selecionado ? '#000' : '#fff',
                    fontWeight: 'bold',
                  }}
                >
                  {filtro}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text
          style={{
            color: '#ccc',
            fontSize: 14,
            marginTop: 2,
          }}
        >
          Resultado: {academiasFiltradas.length} academia(s)
        </Text>

        {filtrosSelecionados.length > 0 ? (
          <Text
            style={{
              color: '#f97316',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Filtros: {filtrosSelecionados.join(' + ')}
          </Text>
        ) : null}
      </View>

      {carregandoAcademias ? (
        <View style={{ marginTop: 40 }}>
          <ActivityIndicator color="#f97316" />

          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 10 }}>
            Carregando academias do banco...
          </Text>
        </View>
      ) : erroAcademias ? (
        <View style={{ marginTop: 40 }}>
          <Text style={{ color: '#ffb4b4', textAlign: 'center' }}>
            {erroAcademias}
          </Text>

          <Text style={{ color: '#ccc', textAlign: 'center', marginTop: 8 }}>
            Verifique se o backend está rodando e se existe academia ativa no
            banco.
          </Text>
        </View>
      ) : academiasFiltradas.length === 0 ? (
        <View style={{ marginTop: 40 }}>
          <Text style={{ color: '#ccc', textAlign: 'center' }}>
            Nenhuma academia encontrada com esses filtros.
          </Text>
        </View>
      ) : (
        <FlatList
          data={academiasFiltradas}
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
              {item.fotoUrl ? (
                <Image
                  source={{ uri: item.fotoUrl }}
                  style={{ width: 120, height: 120 }}
                />
              ) : (
                <AcademiaSemFoto nome={item.nome} />
              )}

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
                  alternarFavorito(item.id);
                }}
                style={{ justifyContent: 'flex-end', padding: 10 }}
              >
                <Ionicons
                  name={
                    favoritos.includes(String(item.id)) ? 'star' : 'star-outline'
                  }
                  size={24}
                  color="#facc15"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <BottomTabBar />
    </View>
  );
}