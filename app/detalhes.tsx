import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { academiasLocais, getAcademiaImagem } from '@/constants/academias';

export default function Detalhes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const academia =
    academiasLocais.find((item) => item.id === id) || academiasLocais[0];

  useEffect(() => {
    async function carregarFavoritos() {
      const favoritosSalvos = await AsyncStorage.getItem('favoritos');
      setFavoritos(favoritosSalvos ? JSON.parse(favoritosSalvos) : []);
    }

    carregarFavoritos();
  }, []);

  async function favoritarAcademia() {
    const novosFavoritos = favoritos.includes(academia.id)
      ? favoritos.filter((item) => item !== academia.id)
      : [...favoritos, academia.id];

    setFavoritos(novosFavoritos);
    await AsyncStorage.setItem('favoritos', JSON.stringify(novosFavoritos));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ marginTop: 20, marginLeft: 20 }}
      >
        <Ionicons name="arrow-back" size={32} color="#f97316" />
      </TouchableOpacity>

      <Image
        source={getAcademiaImagem(academia)}
        style={{
          width: 320,
          height: 220,
          alignSelf: 'center',
          borderRadius: 25,
          marginTop: 10,
        }}
      />

      <View style={{
        backgroundColor: '#111',
        marginTop: 25,
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 25,
        minHeight: 600,
        borderTopWidth: 3,
        borderColor: '#f97316',
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{ color: '#f97316', fontSize: 24, fontWeight: 'bold' }}>
            {academia.nome}
          </Text>

          <TouchableOpacity onPress={favoritarAcademia}>
            <Ionicons
              name={favoritos.includes(academia.id) ? 'star' : 'star-outline'}
              size={30}
              color="#facc15"
            />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 30 }}>
          <Ionicons name="location-sharp" size={34} color="#f97316" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, marginBottom: 5 }}>
              {academia.endereco}
            </Text>
            <Text style={{ color: '#fff', fontSize: 17, marginBottom: 5 }}>
              {academia.cidade}
            </Text>
            <Text style={{ color: '#f97316', fontSize: 17 }}>{academia.cep}</Text>
          </View>
        </View>

        <View style={{ marginTop: 40 }}>
          <Text style={{
            color: '#f97316',
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 20,
          }}>
            Informacoes
          </Text>

          {(academia.infos || []).map((info, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color="#f97316" />
              <Text style={{ color: '#fff', fontSize: 17, marginLeft: 10, flex: 1 }}>
                {info}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
