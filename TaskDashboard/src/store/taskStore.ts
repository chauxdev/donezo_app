import { create } from 'zustand';
import { TaskStore, TaskFilter, SyncState } from '../types';

// Extendemos TaskStore para incluir resetStore sin modificar el type original
type TaskStoreWithReset = TaskStore & {
  resetStore: () => void;
};

const initialState = {
  filter: 'all' as TaskFilter,
  syncState: {
    isSyncing: false,
    lastSyncAt: null,
    error: null,
  } as SyncState,
};

const useTaskStore = create<TaskStoreWithReset>()((set) => ({
  ...initialState,

  /**
   * Cambia el filtro activo de la lista de tareas.
   * @param filter El nuevo filtro a aplicar ('all', 'completed', 'pending').
   */
  setFilter: (filter: TaskFilter) => {
    set({ filter });
  },

  /**
   * Actualiza parcialmente el estado de sincronización global.
   * Fusiona los nuevos valores con el estado actual usando spread.
   * @param state Objeto con los campos parciales a actualizar.
   */
  setSyncState: (state: Partial<SyncState>) => {
    set((prev) => ({
      syncState: { ...prev.syncState, ...state },
    }));
  },

  /**
   * Resetea todo el store al estado inicial de fábrica.
   */
  resetStore: () => {
    set(initialState);
  },
}));

/**
 * Selector conveniente para suscribir componentes únicamente al valor del filtro.
 */
export const useFilter = () => useTaskStore((s) => s.filter);

export default useTaskStore;
