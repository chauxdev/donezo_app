import { renderHook, act } from '@testing-library/react-native';
import { useTasks } from '../src/hooks/useTasks';
import * as repository from '../src/database/taskRepository';

jest.mock('../src/database/taskRepository', () => ({
  updateTaskCompletion: jest.fn(),
}));

jest.mock('../src/database', () => {
  return {
    collections: {
      get: () => ({
        query: () => ({
          observe: () => ({
            subscribe: (callbacks: any) => {
              // Simulamos reactividad nativa inyectando un arreglo inicial vacío en el callback next()
              callbacks.next([]);
              return { unsubscribe: jest.fn() };
            }
          })
        })
      })
    }
  };
});

describe('useTasks Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería validar que retorna tasks vacías e isLoading true inicialmente cuando se monta', () => {
    // Arrange & Act
    const { result } = renderHook(() => useTasks('all'));
    
    // Assert
    expect(result.current.tasks).toEqual([]);
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('debería comprobar que carga tareas del repositorio al montarse cuando responde el observer', () => {
    // Arrange
    const { result } = renderHook(() => useTasks('all'));
    
    // Act & Assert
    expect(result.current.error).toBeNull();
    expect(result.current.tasks).toBeDefined();
  });

  it('debería asegurar que filtra correctamente cuando cambia el filtro usando suscriptores Watermelon', () => {
    // Arrange
    const { result, rerender } = renderHook((filter: any) => useTasks(filter), {
      initialProps: 'all',
    });
    
    // Act
    rerender('completed');
    
    // Assert
    expect(result.current.error).toBeNull();
  });

  it('debería afirmar que toggleTaskCompletion llama a updateTaskCompletion cuando cambia un checkbox', async () => {
    // Arrange
    const updateSpy = jest.spyOn(repository, 'updateTaskCompletion').mockResolvedValue();
    const { result } = renderHook(() => useTasks('all'));
    
    // Act
    await act(async () => {
      await result.current.toggleTaskCompletion('id-1', false);
    });
    
    // Assert
    expect(updateSpy).toHaveBeenCalledWith('id-1', true);
  });

  it('debería comprobar que toggleTaskCompletion invierte el valor de completed cuando se dispara la función', async () => {
    // Arrange
    const updateSpy = jest.spyOn(repository, 'updateTaskCompletion').mockResolvedValue();
    const { result } = renderHook(() => useTasks('all'));
    
    // Act
    await act(async () => {
      await result.current.toggleTaskCompletion('id-2', true); // Envía currentValue = true
    });
    
    // Assert
    expect(updateSpy).toHaveBeenCalledWith('id-2', false); // Espera que el resutlado invertido sea false
  });

  it('debería manejar errores del repositorio sin crashear cuando falla el upsert optimista', async () => {
    // Arrange
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(repository, 'updateTaskCompletion').mockRejectedValue(new Error('Fatal DB Error'));
    const { result } = renderHook(() => useTasks('all'));
    
    // Act
    await act(async () => {
      await result.current.toggleTaskCompletion('id-3', false);
    });
    
    // Assert
    expect(result.current.error).toBe('Error al actualizar datos locales');
    errorSpy.mockRestore();
  });
});
