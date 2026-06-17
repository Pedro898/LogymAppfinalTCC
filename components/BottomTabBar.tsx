import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

type RotaPrincipal = '/academias' | '/favoritos' | '/perfil';

const abas = [
  {
    nome: 'Academias',
    rota: '/academias' as RotaPrincipal,
    iconeAtivo: 'barbell',
    iconeInativo: 'barbell-outline',
  },
  {
    nome: 'Favoritos',
    rota: '/favoritos' as RotaPrincipal,
    iconeAtivo: 'star',
    iconeInativo: 'star-outline',
  },
  {
    nome: 'Perfil',
    rota: '/perfil' as RotaPrincipal,
    iconeAtivo: 'person',
    iconeInativo: 'person-outline',
  },
];

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  function irParaAba(rota: RotaPrincipal) {
    if (pathname === rota) {
      return;
    }

    router.replace(rota);
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#222',
        paddingTop: 8,
        paddingBottom: 12,
        paddingHorizontal: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        elevation: 18,
      }}
    >
      {abas.map((aba) => {
        const ativo = pathname === aba.rota;

        return (
          <TouchableOpacity
            key={aba.rota}
            onPress={() => irParaAba(aba.rota)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
            }}
          >
            <Ionicons
              name={ativo ? (aba.iconeAtivo as any) : (aba.iconeInativo as any)}
              size={24}
              color={ativo ? '#f97316' : '#aaa'}
            />

            <Text
              style={{
                color: ativo ? '#f97316' : '#aaa',
                fontSize: 12,
                fontWeight: ativo ? 'bold' : '600',
                marginTop: 3,
              }}
            >
              {aba.nome}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}