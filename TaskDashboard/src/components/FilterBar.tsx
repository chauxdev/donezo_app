import React, { memo, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { TaskFilter, TaskCounts } from '../types';
import { useTheme, Theme } from '../theme';

interface FilterBarProps {
  activeFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  counts: TaskCounts;
}

/**
 * Barra superior que contiene los filtros de visualización de tareas.
 * Totalmente memorizada para evitar renders inútiles cuando cambia el estado de items individuales.
 */
const FilterBar: React.FC<FilterBarProps> = ({ activeFilter, onFilterChange, counts }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      <FilterButton
        id="all"
        label={`Todas (${counts.total})`}
        icon="📋"
        isActive={activeFilter === 'all'}
        onPress={() => onFilterChange('all')}
        theme={theme}
      />
      <FilterButton
        id="pending"
        label={`Pendientes (${counts.pending})`}
        icon="⏳"
        isActive={activeFilter === 'pending'}
        onPress={() => onFilterChange('pending')}
        theme={theme}
      />
      <FilterButton
        id="completed"
        label={`Completadas (${counts.completed})`}
        icon="✅"
        isActive={activeFilter === 'completed'}
        onPress={() => onFilterChange('completed')}
        theme={theme}
      />
    </View>
  );
};

interface FilterButtonProps {
  id: TaskFilter;
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
  theme: Theme;
}

/**
 * Componente interno extraído para aislar la animación de color de fondo (interpolate)
 * evitando que cambien los props de otros botones de la barra al hacer tap.
 */
const FilterButton: React.FC<FilterButtonProps> = ({ id, label, icon, isActive, onPress, theme }) => {
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive, bgAnim]);

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface2, theme.colors.primary]
  });

  const textColor = isActive ? '#FFFFFF' : theme.colors.textSecondary;
  const shadowStyle = isActive ? {
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  } : {};

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Filtro: ${label}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={localStyles.buttonWrapper}
    >
      <Animated.View style={[
        localStyles.buttonAnimView,
        { backgroundColor: backgroundColor as unknown as string, borderRadius: theme.borderRadius.full },
        shadowStyle
      ]}>
        <Text style={localStyles.buttonIcon}>{icon}</Text>
        <Text 
          style={[localStyles.buttonText, { color: textColor }]} 
          numberOfLines={1} 
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Estilos globales de la barra generados a partir de useTheme
const makeStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16, // Padding solicitado
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    ...(isDark ? {} : {
      elevation: 2, // Sombra suave en modo claro requerida
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
    })
  }
});

// Estilos fijos para evitar recreación de objetos por el hook (optimización extrema)
const localStyles = StyleSheet.create({
  buttonWrapper: {
    flex: 1, 
    marginHorizontal: 4,
  },
  buttonAnimView: {
    paddingVertical: 8, 
    paddingHorizontal: 4, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    fontSize: 13, 
    fontWeight: '500',
  }
});

export default memo(FilterBar);
