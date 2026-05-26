/**
 * Representa una tarea dentro de la aplicación, incluyendo campos locales y remotos.
 */
export interface Task {
  /** ID proveniente de la API externa (dummyjson.com), inmutable tras la creación */
  readonly id: number;
  /** UUID local único generado al guardar la tarea en WatermelonDB */
  readonly localId: string;
  /** El texto o título descriptivo de la tarea */
  todo: string;
  /** Descripción detallada opcional de la tarea */
  description?: string;
  /** Estado de la tarea: true si está completada, false en caso contrario */
  completed: boolean;
  /** ID del usuario al que pertenece la tarea, inmutable */
  readonly userId: number;
  /** Fecha y hora en la que se creó la tarea localmente */
  createdAt: Date;
  /** Fecha y hora de la última modificación de la tarea */
  updatedAt: Date;
  /** URI opcional a una foto adjunta a la tarea */
  attachmentUri?: string;
}

/**
 * Filtro aplicable a la lista de tareas.
 */
export type TaskFilter = 'all' | 'completed' | 'pending';

/**
 * Mapeo exacto de la respuesta de una tarea desde el endpoint dummyjson.com/todos.
 */
export interface ApiTask {
  /** ID de la tarea proporcionado por la API */
  readonly id: number;
  /** El texto descriptivo de la tarea de la API */
  todo: string;
  /** Estado de la tarea devuelto por la API */
  completed: boolean;
  /** ID del usuario asociado a la tarea */
  readonly userId: number;
}

/**
 * Respuesta completa esperada del endpoint de lista de tareas (/todos).
 */
export interface ApiResponse {
  /** Arreglo inmutable de tareas devueltas por la API */
  todos: readonly ApiTask[];
  /** Total de tareas disponibles en el servidor (para paginación) */
  readonly total: number;
  /** Número de tareas omitidas en la consulta actual (para paginación) */
  readonly skip: number;
  /** Límite de tareas solicitadas en la consulta (para paginación) */
  readonly limit: number;
}

/**
 * Estado de sincronización de datos con el servidor o base de datos.
 */
export interface SyncState {
  /** Indica si hay un proceso de sincronización en curso */
  isSyncing: boolean;
  /** Fecha de la última sincronización exitosa, o null si nunca se ha sincronizado */
  lastSyncAt: Date | null;
  /** Mensaje de error de la última sincronización fallida, o null si no hubo error */
  error: string | null;
}

/**
 * Interface del estado global para Zustand, manejando filtros y sincronización.
 */
export interface TaskStore {
  /** Filtro actualmente aplicado a la vista de tareas */
  filter: TaskFilter;
  /** Estado actual del proceso de sincronización */
  syncState: SyncState;
  /** Función para actualizar el filtro de tareas */
  setFilter: (filter: TaskFilter) => void;
  /** Función para actualizar parcialmente el estado de sincronización */
  setSyncState: (state: Partial<SyncState>) => void;
}

/**
 * Estructura estándar para el manejo de errores en toda la aplicación.
 */
export interface AppError {
  /** Código identificador del error (ej. 'NETWORK_ERROR', 'DB_WRITE_FAILED') */
  code: string;
  /** Mensaje descriptivo del error legible por el desarrollador/usuario */
  message: string;
  /** Momento en el que ocurrió el error */
  timestamp: Date;
  /** Error original capturado que causó este AppError, si existe */
  originalError?: unknown;
}

/**
 * Modos de visualización del tema de la aplicación.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Contadores estadísticos de las tareas.
 */
export interface TaskCounts {
  /** Número total de tareas */
  total: number;
  /** Número de tareas marcadas como completadas */
  completed: number;
  /** Número de tareas que aún están pendientes */
  pending: number;
}

/**
 * Información sobre un archivo de imagen/foto adjunto.
 */
export interface PhotoAttachment {
  /** URI local o remota de la imagen */
  uri: string;
  /** Nombre del archivo de imagen (opcional) */
  fileName?: string;
  /** Ancho de la imagen en píxeles (opcional) */
  width?: number;
  /** Alto de la imagen en píxeles (opcional) */
  height?: number;
  /** Tamaño del archivo en bytes (opcional) */
  size?: number;
}
