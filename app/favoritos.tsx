import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

import { academiasLocais, getAcademiaImagem } from '@/constants/academias';

export default function Favoritos() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function carregarFavoritos() {
        const favoritosSalvos = await AsyncStorage.getItem('favoritos');
        setFavoritos(favoritosSalvos ? JSON.parse(favoritosSalvos) : []);
      }

      carregarFavoritos();
    }, [])
  );

  const academiasFavoritas = academiasLocais.filter((academia) =>
    favoritos.includes(academia.id)
  );

  async function removerFavorito(id: string) {
    const novosFavoritos = favoritos.filter((favoritoId) => favoritoId !== id);

    setFavoritos(novosFavoritos);
    await AsyncStorage.setItem('favoritos', JSON.stringify(novosFavoritos));
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#000',
      paddingTop: 60,
      paddingHorizontal: 15,
    }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 25 }}>
        <Ionicons name="arrow-back-outline" size={35} color="#f97316" />
      </TouchableOpacity>

      <Text style={{
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 25,
      }}>
        Academias Favoritas
      </Text>

      {academiasFavoritas.length === 0 ? (
        <Text style={{ color: '#ccc', fontSize: 16 }}>
          Voce ainda nao favoritou nenhuma academia.
        </Text>
      ) : (
        <FlatList
          data={academiasFavoritas}
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
                  removerFavorito(item.id);
                }}
                style={{ justifyContent: 'flex-end', padding: 10 }}
              >
                <Ionicons name="star" size={26} color="#facc15" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
