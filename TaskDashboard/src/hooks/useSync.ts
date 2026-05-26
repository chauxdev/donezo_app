import { useState, useEffect, useCallback } from 'react';
import { fetchTasks } from '../api/tasksApi';
import { bulkUpsertTasks } from '../database/taskRepository';
import { AppError } from '../types';
import useAuthStore from '../store/authStore';

/**
 * Hook para orquestar la sincronización de tareas de la API hacia la base de datos local (WatermelonDB).
 * Implementa una lógica 'silenciosa' para no interrumpir la experiencia offline del usuario.
 */
export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const { user } = useAuthStore();

  /**
   * Ejecuta el proceso de sincronización. 
   * Si silent es true, no actualiza el estado de error de forma que bloquee la UI.
   */
  const syncTasks = useCallback(async (silent = false) => {
    // Evitamos bloquear la sincronización por ausencia de sesión: en la primera apertura
    // queremos poblar la BD local con datos de ejemplo desde DummyJSON. Si no hay usuario
    // activo, se usará el id por defecto '1'.
    const targetUserId = user?.id || '1';

    if (isSyncing) return;

    setIsSyncing(true);
    if (!silent) setError(null);

    try {
      // 1. Intentar obtener datos de la API
      const apiTasks = await fetchTasks();

      // 2. Persistir en la DB local priorizando IDs de servidor
      await bulkUpsertTasks(apiTasks, targetUserId);

      setLastSyncAt(new Date());
      setError(null);
    } catch (err) {
      const appError = err as AppError;

      // Si es un error de red y estamos en modo silencioso, no molestamos al usuario
      if (appError.code === 'NETWORK_ERROR' && silent) {
        if (__DEV__) console.log('[useSync] Fallo de red silencioso - operando en modo offline');
      } else {
        setError(appError.message || 'Error de sincronización');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing]);

  // Sincronización inicial silenciosa al entrar a la app
  useEffect(() => {
    syncTasks(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isSyncing, error, lastSyncAt, syncTasks };
};
