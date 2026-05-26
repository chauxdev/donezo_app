import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import Task from './models/Task';
import User from './models/User';

let database: Database;

try {
  const adapter = new SQLiteAdapter({
    schema,
    dbName: 'task_dashboard.db', // SQLite database name
    jsi: true, // Optimizes performance
    onSetUpError: error => {
      console.error('Database setup failed', error?.message || error);
    }
  });

  database = new Database({
    adapter,
    modelClasses: [Task, User],
  });

  if (__DEV__) {
    console.log('Database initialized successfully');
  }
} catch (error: any) {
  console.error('Failed to initialize database', error?.message || error);
  throw error;
}

export { Task, User as models };
export default database;
