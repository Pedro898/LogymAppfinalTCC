import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { formatarNomeUsuario, type Usuario } from '@/lib/api';

export default function Perfil() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const nomeUsuario = formatarNomeUsuario(usuario);

  useFocusEffect(
    useCallback(() => {
      async function carregarUsuario() {
        const usuarioSalvo = await AsyncStorage.getItem('usuario');
        setUsuario(usuarioSalvo ? JSON.parse(usuarioSalvo) : null);
      }

      carregarUsuario();
    }, [])
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#000',
      paddingTop: 60,
      paddingHorizontal: 25,
    }}>
      <TouchableOpacity
        onPress={() => router.replace('/academias')}
        style={{ marginBottom: 20 }}
      >
        <Ionicons name="arrow-back-outline" size={38} color="#f97316" />
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Ionicons name="person-circle-outline" size={150} color="#fff" />
        <Text style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: 'bold',
          marginTop: 10,
        }}>
          {nomeUsuario}
        </Text>
      </View>

      <Text style={{
        color: '#f97316',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        alignSelf: 'center',
      }}>
        Seus dados pessoais
      </Text>

      <Text style={{ color: '#aaa', fontSize: 18, marginBottom: 8 }}>
        Nome
      </Text>
      <TextInput
        value={nomeUsuario}
        editable={false}
        style={{
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: 18,
          borderRadius: 18,
          fontSize: 18,
          marginBottom: 25,
          borderWidth: 1,
          borderColor: '#f97316',
        }}
      />

      <Text style={{ color: '#aaa', fontSize: 18, marginBottom: 8 }}>
        Usuario
      </Text>
      <TextInput
        value={usuario?.username || 'usuario'}
        editable={false}
        style={{
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: 18,
          borderRadius: 18,
          fontSize: 18,
          borderWidth: 1,
          borderColor: '#f97316',
        }}
      />
    </View>
  );
}
