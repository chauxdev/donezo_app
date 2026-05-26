import { useState, useEffect, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import Task from '../database/models/Task';
import { updateTaskCompletion } from '../database/taskRepository';
import { TaskFilter } from '../types';
import useAuthStore from '../store/authStore';

/**
 * Hook para la lectura y mutación reactiva de tareas desde WatermelonDB.
 * Proporciona suscripción en tiempo real a los cambios y actualizaciones optimistas en UI.
 * 
 * @param filter El filtro que se aplicará ('all', 'completed', 'pending').
 * @returns {object} Las tareas observables, estados de carga, error y función de toggle.
 */
export const useTasks = (filter: TaskFilter) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    // Permitimos lectura desde la BD local incluso si no hay sesión activa. Si no hay usuario
    // se consultará el usuario por defecto '1' (poblado por la sincronización inicial).
    const targetUserId = user?.id || '1';

    let isSubscribed = true;
    setIsLoading(true);
    
    const collection = database.collections.get<Task>('tasks');
    let query;

    const baseConditions = [Q.where('user_id', targetUserId)];

    // Se configura la query reactiva de WatermelonDB según el filtro
    switch (filter) {
      case 'completed':
        query = collection.query(...baseConditions, Q.where('completed', true), Q.sortBy('created_at', Q.desc));
        break;
      case 'pending':
        query = collection.query(...baseConditions, Q.where('completed', false), Q.sortBy('created_at', Q.desc));
        break;
      case 'all':
      default:
        query = collection.query(...baseConditions, Q.sortBy('created_at', Q.desc));
        break;
    }

    // La suscripción asegura que si la DB cambia (por ejemplo por una sincronización de fondo)
    // la UI se actualizará al instante.
    const subscription = query.observe().subscribe({
      next: (observedTasks) => {
        if (isSubscribed) {
          setTasks(observedTasks);
          setIsLoading(false);
          setError(null);
        }
      },
      error: (err) => {
        if (isSubscribed) {
          if (__DEV__) {
            console.error('Error al observar tareas en WatermelonDB:', err?.message || err);
          }
          setError('Error al leer datos locales');
          setIsLoading(false);
        }
      }
    });

    // Cleanup del effect
    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [filter, user?.id]);

  /**
   * Cambia el estado de una tarea aplicando una actualización optimista en UI.
   * Modifica localmente primero y luego impacta en WatermelonDB.
   * 
   * @param taskId ID de WatermelonDB de la tarea a modificar.
   * @param currentValue El valor actual del campo 'completed'.
   */
  const toggleTaskCompletion = useCallback(async (taskId: string, currentValue: boolean) => {
    const newValue = !currentValue;

    if (__DEV__) {
      console.log(`[useTasks] Toggling task ${taskId} optimistically a completed=${newValue}`);
    }

    // 1. Actualización optimista: Reflejamos el cambio en UI INMEDIATAMENTE
    setTasks((currentTasks) => 
      currentTasks.map(task => {
        if (task.id === taskId) {
          // Usamos un Proxy para engañar a la vista y devolver el nuevo valor
          // sin romper las protecciones e inmutabilidad estricta del Model de WatermelonDB.
          return new Proxy(task, {
            get(target, prop, receiver) {
              if (prop === 'completed' || prop === 'isCompleted') return newValue;
              return Reflect.get(target, prop, receiver);
            }
          }) as Task;
        }
        return task;
      })
    );

    // 2. Persistencia en base de datos local (Offline-First)
    try {
      await updateTaskCompletion(taskId, newValue);
      // Al ser reactivo el query.observe() de WatermelonDB, si hay éxito,
      // lanzará silenciosamente otro 'next' a la UI asegurando sincronización total con la BD real.
    } catch (err: any) {
      if (__DEV__) {
        console.error(`[useTasks] Error mutando tarea ${taskId}, revirtiendo cambio optimista.`, err?.message || err);
      }
      
      // Revirtiendo la actualización optimista tras el error
      setTasks((currentTasks) => 
        currentTasks.map(task => {
          if (task.id === taskId) {
            return new Proxy(task, {
              get(target, prop, receiver) {
                if (prop === 'completed' || prop === 'isCompleted') return currentValue;
                return Reflect.get(target, prop, receiver);
              }
            }) as Task;
          }
          return task;
        })
      );
      setError('Error al actualizar datos locales');
    }
  }, []);

  return { tasks, isLoading, error, toggleTaskCompletion };
};
