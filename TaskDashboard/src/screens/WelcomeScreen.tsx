import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme';
import { AuthStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logo, { color: theme.colors.primary }]}>Donezo</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Organiza tu mundo, un paso a la vez
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Registrarse</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.outlineButton, { borderColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Este texto se renderiza por fuera del content para forzarlo a irse abajo del todo */}
      <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
        Desarrollado por Tomas Chaux aprendiz de ADSO 3145650
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  outlineButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16, // Espaciado elegante con respecto al borde inferior de la pantalla
    fontWeight: '500',
  },
});

export default WelcomeScreen;