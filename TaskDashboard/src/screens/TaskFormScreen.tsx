import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, ScrollView, StatusBar, PermissionsAndroid, Modal, Dimensions, Animated } from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import database from '../database';
import Task from '../database/models/Task';
import { useTheme } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import CameraModule from '../api/CameraModule';
import useAuthStore from '../store/authStore';
import { createTask, updateTask, deleteTask as deleteApiTask } from '../api/tasksApi';

type NavigationProp = StackNavigationProp<RootStackParamList, 'TaskForm'>;
type TaskFormRouteProp = RouteProp<RootStackParamList, 'TaskForm'>;

const TaskFormScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TaskFormRouteProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const taskId = route.params?.taskId;
  const isEditing = !!taskId;

  const [todo, setTodo] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- ZOOM LOGIC ---
  const scale = React.useRef(new Animated.Value(1)).current;
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

  const loadTask = React.useCallback(async () => {
    if (!taskId) return;
    try {
      const task = await database.get<Task>('tasks').find(taskId);
      setTodo(task.todo);
      setDescription(task.description || '');
      if (task.attachmentUri) {
        try {
          const parsed = JSON.parse(task.attachmentUri);
          if (Array.isArray(parsed)) {
            setAttachments(parsed);
          } else {
            setAttachments([task.attachmentUri]);
          }
        } catch (e) {
          setAttachments([task.attachmentUri]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la tarea');
      navigation.goBack();
    }
  }, [navigation, taskId]);

  useEffect(() => {
    if (isEditing) {
      loadTask();
    }
  }, [isEditing, loadTask]);

  const handleSave = async () => {
    if (!todo.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }
    if (todo.trim().length < 3) {
      Alert.alert('Error', 'El título debe tener al menos 3 caracteres.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'Sesión inválida');
      return;
    }

    setLoading(true);
    try {
      let savedTask: Task | null = null;
      await database.write(async () => {
        const tasksCollection = database.get<Task>('tasks');
        const attachmentsStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;

        if (isEditing && taskId) {
          savedTask = await tasksCollection.find(taskId);
          await savedTask.update(t => {
            t.todo = todo;
            t.description = description;
            t.attachmentUri = attachmentsStr;
          });
        } else {
          savedTask = await tasksCollection.create(t => {
            t.todo = todo;
            t.description = description;
            t.completed = false;
            t.userId = user.id;
            t.attachmentUri = attachmentsStr;
          });
        }
      });

      // Sincronización con el servidor (Offline-First)
      if (savedTask) {
        const taskToSync = savedTask as Task;
        try {
          if (isEditing && taskToSync.apiId) {
            await updateTask(taskToSync.apiId, todo, taskToSync.completed);
          } else if (!isEditing) {
            const apiResponse = await createTask(todo, false, parseInt(user.id, 10) || 1);
            await database.write(async () => {
              await taskToSync.update(t => {
                t.apiId = apiResponse.id;
              });
            });
          }
        } catch (apiErr) {
          if (__DEV__) console.log('[API Sync] Fallo al sincronizar (Modo Offline)');
        }
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo guardar la tarea localmente.');
      console.error(error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    Alert.alert('Confirmar', '¿Seguro que deseas eliminar esta tarea?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive',
        onPress: async () => {
          try {
            const task = await database.get<Task>('tasks').find(taskId);
            const apiId = task.apiId;
            
            await database.write(async () => {
              await task.markAsDeleted();
            });

            // Intento de eliminación en el servidor
            if (apiId) {
              deleteApiTask(apiId).catch(() => {
                if (__DEV__) console.log('[API Sync] No se pudo eliminar en el servidor (Offline)');
              });
            }

            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la tarea');
          }
        }
      }
    ]);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Primero verificar si el permiso ya está otorgado
        const hasPermissionAlready = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        
        if (hasPermissionAlready) {
          return true;
        }

        // Si no está otorgado, solicitar el permiso
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Permiso de Cámara",
            message: "Donezo necesita acceso a tu cámara para que puedas adjuntar fotos a tus tareas.",
            buttonNeutral: "Preguntar luego",
            buttonNegative: "Cancelar",
            buttonPositive: "OK"
          }
        );
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[Camera Permission Error]', err);
        return false;
      }
    }
    return true; // iOS maneja permisos de forma diferente o el módulo nativo lo hace
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        "Permiso de Cámara Requerido",
        "Para capturar fotos, necesitas otorgar permiso a la cámara. Puedes cambiarlo en la configuración de la aplicación.",
        [
          { text: "Entendido", style: "default" },
        ]
      );
      return;
    }

    try {
      if (__DEV__) console.log('[DEBUG] Solicitando cámara nativa...');
      const uri = await CameraModule.takePhoto();
      
      if (!uri) {
        if (__DEV__) console.warn('[DEBUG] La cámara no devolvió ninguna URI.');
        return;
      }

      if (uri === 'cancel' || uri === 'cancelled') {
        if (__DEV__) console.log('[DEBUG] El usuario canceló la captura de foto.');
        return;
      }

      if (__DEV__) console.log('[DEBUG] Foto capturada exitosamente:', uri);
      setAttachments(prev => [...prev, uri]);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (__DEV__) console.error('[ERROR] Fallo en la captura de foto:', errorMsg);
      
      // Detectar si es cancelación
      if (errorMsg.toLowerCase().includes('cancelled') || 
          errorMsg.toLowerCase().includes('cancel') ||
          errorMsg.toLowerCase().includes('user cancelled')) {
        return;
      }

      // Detectar si es error de permiso
      if (errorMsg.toLowerCase().includes('permission') || 
          errorMsg.toLowerCase().includes('denied') ||
          errorMsg.toLowerCase().includes('revoked')) {
        Alert.alert(
          "Permiso Revocado",
          "El permiso de cámara ha sido revocado. Por favor, ve a Configuración > Aplicaciones > Donezo y otorga permiso de cámara.",
          [
            { text: "Entendido", style: "default" }
          ]
        );
        return;
      }

      Alert.alert(
        'Error de Cámara', 
        'No se pudo abrir la cámara o guardar la imagen. Verifica los permisos de la aplicación en la configuración del sistema.'
      );
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.headerButton}>
            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700' }}>
              {loading ? '...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Título</Text>
            <TextInput
              style={[styles.titleInput, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface }]}
              placeholder="¿Qué necesitas hacer?"
              placeholderTextColor={theme.colors.textDisabled}
              value={todo}
              onChangeText={setTodo}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.descriptionInput, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface }]}
              placeholder="Añade más detalles aquí..."
              placeholderTextColor={theme.colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.mediaSection}>
            <View style={styles.mediaHeader}>
              <Text style={[styles.mediaTitle, { color: theme.colors.textSecondary }]}>Archivos Adjuntos</Text>
              <TouchableOpacity onPress={handleTakePhoto} style={[styles.cameraButton, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={{ color: theme.colors.primary }}>+ Foto</Text>
              </TouchableOpacity>
            </View>

            {attachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsRow}>
                {attachments.map((uri, index) => (
                  <TouchableOpacity key={index.toString()} onPress={() => setSelectedImage(uri)} activeOpacity={0.8}>
                    <View style={styles.attachmentWrapper}>
                      <Image source={{ uri }} style={styles.attachmentImage} />
                      <TouchableOpacity style={styles.removeButton} onPress={() => removeAttachment(index)}>
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: theme.colors.textDisabled, marginTop: 8 }}>No hay fotos adjuntas.</Text>
            )}
          </View>

          {isEditing && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Eliminar Tarea</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* IMAGE VIEWER MODAL */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setSelectedImage(null)}>
            <Text style={styles.closeModalText}>✕</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerButton: {
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  content: {
    padding: 16,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  titleInput: {
    fontSize: 18,
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  descriptionInput: {
    fontSize: 16,
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    textAlignVertical: 'top',
  },
  mediaSection: {
    marginTop: 16,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cameraButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attachmentsRow: {
    flexDirection: 'row',
  },
  attachmentWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#ddd',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF5630',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  deleteText: {
    color: '#FF5630',
    fontSize: 16,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  zoomContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
});

export default TaskFormScreen;
