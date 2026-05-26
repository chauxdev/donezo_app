import { Q } from '@nozbe/watermelondb';
import database from './index';
import Task from './models/Task';
import { TaskFilter, ApiTask, TaskCounts } from '../types';

/**
 * Retrieves all tasks from the database, ordered by creation date (newest first).
 * @returns A promise that resolves to an array of Task models.
 */
export const getAllTasks = async (): Promise<Task[]> => {
  try {
    return await database.collections
      .get<Task>('tasks')
      .query(Q.sortBy('created_at', Q.desc))
      .fetch();
  } catch (error: any) {
    console.error('Error fetching all tasks:', error?.message || error);
    throw error;
  }
};

/**
 * Retrieves tasks filtered by their completion status.
 * @param filter The filter to apply ('all', 'completed', or 'pending').
 * @returns A promise that resolves to an array of filtered Task models.
 */
export const getTasksByFilter = async (filter: TaskFilter): Promise<Task[]> => {
  try {
    const collection = database.collections.get<Task>('tasks');
    switch (filter) {
      case 'completed':
        return await collection
          .query(Q.where('completed', true), Q.sortBy('created_at', Q.desc))
          .fetch();
      case 'pending':
        return await collection
          .query(Q.where('completed', false), Q.sortBy('created_at', Q.desc))
          .fetch();
      case 'all':
      default:
        return await getAllTasks();
    }
  } catch (error: any) {
    console.error(`Error fetching tasks by filter ${filter}:`, error?.message || error);
    throw error;
  }
};

/**
 * Retrieves the count of total, completed, and pending tasks.
 * @returns A promise that resolves to a TaskCounts object.
 */
export const getTaskCount = async (): Promise<TaskCounts> => {
  try {
    const collection = database.collections.get<Task>('tasks');

    const [total, completed, pending] = await Promise.all([
      collection.query().fetchCount(),
      collection.query(Q.where('completed', true)).fetchCount(),
      collection.query(Q.where('completed', false)).fetchCount(),
    ]);

    return { total, completed, pending };
  } catch (error: any) {
    console.error('Error fetching task counts:', error?.message || error);
    throw error;
  }
};

/**
 * Updates the completion status of a specific task.
 * Operates locally without requiring an internet connection.
 * @param taskId The local ID of the task to update.
 * @param completed The new completion status to set.
 * @returns A promise that resolves when the update is complete.
 */
export const updateTaskCompletion = async (taskId: string, completed: boolean): Promise<void> => {
  try {
    await database.write(async () => {
      const task = await database.collections.get<Task>('tasks').find(taskId);
      await task.update((t) => {
        t.completed = completed;
      });
    });
  } catch (error: any) {
    console.error(`Error updating completion status for task ${taskId}:`, error?.message || error);
    throw error;
  }
};

/**
 * Upserts a list of tasks from the API into the local database in bulk.
 * Inserts new tasks or updates existing ones (by api_id) efficiently.
 * @param apiTasks The array of tasks fetched from the external API.
 * @param targetUserId The ID of the local user to associate these tasks with.
 * @returns A promise that resolves when the batch operation is complete.
 */
export const bulkUpsertTasks = async (apiTasks: ApiTask[], targetUserId: string): Promise<void> => {
  try {
    const collection = database.collections.get<Task>('tasks');

    await database.write(async () => {
      // Query tasks for this specific user or global ones (though in this app usually it's per user now)
      const existingTasks = await collection.query(Q.where('user_id', targetUserId)).fetch();

      const existingTaskMap = new Map<number, Task>();
      existingTasks.forEach(task => {
        if (task.apiId) {
          existingTaskMap.set(task.apiId, task);
        }
      });

      const batchOperations = apiTasks.map(apiTask => {
        const existingTask = existingTaskMap.get(apiTask.id);

        if (existingTask) {
          return existingTask.prepareUpdate(task => {
            task.todo = apiTask.todo;
            task.completed = apiTask.completed;
            task.userId = targetUserId;
          });
        } else {
          return collection.prepareCreate(task => {
            task.apiId = apiTask.id;
            task.todo = apiTask.todo;
            task.completed = apiTask.completed;
            task.userId = targetUserId;
          });
        }
      });

      if (batchOperations.length > 0) {
        await database.batch(...batchOperations);
      }
    });
  } catch (error: any) {
    console.error('Error in bulk upsert of tasks:', error?.message || error);
    throw error;
  }
};
