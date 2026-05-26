import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 3, // Incremented version for schema change
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'username', type: 'string', isIndexed: true },
        { name: 'password', type: 'string' }, // In a real app this would be hashed, but offline we store locally
        { name: 'name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'age', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'api_id', type: 'number', isIndexed: true },
        { name: 'todo', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'completed', type: 'boolean' },
        { name: 'user_id', type: 'string', isIndexed: true }, // Changed to string for watermelon id linkage
        { name: 'attachment_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
