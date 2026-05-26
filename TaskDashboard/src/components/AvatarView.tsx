import React from 'react';
import { requireNativeComponent, StyleProp, ViewStyle, View, Text, StyleSheet } from 'react-native';
import { getInitials, generateColor } from '../utils/colorGenerator';

interface AvatarViewProps {
  /** Nombre del usuario para procesar las iniciales y el color. */
  name: string;
  /** Tamaño del Avatar (ancho y alto). Por defecto: 44. */
  size?: number;
  /** Estilos adicionales sobreescritos para la vista padre. */
  style?: StyleProp<ViewStyle>;
}

// Inicialización defensiva de NativeComponent
let NativeAvatarView: React.ComponentType<AvatarViewProps> | null = null;

try {
  // Enlazamos directamente el componente con el nombre provisto en NAME en Kotlin
  NativeAvatarView = requireNativeComponent<AvatarViewProps>('AvatarView');
} catch (error) {
  if (__DEV__) {
    console.warn('[AvatarView] Fallback activo: Módulo nativo "AvatarView" no linkeado o ausente.', error);
  }
}

/**
 * AvatarView - Wrapper Inteligente.
 * Renderiza nativamente en Android vía ViewManager personalizado para ultra alto rendimiento, 
 * pero implementa un Fallback JS por seguridad (e.g. en iOS si no existe equivalente Swift o sin build).
 */
const AvatarView: React.FC<AvatarViewProps> = ({ name, size = 44, style }) => {
  const dynamicStyle = { width: size, height: size };

  // 1. Ruta Nativa Ultra Optimizada
  if (NativeAvatarView) {
    return <NativeAvatarView name={name} style={[dynamicStyle, style]} />;
  }

  // 2. Ruta Fallback Javascript puro (Replica lógica y visual al 100%)
  const backgroundColor = generateColor(name);
  const initials = getInitials(name);
  
  return (
    <View style={[styles.fallbackContainer, dynamicStyle, { backgroundColor, borderRadius: size / 2 }, style]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});

export default AvatarView;
