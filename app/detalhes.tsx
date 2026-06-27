import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  alternarFavoritoNoBanco,
  avaliacaoPertenceAoUsuario,
  buscarAcademiaPorId,
  buscarAvaliacoesDaAcademia,
  buscarFavoritosDoUsuario,
  buscarPrimeiraFotoAcademia,
  criarAvaliacao,
  extrairIdsAcademiasFavoritas,
  getFotoAcademiaUrl,
  getNomeUsuarioAvaliacao,
  inativarAvaliacao,
  normalizarCategorias,
  normalizarFacilidades,
  type Academia,
  type Avaliacao,
  type Usuario,
} from '@/lib/api';

function getInicialAcademia(nome?: string) {
  const nomeLimpo = String(nome || 'A').trim();

  if (!nomeLimpo) {
    return 'A';
  }

  return nomeLimpo.charAt(0).toUpperCase();
}

function AcademiaSemFotoGrande({ nome }: { nome?: string }) {
  return (
    <LinearGradient
      colors={['#1a0700', '#f97316']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 320,
        height: 220,
        alignSelf: 'center',
        borderRadius: 25,
        marginTop: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: 86,
          height: 86,
          borderRadius: 43,
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
            fontSize: 44,
            fontWeight: '900',
          }}
        >
          {getInicialAcademia(nome)}
        </Text>
      </View>
    </LinearGradient>
  );
}

