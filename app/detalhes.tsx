import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  alternarFavoritoNoBanco,
  buscarAcademiaPorId,
  buscarAvaliacoesDaAcademia,
  buscarFavoritosDoUsuario,
  buscarPrimeiraFotoAcademia,
  criarAvaliacao,
  extrairIdsAcademiasFavoritas,
  getFotoAcademiaUrl,
  getNomeUsuarioAvaliacao,
  normalizarFacilidades,
  type Academia,
  type Avaliacao,
  type Usuario,
} from '@/lib/api';

function getImagemAcademia(fotoUrl?: string | null) {
  if (fotoUrl) {
    return { uri: fotoUrl };
  }

  return require('../assets/images/gym1.jpeg');
}

export default function Detalhes() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [academia, setAcademia] = useState<Academia | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [notaSelecionada, setNotaSelecionada] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarAvaliacoes(academiaId: string | number) {
    try {
      const avaliacoesBanco = await buscarAvaliacoesDaAcademia(academiaId);

      setAvaliacoes(avaliacoesBanco || []);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      setAvaliacoes([]);
    }
  }

  useEffect(() => {
    async function carregarDetalhes() {
      try {
        setCarregando(true);
        setErro('');

        const usuarioSalvo = await AsyncStorage.getItem('usuario');

        const usuarioLogado: Usuario | null = usuarioSalvo
          ? JSON.parse(usuarioSalvo)
          : null;

        setUsuario(usuarioLogado);

        // Busca os favoritos reais do banco para definir se a estrela fica preenchida.
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

        if (!id) {
          setErro('Academia não encontrada.');
          return;
        }

        // Busca dados reais da academia.
        const academiaBanco = await buscarAcademiaPorId(id);
        setAcademia(academiaBanco);

        // Busca avaliações reais da academia.
        await carregarAvaliacoes(id);

        // Busca primeira foto real da academia.
        try {
          const primeiraFoto = await buscarPrimeiraFotoAcademia(id);
          setFotoUrl(primeiraFoto ? getFotoAcademiaUrl(primeiraFoto.id) : null);
        } catch (error) {
          console.error(`Erro ao buscar foto da academia ${id}:`, error);
          setFotoUrl(null);
        }
      } catch (error) {
        console.error(error);
        setErro('Erro ao carregar os detalhes da academia.');
      } finally {
        setCarregando(false);
      }
    }

    carregarDetalhes();
  }, [id]);

  async function favoritarAcademia() {
    if (!academia || !usuario?.id) {
      return;
    }

    const academiaId = String(academia.id);

    const favoritosAnteriores = favoritos;

    // Atualiza visualmente na hora.
    const novosFavoritos = favoritos.includes(academiaId)
      ? favoritos.filter((favoritoId) => favoritoId !== academiaId)
      : [...favoritos, academiaId];

    setFavoritos(novosFavoritos);

    try {
      // Salva no banco.
      await alternarFavoritoNoBanco(usuario.id, academia.id);
    } catch (error) {
      console.error('Erro ao atualizar favorito no banco:', error);

      // Se falhar, desfaz visualmente.
      setFavoritos(favoritosAnteriores);
    }
  }

  async function enviarAvaliacao() {
    if (!academia || !usuario?.id) {
      Alert.alert('Atenção', 'Usuário não encontrado. Faça login novamente.');
      return;
    }

    if (!comentario.trim()) {
      Alert.alert('Atenção', 'Digite um comentário para enviar sua avaliação.');
      return;
    }

    try {
      setEnviandoAvaliacao(true);

      await criarAvaliacao(usuario.id, academia.id, {
        nota: notaSelecionada,
        comentario: comentario.trim(),
      });

      setComentario('');
      setNotaSelecionada(5);

      // Recarrega as avaliações para aparecer a nova avaliação cadastrada.
      await carregarAvaliacoes(academia.id);

      Alert.alert('Sucesso', 'Avaliação enviada com sucesso.');
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      Alert.alert('Erro', 'Não foi possível enviar sua avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <ActivityIndicator color="#f97316" />

        <Text
          style={{
            color: '#fff',
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Carregando detalhes da academia...
        </Text>
      </View>
    );
  }

  if (erro || !academia) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Text
          style={{
            color: '#ffb4b4',
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          {erro || 'Academia não encontrada.'}
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: '#f97316',
            paddingVertical: 12,
            paddingHorizontal: 22,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            Voltar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const academiaId = String(academia.id);
  const facilidades = normalizarFacilidades(academia.facilidades);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          marginTop: 20,
          marginLeft: 20,
        }}
      >
        <Ionicons name="arrow-back" size={32} color="#f97316" />
      </TouchableOpacity>

      <Image
        source={getImagemAcademia(fotoUrl)}
        style={{
          width: 320,
          height: 220,
          alignSelf: 'center',
          borderRadius: 25,
          marginTop: 10,
          backgroundColor: '#111',
        }}
      />

      <View
        style={{
          backgroundColor: '#111',
          marginTop: 25,
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
          padding: 25,
          minHeight: 600,
          borderTopWidth: 3,
          borderColor: '#f97316',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#f97316',
              fontSize: 24,
              fontWeight: 'bold',
              flex: 1,
              marginRight: 10,
            }}
          >
            {academia.nome}
          </Text>

          <TouchableOpacity onPress={favoritarAcademia}>
            <Ionicons
              name={favoritos.includes(academiaId) ? 'star' : 'star-outline'}
              size={30}
              color="#facc15"
            />
          </TouchableOpacity>
        </View>

        {academia.nota !== null && academia.nota !== undefined ? (
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              marginTop: 10,
            }}
          >
            {Number(academia.nota).toFixed(1)} ⭐
          </Text>
        ) : (
          <Text
            style={{
              color: '#777',
              fontSize: 16,
              marginTop: 10,
            }}
          >
            Sem avaliações
          </Text>
        )}

        <View style={{ flexDirection: 'row', marginTop: 30 }}>
          <Ionicons name="location-sharp" size={34} color="#f97316" />

          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, marginBottom: 5 }}>
              {academia.endereco}
              {academia.numero ? `, ${academia.numero}` : ''}
            </Text>

            {academia.complemento ? (
              <Text style={{ color: '#ccc', fontSize: 16, marginBottom: 5 }}>
                {academia.complemento}
              </Text>
            ) : null}

            <Text style={{ color: '#fff', fontSize: 17, marginBottom: 5 }}>
              {academia.bairro ? `${academia.bairro} - ` : ''}
              {academia.cidade}
              {academia.estado ? `, ${academia.estado}` : ''}
            </Text>

            <Text style={{ color: '#f97316', fontSize: 17 }}>
              CEP: {academia.cep}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 35 }}>
          <Text
            style={{
              color: '#f97316',
              fontSize: 22,
              fontWeight: 'bold',
              marginBottom: 12,
            }}
          >
            Descrição
          </Text>

          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            {academia.descricao || 'Nenhuma descrição cadastrada.'}
          </Text>
        </View>

        <View style={{ marginTop: 35 }}>
          <Text
            style={{
              color: '#f97316',
              fontSize: 22,
              fontWeight: 'bold',
              marginBottom: 15,
            }}
          >
            Contato
          </Text>

          {academia.telefone ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="call" size={22} color="#f97316" />

              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  marginLeft: 10,
                }}
              >
                {academia.telefone}
              </Text>
            </View>
          ) : null}

          {academia.celular ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="phone-portrait" size={22} color="#f97316" />

              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  marginLeft: 10,
                }}
              >
                {academia.celular}
              </Text>
            </View>
          ) : null}

          {academia.email ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="mail" size={22} color="#f97316" />

              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  marginLeft: 10,
                  flex: 1,
                }}
              >
                {academia.email}
              </Text>
            </View>
          ) : null}

          {!academia.telefone && !academia.celular && !academia.email ? (
            <Text style={{ color: '#ccc', fontSize: 16 }}>
              Nenhum contato cadastrado.
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: 35 }}>
          <Text
            style={{
              color: '#f97316',
              fontSize: 22,
              fontWeight: 'bold',
              marginBottom: 15,
            }}
          >
            Facilidades
          </Text>

          {facilidades.length > 0 ? (
            facilidades.map((facilidade, index) => (
              <View
                key={`${facilidade}-${index}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <Ionicons name="checkmark-circle" size={22} color="#f97316" />

                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  {facilidade}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#ccc', fontSize: 16 }}>
              Nenhuma facilidade cadastrada.
            </Text>
          )}
        </View>

        <View style={{ marginTop: 40 }}>
          <Text
            style={{
              color: '#f97316',
              fontSize: 22,
              fontWeight: 'bold',
              marginBottom: 15,
            }}
          >
            Avaliações
          </Text>

          <View
            style={{
              backgroundColor: '#000',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#333',
              padding: 15,
              marginBottom: 25,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 17,
                fontWeight: 'bold',
                marginBottom: 12,
              }}
            >
              Deixe sua avaliação
            </Text>

            <Text style={{ color: '#ccc', marginBottom: 8 }}>Nota</Text>

            <View
              style={{
                flexDirection: 'row',
                marginBottom: 15,
              }}
            >
              {[1, 2, 3, 4, 5].map((nota) => (
                <TouchableOpacity
                  key={nota}
                  onPress={() => setNotaSelecionada(nota)}
                  style={{ marginRight: 6 }}
                >
                  <Ionicons
                    name={nota <= notaSelecionada ? 'star' : 'star-outline'}
                    size={32}
                    color="#facc15"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: '#ccc', marginBottom: 8 }}>Comentário</Text>

            <TextInput
              value={comentario}
              onChangeText={setComentario}
              placeholder="Ex: Ótima academia, equipamentos novos..."
              placeholderTextColor="#777"
              multiline
              style={{
                backgroundColor: '#111',
                color: '#fff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#333',
                minHeight: 95,
                padding: 12,
                textAlignVertical: 'top',
                marginBottom: 15,
              }}
            />

            <TouchableOpacity
              onPress={enviarAvaliacao}
              disabled={enviandoAvaliacao}
              style={{
                backgroundColor: enviandoAvaliacao ? '#9a4b12' : '#f97316',
                paddingVertical: 13,
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
                {enviandoAvaliacao ? 'Enviando...' : 'Enviar avaliação'}
              </Text>
            </TouchableOpacity>
          </View>

          {avaliacoes.length === 0 ? (
            <Text style={{ color: '#ccc', fontSize: 16 }}>
              Essa academia ainda não possui avaliações.
            </Text>
          ) : (
            avaliacoes.map((avaliacao) => (
              <View
                key={String(avaliacao.id)}
                style={{
                  backgroundColor: '#000',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#333',
                  padding: 15,
                  marginBottom: 15,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: 16,
                      flex: 1,
                      marginRight: 10,
                    }}
                  >
                    {getNomeUsuarioAvaliacao(avaliacao)}
                  </Text>

                  <Text
                    style={{
                      color: '#facc15',
                      fontWeight: 'bold',
                    }}
                  >
                    {Number(avaliacao.nota).toFixed(1)} ⭐
                  </Text>
                </View>

                <Text
                  style={{
                    color: '#ccc',
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {avaliacao.comentario || 'Sem comentário.'}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}