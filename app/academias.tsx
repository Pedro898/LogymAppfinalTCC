import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Mesmos filtros rápidos usados no Web.
// Eles misturam categorias e facilidades.
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

// Junta os dados da academia com a foto real carregada do backend.
type AcademiaComFoto = Academia & {
  fotoUrl?: string | null;
};

function getImagemAcademia(academia: AcademiaComFoto) {
  // Se tiver foto no banco, usa foto real.
  if (academia.fotoUrl) {
    return { uri: academia.fotoUrl };
  }

  // Se não tiver foto cadastrada, usa imagem padrão.
  return require('../assets/images/gym1.jpeg');
}

export default function Academias() {
  const router = useRouter();

  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState('');

  // Agora o Mobile permite selecionar vários filtros, igual ao Web.
  const [filtrosSelecionados, setFiltrosSelecionados] = useState<string[]>([]);

  // Favoritos representam IDs vindos do banco.
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
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

        try {
          setCarregandoAcademias(true);
          setErroAcademias('');

          // Busca os favoritos reais do banco.
          if (usuarioLogado?.id) {
            try {
              const academiasFavoritas = await buscarFavoritosDoUsuario(usuarioLogado.id);

              setFavoritos(extrairIdsAcademiasFavoritas(academiasFavoritas));
            } catch (error) {
              console.error('Erro ao buscar favoritos do banco:', error);
              setFavoritos([]);
            }
          } else {
            setFavoritos([]);
          }

          // Busca as academias reais do banco.
          // Se tiver usuário logado, usa a mesma rota de proximidade do backend/Web.
          // Se não tiver usuário logado, busca todas as academias ativas.
          const lista = usuarioLogado?.id
            ? await buscarAcademiasProximasDoUsuario(usuarioLogado.id)
            : await buscarAcademias();

          // Para cada academia, busca a primeira foto cadastrada.
          const listaComFotos = await Promise.all(
            lista.map(async (academia) => {
              try {
                const primeiraFoto = await buscarPrimeiraFotoAcademia(academia.id);

                return {
                  ...academia,
                  fotoUrl: primeiraFoto
                    ? getFotoAcademiaUrl(primeiraFoto.id)
                    : null,
                };
              } catch (error) {
                console.error(`Erro ao buscar foto da academia ${academia.id}:`, error);

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

    // Cada filtro selecionado precisa existir em categorias OU facilidades.
    // Exemplo:
    // Musculação + Wi-Fi + Estacionamento
    // A academia precisa conter todos esses filtros.
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

    // Atualiza visualmente antes do backend responder.
    const favoritosAnteriores = favoritos;

    const novosFavoritos = favoritos.includes(idString)
      ? favoritos.filter((favoritoId) => favoritoId !== idString)
      : [...favoritos, idString];

    setFavoritos(novosFavoritos);

    try {
      // Salva a alteração no banco.
      await alternarFavoritoNoBanco(usuario.id, id);
    } catch (error) {
      console.error('Erro ao atualizar favorito no banco:', error);

      // Se falhar, desfaz a mudança visual.
      setFavoritos(favoritosAnteriores);
    }
  }

  async function sair() {
    await AsyncStorage.removeItem('usuario');
    router.replace('/login');
  }

  const nomeUsuario = formatarNomeUsuario(usuario);
  const fotoUsuarioUrl = getFotoUsuarioUrl(usuario?.id);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        paddingTop: 20,
        paddingHorizontal: 15,
      }}
    >
      {menuAberto && (
        <View
          style={{
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
          }}
        >
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

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 30,
            }}
          >
            {fotoUsuarioUrl ? (
              <Image
                source={{ uri: fotoUsuarioUrl }}
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 28,
                  backgroundColor: '#222',
                }}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={55} color="#fff" />
            )}

            <View style={{ marginLeft: 10 }}>
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 20,
                }}
              >
                Olá, {nomeUsuario}
              </Text>

              <Text style={{ color: '#ccc' }}>
                {usuario?.username || 'logym@app'}
              </Text>
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: -40,
        }}
      >
        <TouchableOpacity
          onPress={() => setMenuAberto(!menuAberto)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {fotoUsuarioUrl ? (
            <Image
              source={{ uri: fotoUsuarioUrl }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#222',
              }}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color="#fff" />
          )}

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
                style={{ width: 120, height: 120 }}
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
    </View>
  );
}