export default function Detalhes() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [academia, setAcademia] = useState<Academia | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);

  // Começa com 0 para as estrelas ficarem vazias.
  const [notaSelecionada, setNotaSelecionada] = useState(0);

  const [comentario, setComentario] = useState('');
  const [editandoAvaliacao, setEditandoAvaliacao] = useState(false);

  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [excluindoAvaliacao, setExcluindoAvaliacao] = useState(false);

  // Guarda avaliações excluídas localmente nesta tela.
  // Assim, depois de excluir, o formulário volta imediatamente.
  const [idsAvaliacoesInativadas, setIdsAvaliacoesInativadas] = useState<string[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const avaliacoesAtivas = useMemo(() => {
    return avaliacoes.filter((avaliacao) => {
      const status = String(avaliacao.statusAvaliacao || 'ATIVO').toUpperCase();

      const foiInativadaLocalmente = idsAvaliacoesInativadas.includes(
        String(avaliacao.id)
      );

      return status !== 'INATIVO' && !foiInativadaLocalmente;
    });
  }, [avaliacoes, idsAvaliacoesInativadas]);

  const minhaAvaliacao = useMemo(() => {
    if (!usuario?.id) {
      return null;
    }

    return (
      avaliacoesAtivas.find((avaliacao) =>
        avaliacaoPertenceAoUsuario(avaliacao, usuario.id)
      ) || null
    );
  }, [avaliacoesAtivas, usuario?.id]);

  const deveMostrarFormularioAvaliacao = !minhaAvaliacao || editandoAvaliacao;

  async function carregarAvaliacoes(
    academiaId: string | number,
    usuarioId?: string | number
  ) {
    try {
      const avaliacoesBanco = await buscarAvaliacoesDaAcademia(
        academiaId,
        usuarioId
      );

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

        if (!id) {
          setErro('Academia não encontrada.');
          return;
        }

        const academiaBanco = await buscarAcademiaPorId(id);
        setAcademia(academiaBanco);

        await carregarAvaliacoes(id, usuarioLogado?.id);

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

    const novosFavoritos = favoritos.includes(academiaId)
      ? favoritos.filter((favoritoId) => favoritoId !== academiaId)
      : [...favoritos, academiaId];

    setFavoritos(novosFavoritos);

    try {
      await alternarFavoritoNoBanco(usuario.id, academia.id);
    } catch (error) {
      console.error('Erro ao atualizar favorito no banco:', error);
      setFavoritos(favoritosAnteriores);
    }
  }

  function iniciarEdicaoAvaliacao(avaliacao: Avaliacao) {
    setNotaSelecionada(Number(avaliacao.nota) || 0);
    setComentario(avaliacao.comentario || '');
    setEditandoAvaliacao(true);
  }

  function cancelarEdicaoAvaliacao() {
    setNotaSelecionada(0);
    setComentario('');
    setEditandoAvaliacao(false);
  }

  async function enviarAvaliacao() {
    if (!academia || !usuario?.id) {
      Alert.alert('Atenção', 'Usuário não encontrado. Faça login novamente.');
      return;
    }

    if (notaSelecionada < 1 || notaSelecionada > 5) {
      Alert.alert('Atenção', 'Selecione uma nota de 1 a 5 estrelas.');
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

      setIdsAvaliacoesInativadas([]);

      setComentario('');
      setNotaSelecionada(0);
      setEditandoAvaliacao(false);

      await carregarAvaliacoes(academia.id, usuario.id);

      Alert.alert(
        'Sucesso',
        editandoAvaliacao
          ? 'Avaliação atualizada com sucesso.'
          : 'Avaliação enviada com sucesso.'
      );
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);

      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Não foi possível enviar sua avaliação.');
      }
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  async function executarExclusaoAvaliacao() {
    if (!usuario?.id || !minhaAvaliacao || !academia) {
      Alert.alert('Erro', 'Não foi possível identificar sua avaliação.');
      return;
    }

    try {
      setExcluindoAvaliacao(true);

      const idAvaliacaoExcluida = String(minhaAvaliacao.id);

      await inativarAvaliacao(minhaAvaliacao.id, usuario.id);

      setAvaliacoes((listaAtual) =>
        listaAtual.filter(
          (avaliacao) => String(avaliacao.id) !== idAvaliacaoExcluida
        )
      );

      setIdsAvaliacoesInativadas((listaAtual) => [
        ...listaAtual,
        idAvaliacaoExcluida,
      ]);

      setComentario('');
      setNotaSelecionada(0);
      setEditandoAvaliacao(false);

      await carregarAvaliacoes(academia.id, usuario.id);

      Alert.alert('Sucesso', 'Avaliação excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);

      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Não foi possível excluir sua avaliação.');
      }
    } finally {
      setExcluindoAvaliacao(false);
    }
  }

  function excluirMinhaAvaliacao() {
    if (!usuario?.id || !minhaAvaliacao || !academia) {
      Alert.alert('Erro', 'Não foi possível identificar sua avaliação.');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmou = window.confirm(
        'Tem certeza que deseja excluir sua avaliação?'
      );

      if (confirmou) {
        executarExclusaoAvaliacao();
      }

      return;
    }

    Alert.alert(
      'Excluir avaliação',
      'Tem certeza que deseja excluir sua avaliação?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: executarExclusaoAvaliacao,
        },
      ]
    );
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
          onPress={() => router.replace('/academias')}
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
  const categorias = normalizarCategorias(academia.categorias);
  const facilidades = normalizarFacilidades(academia.facilidades);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }}>
      <TouchableOpacity
        onPress={() => router.replace('/academias')}
        style={{
          marginTop: 20,
          marginLeft: 20,
        }}
      >
        <Ionicons name="arrow-back" size={32} color="#f97316" />
      </TouchableOpacity>

      {fotoUrl ? (
        <Image
          source={{ uri: fotoUrl }}
          style={{
            width: 320,
            height: 220,
            alignSelf: 'center',
            borderRadius: 25,
            marginTop: 10,
            backgroundColor: '#111',
          }}
        />
      ) : (
        <AcademiaSemFotoGrande nome={academia.nome} />
      )}

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
            Categorias
          </Text>

          {categorias.length > 0 ? (
            categorias.map((categoria, index) => (
              <View
                key={`${categoria}-${index}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <Ionicons name="barbell" size={22} color="#f97316" />

                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  {categoria}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#ccc', fontSize: 16 }}>
              Nenhuma categoria cadastrada.
            </Text>
          )}
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

          {deveMostrarFormularioAvaliacao ? (
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
                {editandoAvaliacao ? 'Editar sua avaliação' : 'Deixe sua avaliação'}
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
                  marginBottom: editandoAvaliacao ? 10 : 0,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 16,
                  }}
                >
                  {enviandoAvaliacao
                    ? 'Salvando...'
                    : editandoAvaliacao
                      ? 'Salvar edição'
                      : 'Enviar avaliação'}
                </Text>
              </TouchableOpacity>

              {editandoAvaliacao ? (
                <TouchableOpacity
                  onPress={cancelarEdicaoAvaliacao}
                  disabled={enviandoAvaliacao}
                  style={{
                    backgroundColor: '#111',
                    paddingVertical: 13,
                    borderRadius: 15,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#333',
                  }}
                >
                  <Text
                    style={{
                      color: '#ccc',
                      fontWeight: 'bold',
                      fontSize: 16,
                    }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {minhaAvaliacao && !editandoAvaliacao ? (
            <Text
              style={{
                color: '#ccc',
                fontSize: 14,
                marginBottom: 14,
              }}
            >
              Você já avaliou esta academia. Use Editar ou Excluir na sua avaliação.
            </Text>
          ) : null}

          {avaliacoesAtivas.length === 0 ? (
            <Text style={{ color: '#ccc', fontSize: 16 }}>
              Essa academia ainda não possui avaliações.
            </Text>
          ) : (
            avaliacoesAtivas.map((avaliacao) => {
              const pertenceAoUsuario = avaliacaoPertenceAoUsuario(
                avaliacao,
                usuario?.id
              );

              return (
                <View
                  key={String(avaliacao.id)}
                  style={{
                    backgroundColor: '#000',
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: pertenceAoUsuario ? '#f97316' : '#333',
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
                      {pertenceAoUsuario ? ' (você)' : ''}
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

                  {pertenceAoUsuario ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        marginTop: 14,
                        gap: 10,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => iniciarEdicaoAvaliacao(avaliacao)}
                        disabled={excluindoAvaliacao}
                        style={{
                          flex: 1,
                          backgroundColor: '#f97316',
                          paddingVertical: 11,
                          borderRadius: 12,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        >
                          Editar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={excluirMinhaAvaliacao}
                        disabled={excluindoAvaliacao}
                        style={{
                          flex: 1,
                          backgroundColor: '#2a0f0f',
                          paddingVertical: 11,
                          borderRadius: 12,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#7f1d1d',
                        }}
                      >
                        <Text
                          style={{
                            color: '#ffb4b4',
                            fontWeight: 'bold',
                          }}
                        >
                          {excluindoAvaliacao ? 'Excluindo...' : 'Excluir'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}