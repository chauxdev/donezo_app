import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Animated, StatusBar, TextInput, Modal, Image, Dimensions, ScrollView } from 'react-native';
import { PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import database from '../database';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme, Theme } from '../theme';
import { useSync } from '../hooks/useSync';
import { updateTask } from '../api/tasksApi';
import { useTasks } from '../hooks/useTasks';
import useTaskStore from '../store/taskStore';
import useAuthStore, { CleanUser } from '../store/authStore';
import TaskItem from '../components/TaskItem';
import FilterBar from '../components/FilterBar';
import AvatarView from '../components/AvatarView';
import Task from '../database/models/Task';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

/**
 * Pantalla principal que alberga la lógica de sincronización y el renderizado de alto rendimiento.
 */
const { width, height } = Dimensions.get('window');

export const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  // --- CONTEXTOS Y ESTADO GLOBAL ---
  const { theme, isDark, toggleTheme } = useTheme();
  const { filter, setFilter } = useTaskStore();
  const { user } = useAuthStore();
  
  // --- ESTADOS DE BÚSQUEDA Y FILTRADO ---
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  
  // --- CHANGE PASSWORD STATES ---
  const [currentPass, setCurrentPass] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [confirmNewPass, setConfirmNewPass] = React.useState('');

  // --- ZOOM LOGIC ---
  const scale = useRef(new Animated.Value(1)).current;
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );
  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };
  const { isSyncing, error: syncError, syncTasks } = useSync();
  const { tasks, isLoading, toggleTaskCompletion } = useTasks(filter);

  // Memoizar StyleSheet para evitar que el re-render ralentice a medida que cambia el scroll
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // --- CÁLCULOS OPTIMIZADOS ---
  // Calculamos contadores de manera performante basados en la colección renderizable de tareas
  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    tasks.forEach(task => {
      if (task.isCompleted) completed++;
      else pending++;
    });
    return {
      total: tasks.length,
      pending,
      completed
    };
  }, [tasks]);

  // Filtrado avanzado (Búsqueda + Fecha)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.todo.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesDate = true;
      if (selectedDate) {
        const taskDate = task.createdAt;
        matchesDate = 
          taskDate.getDate() === selectedDate.getDate() &&
          taskDate.getMonth() === selectedDate.getMonth() &&
          taskDate.getFullYear() === selectedDate.getFullYear();
      }
      
      return matchesSearch && matchesDate;
    });
  }, [tasks, searchQuery, selectedDate]);

  // --- HANDLERS (useCallback para pasar como props seguros a los memo) ---
  
  const handleToggle = useCallback(async (id: string, completed: boolean) => {
    try {
      await toggleTaskCompletion(id, completed);
      
      // Sincronización silenciosa con la API
      const task = await database.get<Task>('tasks').find(id);
      if (task.apiId) {
        updateTask(task.apiId, task.todo, completed).catch(() => {
          if (__DEV__) console.log('[API Sync] No se pudo actualizar estado en servidor (Offline)');
        });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la tarea de forma local. Inténtalo de nuevo.');
    }
  }, [toggleTaskCompletion]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive', 
          onPress: () => {
            useAuthStore.getState().logout();
            // La navegación se manejará automáticamente por el Navigator al cambiar el estado de auth
          } 
        }
      ]
    );
  }, []);

  const handleRefresh = useCallback(() => {
    syncTasks();
  }, [syncTasks]);

  const handleOpenImage = useCallback((uri: string) => {
    setSelectedImage(uri);
  }, []);

  const handleTaskPress = useCallback((taskId: string) => {
    navigation.navigate('TaskForm', { taskId });
  }, [navigation]);

  const userName = useMemo(() => {
    return user ? `${user.name} ${user.lastName}` : 'Guest';
  }, [user]);

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || !confirmNewPass) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    if (user?.password !== currentPass) {
      Alert.alert('Error', 'La contraseña actual es incorrecta.');
      return;
    }
    if (newPass.length < 3) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 3 caracteres.');
      return;
    }
    if (newPass !== confirmNewPass) {
      Alert.alert('Error', 'Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      await database.write(async () => {
        const userModel = await database.get('users').find(user!.id);
        await userModel.update((u: any) => {
          u.password = newPass;
        });
      });
      
      // Actualizar estado global con la nueva contraseña y mantener el token
      const updatedUser: CleanUser = {
        ...user!,
        password: newPass
      };
      useAuthStore.getState().login(updatedUser, useAuthStore.getState().token || '');
      
      Alert.alert('Éxito', 'Contraseña actualizada correctamente.');
      setShowChangePasswordModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la contraseña.');
    }
  };

  const keyExtractor = useCallback((item: Task) => item.id.toString(), []);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TouchableOpacity 
      onPress={() => handleTaskPress(item.id)}
    >
      <TaskItem 
        task={item} 
        onToggle={handleToggle} 
        onImagePress={handleOpenImage}
      />
    </TouchableOpacity>
  ), [handleToggle, handleTaskPress, handleOpenImage]);

  // --- ANIMACIONES (Refs y Effects) ---
  
  const [showOfflineToast, setShowOfflineToast] = React.useState(false);
  const bannerAnim = useRef(new Animated.Value(-100)).current;
  
  useEffect(() => {
    if (syncError && !showOfflineToast) {
      setShowOfflineToast(true);
      Animated.spring(bannerAnim, {
        toValue: insets.top + 20,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(bannerAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowOfflineToast(false));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [syncError, bannerAnim, insets.top]);

  // --- RENDER CONDICIONALES EXTREMOS ---
  
  if (syncError && tasks.length === 0 && !isLoading) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorIcon}>😵</Text>
        <Text style={styles.errorTitle}>Sin conexión</Text>
        <Text style={styles.errorSubtitle}>No pudimos recuperar tus tareas ni tenemos caché local.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => syncTasks()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- RENDER PRINCIPAL ---
  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <View style={styles.headerBg1} />
        <View style={styles.headerBg2} />
        
        {/* Centro Absoluto */}
        <View style={styles.headerTitleContainer} pointerEvents="none">
          <Text style={styles.headerTitle}>Donezo</Text>
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleLogout} style={styles.headerIcon}>
              <MaterialIcons name="logout" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.avatarButton}>
              <AvatarView name={userName} size={38} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon} onPress={toggleTheme}>
              <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SEARCH & CALENDAR BAR */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface2 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Buscar tareas..."
            placeholderTextColor={theme.colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.calendarButton, selectedDate && { backgroundColor: theme.colors.primary }]} 
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialIcons name="calendar-month" size={22} color={selectedDate ? '#FFFFFF' : theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {selectedDate && (
        <View style={styles.dateFilterTag}>
          <Text style={[styles.dateFilterText, { color: theme.colors.textSecondary }]}>
            Filtrando por: {selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDate(null)}>
            <Text style={{ color: theme.colors.primary, marginLeft: 8, fontWeight: 'bold' }}>Quitar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. BANNER OFFLINE (Toast temporal) */}
      <Animated.View style={[styles.offlineBanner, { transform: [{ translateY: bannerAnim }] }]}>
        <Text style={styles.offlineText}>📡 Sin conexión — Modo local activo</Text>
      </Animated.View>

      {/* 4. FILTER BAR */}
      <FilterBar activeFilter={filter} onFilterChange={setFilter} counts={counts} />

      {/* 5. VIRTUALIZED FLATLIST (Obligatorio por performance + Offline-First approach) */}
      <FlatList
        data={filteredTasks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        // Atributos de Refresh Control custom
        refreshing={isSyncing}
        onRefresh={handleRefresh}
        // Atributos obligatorios solicitados para Performance Extremo
        windowSize={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        initialNumToRender={15}
        ItemSeparatorComponent={() => null} // El marginBottom ya funciona en TaskItem
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <>
                <Text style={styles.emptyEmoji}>
                  {selectedDate ? '📅' : (filter === 'all' ? '📋' : filter === 'completed' ? '🎯' : '🎉')}
                </Text>
                <Text style={styles.emptyTitle}>
                  {selectedDate ? 'No hay tareas para esta fecha' : (filter === 'all' ? 'Sin tareas' : filter === 'completed' ? 'Nada completado' : '¡Al día!')}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedDate ? 'Prueba con otra fecha o quita el filtro' : (filter === 'all' ? 'Haz pull-to-refresh' : filter === 'completed' ? '¡Manos a la obra!' : 'No hay tareas pendientes')}
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* IMAGE VIEWER MODAL (Lightbox with Zoom) */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setSelectedImage(null)}>
            <MaterialIcons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <View style={styles.zoomContainer}>
              <PinchGestureHandler
                onGestureEvent={onPinchEvent}
                onHandlerStateChange={onPinchStateChange}
              >
                <Animated.View style={{ transform: [{ scale: scale }] }}>
                  <Image 
                    source={{ uri: selectedImage }} 
                    style={styles.fullImage} 
                    resizeMode="contain" 
                  />
                </Animated.View>
              </PinchGestureHandler>
            </View>
          )}
        </View>
      </Modal>

      {/* PROFILE MODAL */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.profileModalOverlay}>
          <View style={[styles.profileContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.profileHeader}>
              <AvatarView name={userName} size={80} />
              <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{userName}</Text>
              <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{user?.username}@donezo.app</Text>
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={[styles.profileButton, { backgroundColor: theme.colors.primary + '15' }]}
                onPress={() => {
                  setShowProfileModal(false);
                  setShowChangePasswordModal(true);
                }}
              >
                <MaterialIcons name="lock-reset" size={24} color={theme.colors.primary} />
                <Text style={[styles.profileButtonText, { color: theme.colors.primary }]}>Cambiar Contraseña</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.closeProfileButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <View style={styles.profileModalOverlay}>
          <View style={[styles.profileContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.profileName, { color: theme.colors.textPrimary, marginBottom: 24 }]}>Cambiar Contraseña</Text>
            
            <View style={styles.profileActions}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Contraseña Actual</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface2, color: theme.colors.textPrimary }]}
                  secureTextEntry
                  value={currentPass}
                  onChangeText={setCurrentPass}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nueva Contraseña</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface2, color: theme.colors.textPrimary }]}
                  secureTextEntry
                  value={newPass}
                  onChangeText={setNewPass}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Confirmar Nueva Contraseña</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface2, color: theme.colors.textPrimary }]}
                  secureTextEntry
                  value={confirmNewPass}
                  onChangeText={setConfirmNewPass}
                />
              </View>

              <TouchableOpacity 
                style={[styles.closeProfileButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                onPress={handleChangePassword}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Actualizar Contraseña</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.closeProfileButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border }]}
                onPress={() => setShowChangePasswordModal(false)}
              >
                <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DATETIMEPICKER REAL */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* 6. FAB (Floating Action Button) para Crear Tarea */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('TaskForm', {})}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

// Generador Dinámico de Estilos atado a UseTheme y ejecutado solo si theme cambia.
const makeStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 70, // Altura sin contar top padding (lo pone SafeAreaView automáticamente)
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerBg1: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.primary,
  },
  headerBg2: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.primaryDark,
    opacity: 0.6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: '100%',
    zIndex: 5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
  },
  headerTitleContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  avatarButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 22,
    padding: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badge: {
    backgroundColor: theme.colors.warning,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeNumber: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize,
    fontWeight: theme.typography.small.fontWeight as any,
  },
  themeToggle: {
    padding: 4,
  },
  themeIcon: {
    fontSize: 20,
  },
  offlineBanner: {
    position: 'absolute',
    top: 0, 
    left: 20,
    right: 20,
    backgroundColor: '#323232', // Darker Snackbar style
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as any,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  errorSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: theme.borderRadius.lg,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterTag: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModal: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 30,
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
  zoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  profileContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 32,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  profileActions: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeProfileButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    width: '100%',
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});

export default DashboardScreen;
