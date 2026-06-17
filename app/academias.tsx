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

import BottomTabBar from '../components/BottomTabBar';

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

// Lista de filtros rápidos igual ao Web.
// Aqui misturamos categorias e facilidades para o usuário filtrar de forma simples.
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

// Tipo usado apenas nesta tela.
// Ele pega todos os dados normais da Academia e adiciona uma fotoUrl opcional.
// A fotoUrl é preenchida depois que buscamos a primeira foto da academia no backend.
type AcademiaComFoto = Academia & {
  fotoUrl?: string | null;
};

// Decide qual imagem será exibida no card da academia.
// Se existir foto real cadastrada no banco, usa ela.
// Se não existir, usa uma imagem padrão local do app.
function getImagemAcademia(academia: AcademiaComFoto) {
  if (academia.fotoUrl) {
    return { uri: academia.fotoUrl };
  }

  return require('../assets/images/gym1.jpeg');
}

export default function Academias() {
  const router = useRouter();

  // Texto digitado na barra de busca.
  const [busca, setBusca] = useState('');

  // Guarda todos os filtros selecionados pelo usuário.
  // Permite selecionar mais de um filtro ao mesmo tempo, igual ao Web.
  const [filtrosSelecionados, setFiltrosSelecionados] = useState<string[]>([]);

  // Guarda os IDs das academias favoritas do usuário logado.
  // Usamos string para facilitar a comparação com String(item.id).
  const [favoritos, setFavoritos] = useState<string[]>([]);

  // Dados do usuário logado, carregados do AsyncStorage.
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Lista de academias reais do backend, já com fotoUrl quando existir.
  const [academias, setAcademias] = useState<AcademiaComFoto[]>([]);

  // Estados usados para controlar carregamento e mensagens de erro.
  const [carregandoAcademias, setCarregandoAcademias] = useState(false);
  const [erroAcademias, setErroAcademias] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function carregarDados() {
        // Busca o usuário salvo localmente após o login.
        // Ele é usado para descobrir o id e chamar rotas específicas do usuário.
        const usuarioSalvo = await AsyncStorage.getItem('usuario');

        const usuarioLogado: Usuario | null = usuarioSalvo
          ? JSON.parse(usuarioSalvo)
          : null;

        setUsuario(usuarioLogado);

        try {
          setCarregandoAcademias(true);
          setErroAcademias('');

          // Se houver usuário logado, busca os favoritos reais no backend.
          // O backend retorna uma lista de academias favoritas.
          if (usuarioLogado?.id) {
            try {
              const academiasFavoritas = await buscarFavoritosDoUsuario(
                usuarioLogado.id
              );

              // Converte a lista de academias favoritas em uma lista só com os IDs.
              // Isso facilita para saber se a estrela deve aparecer preenchida.
              setFavoritos(extrairIdsAcademiasFavoritas(academiasFavoritas));
            } catch (error) {
              console.error('Erro ao buscar favoritos do banco:', error);

              // Se der erro nos favoritos, a tela ainda carrega as academias normalmente.
              setFavoritos([]);
            }
          } else {
            setFavoritos([]);
          }

          // Busca academias do backend.
          // Se tiver usuário logado, usa a rota de academias próximas pelo CEP.
          // Se não tiver usuário logado, busca todas as academias ativas.
          const lista = usuarioLogado?.id
            ? await buscarAcademiasProximasDoUsuario(usuarioLogado.id)
            : await buscarAcademias();

          // Para cada academia, buscamos a primeira foto cadastrada.
          // Assim a lista mostra fotos reais do banco quando existirem.
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

                // Se a foto falhar, mantém a academia na lista com imagem padrão.
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

      // useFocusEffect executa quando a tela entra em foco.
      // Isso ajuda a atualizar favoritos, CEP e ordem das academias quando voltar para esta tela.
      carregarDados();
    }, [])
  );

  // Adiciona ou remove um filtro da lista de filtros selecionados.
  function alternarFiltro(filtro: string) {
    setFiltrosSelecionados((listaAtual) => {
      if (listaAtual.includes(filtro)) {
        return listaAtual.filter((item) => item !== filtro);
      }

      return [...listaAtual, filtro];
    });
  }

  // Limpa a busca por texto e todos os filtros selecionados.
  function limparFiltros() {
    setFiltrosSelecionados([]);
    setBusca('');
  }

  // Aplica os filtros na lista de academias.
  // A academia precisa bater com o texto da busca e com todos os filtros selecionados.
  const academiasFiltradas = academias.filter((academia) => {
    const categoriasAcademia = normalizarCategorias(academia.categorias);
    const facilidadesAcademia = normalizarFacilidades(academia.facilidades);

    // Texto geral usado para a busca.
    // Junta nome, endereço, descrição, categorias e facilidades.
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

    // Para cada filtro selecionado, verifica se ele existe em categorias OU facilidades.
    // Exemplo: Musculação + Wi-Fi.
    // A academia precisa ter Musculação e também Wi-Fi para aparecer.
    const correspondeFiltros = filtrosSelecionados.every((filtro) => {
      return (
        categoriasAcademia.includes(filtro) ||
        facilidadesAcademia.includes(filtro)
      );
    });

    return correspondeBusca && correspondeFiltros;
  });

  // Favorita ou desfavorita uma academia.
  // Primeiro atualiza a tela para ficar rápido.
  // Depois confirma a alteração no backend.
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

      // Se o backend falhar, volta para o estado anterior.
      setFavoritos(favoritosAnteriores);
    }
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

        // Espaço inferior para a lista não ficar escondida atrás da barra inferior.
        paddingBottom: 86,
      }}
    >
      {/* Topo da tela.
          O menu lateral foi removido porque a navegação principal agora fica na barra inferior. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: -40,
        }}
      >
        {/* Foto e nome do usuário logado. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            maxWidth: 160,
          }}
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

        {/* Logo do LOGYM no topo. */}
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

      {/* Área de busca e filtros rápidos. */}
      <View style={{ marginBottom: 15 }}>
        {/* Campo de busca por texto. */}
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

        {/* Título da área de filtros e botão limpar. */}
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

        {/* Lista horizontal de filtros.
            Cada botão pode ser selecionado ou removido individualmente. */}
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

        {/* Mostra a quantidade de academias encontradas após busca/filtros. */}
        <Text
          style={{
            color: '#ccc',
            fontSize: 14,
            marginTop: 2,
          }}
        >
          Resultado: {academiasFiltradas.length} academia(s)
        </Text>

        {/* Mostra visualmente quais filtros estão ativos. */}
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

      {/* Estados da tela: carregando, erro, vazio ou lista de academias. */}
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

          // Pequeno espaço final para o último card não encostar na barra inferior.
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

              {/* Botão de favorito.
                  stopPropagation impede abrir detalhes quando clicar só na estrela. */}
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

      {/* Barra de navegação inferior principal do app. */}
      <BottomTabBar />
    </View>
  );
}