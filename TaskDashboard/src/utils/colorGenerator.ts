/**
 * Extrae hasta dos iniciales de un nombre completo.
 * @param name El texto del cual extraer iniciales
 * @returns Hasta 2 caracteres en mayúsculas, o '?' si no hay nombre válido
 */
export const getInitials = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const words = trimmed.split(/\s+/);
  const firstInitial = words[0]?.charAt(0).toUpperCase() || '';
  const secondInitial = words.length > 1 ? words[words.length - 1]?.charAt(0).toUpperCase() : '';
  
  const initials = (firstInitial + secondInitial).slice(0, 2);
  return initials || '?';
};

/**
 * Función hashCode pura idéntica a String.hashCode() en Java.
 * Garantiza que la semilla para el generador de color JS sea igual a la de Android.
 * @param str La cadena a hashear
 * @returns Integer de 32 bits
 */
export const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // Equivalente a hash * 31 + char en Java
    hash = (hash << 5) - hash + char;
    // Convierte el bit overflow a entero con signo de 32 bits
    hash = hash & hash; 
  }
  return hash;
};

/**
 * Genera un color HSL consistente basado en el hash del texto.
 * @param name El nombre usado para la semilla hash
 * @returns Color representativo hsl()
 */
export const generateColor = (name: string): string => {
  const hash = hashString(name);
  const hue = Math.abs(hash) % 360;
  // Estos valores HSL son el equivalente óptico aproximado 
  // del HSV(hue, 0.6f, 0.8f) en Kotlin.
  return `hsl(${hue}, 60%, 55%)`;
};
