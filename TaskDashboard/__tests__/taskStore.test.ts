import useTaskStore from '../src/store/taskStore';
import { TaskFilter, SyncState } from '../src/types';

describe('useTaskStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTaskStore.getState().resetStore();
  });

  it('debería verificar que el filtro inicial es \'all\' cuando el store se crea', () => {
    // Arrange & Act
    const { filter } = useTaskStore.getState();
    
    // Assert
    expect(filter).toBe('all');
  });

  it('debería asegurar que setFilter cambia el filtro activo cuando recibe un nuevo string válido', () => {
    // Arrange
    const newFilter: TaskFilter = 'completed';
    
    // Act
    useTaskStore.getState().setFilter(newFilter);
    
    // Assert
    expect(useTaskStore.getState().filter).toBe(newFilter);
  });

  it('debería validar que setSyncState actualiza el estado de sync cuando cambian los booleanos', () => {
    // Arrange
    const newState: Partial<SyncState> = { isSyncing: true, error: 'Hubo un fallo' };
    
    // Act
    useTaskStore.getState().setSyncState(newState);
    
    // Assert
    const syncState = useTaskStore.getState().syncState;
    expect(syncState.isSyncing).toBe(true);
    expect(syncState.error).toBe('Hubo un fallo');
  });

  it('debería comprobar que setSyncState fusiona con estado existente (Partial) cuando se actualiza a pedazos', () => {
    // Arrange
    const date = new Date();
    useTaskStore.getState().setSyncState({ lastSyncAt: date, error: null });
    
    // Act
    useTaskStore.getState().setSyncState({ isSyncing: true });
    
    // Assert
    const currentSyncState = useTaskStore.getState().syncState;
    expect(currentSyncState.isSyncing).toBe(true);
    expect(currentSyncState.lastSyncAt).toBe(date);
    expect(currentSyncState.error).toBe(null);
  });

  it('debería probar que resetStore devuelve al estado inicial cuando fue modificado previamente', () => {
    // Arrange
    useTaskStore.getState().setFilter('pending');
    useTaskStore.getState().setSyncState({ isSyncing: true, error: 'Error' });
    
    // Act
    useTaskStore.getState().resetStore();
    
    // Assert
    const { filter, syncState } = useTaskStore.getState();
    expect(filter).toBe('all');
    expect(syncState.isSyncing).toBe(false);
    expect(syncState.error).toBeNull();
  });
});
