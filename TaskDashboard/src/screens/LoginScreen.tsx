import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import User from '../database/models/User';
import useAuthStore, { CleanUser } from '../store/authStore';
import { useTheme } from '../theme';
import { AuthStackParamList } from '../navigation/AppNavigator';

declare const btoa: (str: string) => string;

type NavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const EyeIcon = ({ visible, color }: { visible: boolean; color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ 
      width: 18, 
      height: 12, 
      borderRadius: 6, 
      borderWidth: 1.5, 
      borderColor: color,
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </View>
    {!visible && (
      <View style={{ 
        position: 'absolute', 
        width: 1.5, 
        height: 20, 
        backgroundColor: color, 
        transform: [{ rotate: '45deg' }] 
      }} />
    )}
  </View>
);

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const usersCollection = database.get<User>('users');
      // En una app real, la contraseña debe estar hasheada.
      // Aquí, por simplicidad offline, comparamos directo.
      const users = await usersCollection.query(
        Q.where('username', username),
        Q.where('password', password)
      ).fetch();

      if (users.length > 0) {
        const cleanUser: CleanUser = {
          id: users[0].id,
          username: users[0].username,
          name: users[0].name,
          lastName: users[0].lastName,
          age: users[0].age,
          password: users[0].password,
        };
        // Generamos un token simulado para la integración con la API
        const dummyToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(cleanUser))}.sIg_u9_Q`;
        login(cleanUser, dummyToken);
      } else {
        Alert.alert('Error', 'Usuario o contraseña incorrectos.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Ocurrió un error al intentar iniciar sesión.');
      console.error(error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Bienvenido de nuevo</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Usuario</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="Ej. tomaschaux"
              placeholderTextColor={theme.colors.textDisabled}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary
                }]}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={theme.colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <EyeIcon visible={showPassword} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>{loading ? 'Iniciando...' : 'Iniciar Sesión'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LoginScreen;
