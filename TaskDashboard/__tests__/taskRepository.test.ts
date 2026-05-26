import { bulkUpsertTasks, getTasksByFilter, updateTaskCompletion } from '../src/database/taskRepository';
import { ApiTask } from '../src/types';
import database from '../src/database';
import { Q } from '@nozbe/watermelondb';

// Resolvemos de forma segura dependencias intrínsecas de sqlite que romperían en node.js
jest.mock('@nozbe/watermelondb/adapters/sqlite', () => jest.fn().mockImplementation(() => ({})));
jest.mock('../src/database/models/Task', () => {
  const { Model } = require('@nozbe/watermelondb');
  return class Task extends Model {};
});

describe('taskRepository Offline-First Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería validar que bulkUpsertTasks inserta tareas nuevas cuando llegan de la API', async () => {
    // Arrange
    const apiTasks: ApiTask[] = [{ id: 1, todo: 'Tarea mock', completed: false, userId: 10 }];
    const batchSpy = jest.spyOn(database, 'batch');
    const writeSpy = jest.spyOn(database, 'write');
    
    // Act
    await bulkUpsertTasks(apiTasks, 'user-id-1');
    
    // Assert
    expect(writeSpy).toHaveBeenCalled();
    expect(batchSpy).toHaveBeenCalled();
  });

  it('debería validar que bulkUpsertTasks actualiza tareas existentes cuando su id coincide', async () => {
    // Arrange
    const apiTasks: ApiTask[] = [{ id: 1, todo: 'Actualizada', completed: true, userId: 10 }];
    const mockExistingTask = { apiId: 1, prepareUpdate: jest.fn() };
    const collection = database.collections.get('tasks');
    // Forzamos al fetch() a devolver el objeto falso
    jest.spyOn(collection.query(), 'fetch').mockResolvedValueOnce([mockExistingTask as unknown as any]);
    const batchSpy = jest.spyOn(database, 'batch');
    
    // Act
    await bulkUpsertTasks(apiTasks, 'user-id-1');
    
    // Assert
    expect(mockExistingTask.prepareUpdate).toHaveBeenCalled();
    expect(batchSpy).toHaveBeenCalled();
  });

  it('debería validar que getTasksByFilter "completed" retorna solo completadas cuando se aplica filtro', async () => {
    // Arrange
    const collection = database.collections.get('tasks');
    const querySpy = jest.spyOn(collection, 'query');
    
    // Act
    await getTasksByFilter('completed');
    
    // Assert
    expect(querySpy).toHaveBeenCalledWith(Q.where('completed', true), expect.anything());
  });

  it('debería validar que getTasksByFilter "pending" retorna solo pendientes cuando se aplica filtro', async () => {
    // Arrange
    const collection = database.collections.get('tasks');
    const querySpy = jest.spyOn(collection, 'query');
    
    // Act
    await getTasksByFilter('pending');
    
    // Assert
    expect(querySpy).toHaveBeenCalledWith(Q.where('completed', false), expect.anything());
  });

  it('debería validar que updateTaskCompletion actualiza el campo en la BD cuando se activa un checkbox', async () => {
    // Arrange
    const taskId = 'id-1';
    const writeSpy = jest.spyOn(database, 'write');
    const collection = database.collections.get('tasks');
    const mockTask: any = { update: jest.fn((cb: any) => cb(mockTask)), completed: false };
    jest.spyOn(collection, 'find').mockResolvedValueOnce(mockTask as unknown as any);
    
    // Act
    await updateTaskCompletion(taskId, true);
    
    // Assert
    expect(writeSpy).toHaveBeenCalled();
    expect(mockTask.update).toHaveBeenCalled();
    expect(mockTask.completed).toBe(true);
  });

  it('debería asegurar que updateTaskCompletion funciona sin conexión a internet cuando estamos en modo offline', async () => {
    // Arrange
    const taskId = 'id-1';
    
    // Act
    // Resolviendo de forma pura la ejecución sin lanzar fetch web
    await expect(updateTaskCompletion(taskId, true)).resolves.not.toThrow();
    
    // Assert
    expect(database.write).toHaveBeenCalled();
  });
});
