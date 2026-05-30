import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // remove o topo padrão
        contentStyle: {
          backgroundColor: '#020617' // fundo escuro do app
        }
      }}
    />
  );
}