import { generateColor, hashString, getInitials } from '../src/utils/colorGenerator';

describe('colorGenerator Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería generar el mismo color para el mismo nombre cuando se ejecuta múltiples veces', () => {
    // Arrange
    const name = 'Usuario Prueba';
    
    // Act
    const result1 = generateColor(name);
    const result2 = generateColor(name);
    
    // Assert
    expect(result1).toBe(result2);
  });

  it('debería generar colores diferentes para nombres diferentes cuando los hashes difieren', () => {
    // Arrange
    const name1 = 'Ana Silva';
    const name2 = 'Carlos Ramirez';
    
    // Act
    const result1 = generateColor(name1);
    const result2 = generateColor(name2);
    
    // Assert
    expect(result1).not.toBe(result2);
  });

  it('debería extraer iniciales correctas de nombre completo cuando tiene varias palabras', () => {
    // Arrange
    const fullName = 'Juan Perez Gomez';
    
    // Act
    const initials = getInitials(fullName);
    
    // Assert
    expect(initials).toBe('JG'); // Primera letra de "Juan" y de "Gomez"
  });

  it('debería manejar nombres de una sola palabra cuando no hay espacios intermedios', () => {
    // Arrange
    const singleWordName = 'Administrador';
    
    // Act
    const initials = getInitials(singleWordName);
    
    // Assert
    expect(initials).toBe('A');
  });

  it('debería manejar cadena vacía sin crashear cuando el nombre es nulo o espacios', () => {
    // Arrange
    const emptyName = '   ';
    
    // Act
    const initials = getInitials(emptyName);
    
    // Assert
    expect(initials).toBe('?');
  });

  it('debería retornar un string HSL válido cuando el color retornado es procesado', () => {
    // Arrange
    const name = 'Test Validation';
    
    // Act
    const color = generateColor(name);
    
    // Assert
    expect(color).toMatch(/^hsl\(\d+,\s*60%,\s*55%\)$/);
  });
});
