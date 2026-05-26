import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiTask, ApiResponse, AppError } from '../types';
import useAuthStore from '../store/authStore';

const apiClient = axios.create({
  baseURL: 'https://dummyjson.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inyectamos el token de autenticación desde el store global
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} at ${new Date().toISOString()}`);
      (config as any).metadata = { startTime: new Date() };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de response
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (__DEV__) {
      const start = (response.config as any).metadata?.startTime;
      const duration = start ? new Date().getTime() - start.getTime() : 'unknown';
      console.log(`[API Response] Status: ${response.status} - Time: ${duration}ms`);
    }
    return response;
  },
  (error: AxiosError) => {
    const appError: AppError = {
      code: 'UNKNOWN_ERROR',
      message: 'Ocurrió un error inesperado',
      timestamp: new Date(),
      originalError: error,
    };

    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        appError.code = 'TIMEOUT_ERROR';
        appError.message = 'La conexión tardó demasiado';
      } else {
        appError.code = 'NETWORK_ERROR';
        appError.message = 'Sin conexión - usando datos locales';
      }
    } else if (error.response.status >= 500) {
      appError.code = 'SERVER_ERROR';
      appError.message = 'Servicio no disponible - usando caché local';
    } else {
      appError.code = `HTTP_${error.response.status}`;
      appError.message = `Error en el servidor: ${error.message}`;
    }

    return Promise.reject(appError);
  }
);

/**
 * Obtiene la lista de tareas desde la API externa.
 */
export const fetchTasks = async (): Promise<ApiTask[]> => {
  try {
    const response = await apiClient.get<ApiResponse>('/todos');
    return response.data.todos as ApiTask[];
  } catch (error) {
    throw error;
  }
};

/**
 * Crea una nueva tarea en el servidor.
 */
export const createTask = async (todo: string, completed: boolean, userId: number): Promise<ApiTask> => {
  try {
    const response = await apiClient.post<ApiTask>('/todos/add', {
      todo,
      completed,
      userId,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza una tarea existente en el servidor.
 */
export const updateTask = async (id: number, todo: string, completed: boolean): Promise<ApiTask> => {
  try {
    const response = await apiClient.put<ApiTask>(`/todos/${id}`, {
      todo,
      completed,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una tarea en el servidor.
 */
export const deleteTask = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/todos/${id}`);
  } catch (error) {
    throw error;
  }
};
