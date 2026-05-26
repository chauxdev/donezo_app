import React, { memo, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Task from '../database/models/Task';
import { useTheme, Theme } from '../theme';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onImagePress?: (uri: string) => void;
}

/**
 * Componente memoizado para renderizar individualmente cada tarjeta de tarea.
 * Incluye animaciones fluidas de UI sin afectar el hilo de JS gracias al native driver (cuando es soportado).
 */
const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onImagePress }) => {
  const { theme, isDark } = useTheme();
  
  // Memorizar los estilos computados del componente basado en el tema activo
  const styles = useMemo(() => makeStyles(theme, isDark), [theme, isDark]);

  // Animaciones de entrada (mount)
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animación interactiva del checkbox
  const scale = useRef(new Animated.Value(1)).current;
  
  // Animación del color de texto (requiere Animated.Text y no usar nativeDriver)
  const isCompleted = task.isCompleted;
  const colorAnim = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    // FadeIn + TranslateY ascendente al montar la tarjeta
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    // Animación de color sincronizada con el estado local optimista de completado
    Animated.timing(colorAnim, {
      toValue: isCompleted ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isCompleted, colorAnim]);

  /**
   * Dispara el callback de actualización y corre la micro-animación spring del checkbox
   */
  const handleToggle = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.8, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1.0, useNativeDriver: true, speed: 50 }),
    ]).start();

    // Invoca la actualización optimista proporcionada por el contenedor superior
    onToggle(task.id, isCompleted);
  };

  // Interpolación segura de colores para Animated.Text
  const textColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.textPrimary, theme.colors.textDisabled]
  });

  const attachments = useMemo(() => {
    if (!task.attachmentUri) return [];
    try {
      const parsed = JSON.parse(task.attachmentUri);
      return Array.isArray(parsed) ? parsed : [task.attachmentUri];
    } catch {
      return [task.attachmentUri];
    }
  }, [task.attachmentUri]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(task.createdAt);
  }, [task.createdAt]);

  return (
    <Animated.View style={[
      styles.container, 
      { opacity, transform: [{ translateY }] }, 
      isCompleted ? styles.containerCompleted : styles.containerPending
    ]}>
      {/* Checkbox circular interactivo */}
      <TouchableOpacity 
        style={styles.checkboxContainer} 
        onPress={handleToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.checkbox, isCompleted && styles.checkboxCompleted, { transform: [{ scale }] }]}>
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>
      </TouchableOpacity>

      {/* Título y descripción de la tarea */}
      <View style={styles.contentContainer}>
        <Animated.Text 
          style={[styles.title, { color: textColor as unknown as string }, isCompleted && styles.titleCompleted]} 
          numberOfLines={1}
        >
          {task.todo}
        </Animated.Text>
        
        {task.description ? (
          <Text 
            style={[styles.description, { color: theme.colors.textSecondary }]} 
            numberOfLines={1}
          >
            {task.description}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            {formattedDate}
          </Text>

          {attachments.length > 0 && (
            <TouchableOpacity 
              style={styles.attachmentsPreview} 
              onPress={() => onImagePress && onImagePress(attachments[0])}
              activeOpacity={0.6}
            >
              <Text style={[styles.attachmentIcon, { color: theme.colors.textSecondary }]}>📷 Ver adjunto</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const makeStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    // Comportamiento de sombra diferente según el tema
    ...(isDark ? {
      borderWidth: 1,
      borderColor: theme.colors.border,
    } : {
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    })
  },
  containerPending: {
    borderLeftColor: theme.colors.primary,
  },
  containerCompleted: {
    borderLeftColor: theme.colors.success,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: theme.typography.bodyMedium.fontSize,
    // Workaround estricto para TS + Animated.Text (ya que FontWeight literal puede chocar)
    fontWeight: theme.typography.bodyMedium.fontWeight as any,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  attachmentsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentIcon: {
    fontSize: 11,
  },
});

export default memo(TaskItem);