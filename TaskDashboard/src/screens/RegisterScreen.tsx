import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import database from '../database';
import useAuthStore, { CleanUser } from '../store/authStore';
import { useTheme } from '../theme';
import { AuthStackParamList } from '../navigation/AppNavigator';

declare const btoa: (str: string) => string;

type NavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { login } = useAuthStore();
  
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!name || !lastName || !age || !username || !password || !confirmPassword) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return false;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum <= 0) {
      Alert.alert('Error', 'La edad debe ser un número válido.');
      return false;
    }
    if (password.length < 3) {
      Alert.alert('Error', 'La contraseña debe tener al menos 3 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      let newUser: any = null;
      await database.write(async () => {
        const usersCollection = database.get('users');
        const tasksCollection = database.get('tasks');

        newUser = await usersCollection.create((user: any) => {
          user.name = name;
          user.lastName = lastName;
          user.age = parseInt(age, 10);
          user.username = username;
          user.password = password;
        });

        // Tarea de bienvenida en español para nuevos usuarios
        await tasksCollection.create((task: any) => {
          task.todo = '¡Bienvenido a Donezo! 🚀';
          task.description = 'Esta es tu primera tarea. Puedes crear más tareas, marcarlas como completadas y capturar fotos para documentar tu progreso. ¡Disfruta organizando tu día!';
          task.completed = false;
          task.userId = newUser.id;
        });
      });

      if (newUser) {
        const cleanUser: CleanUser = {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          lastName: newUser.lastName,
          age: newUser.age,
          password: newUser.password,
        };
        const dummyToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(cleanUser))}.sIg_u9_Q`;
        Alert.alert('¡Éxito!', 'Cuenta creada correctamente.', [
          { text: 'OK', onPress: () => login(cleanUser, dummyToken) }
        ]);
      }
    } catch (error: any) {
      // Extraer información segura del error sin referencias circulares
      let errorMessage = 'Error desconocido al crear la cuenta.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', 'No se pudo crear la cuenta.');
      if (__DEV__) {
        console.error('[RegisterScreen] Error:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Crea tu cuenta</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Empieza a organizar tu mundo en Donezo.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nombre</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                  placeholder="Ej. Tomás"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Apellido</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                  placeholder="Ej. Chaux"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Edad</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholder="Ej. 25"
                placeholderTextColor={theme.colors.textDisabled}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Usuario</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholder="Ej. tomaschaux"
                placeholderTextColor={theme.colors.textDisabled}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Contraseña</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                  placeholder="Mínimo 3 caracteres"
                  placeholderTextColor={theme.colors.textDisabled}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={{ fontSize: 20 }}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Confirmar Contraseña</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={theme.colors.textDisabled}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={{ fontSize: 20 }}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>{loading ? 'Creando...' : 'Registrarme'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
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
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  registerButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RegisterScreen;
