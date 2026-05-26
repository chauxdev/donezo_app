import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import User from './User';

export default class Task extends Model {
  static table = 'tasks';

  static associations = {
    users: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @field('api_id') apiId!: number;
  @field('todo') todo!: string;
  @field('description') description!: string;
  @field('completed') completed!: boolean;
  @field('user_id') userId!: string;
  @field('attachment_uri') attachmentUri?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('users', 'user_id') user!: import('@nozbe/watermelondb/Relation').default<User>;

  get isCompleted(): boolean {
    return this.completed;
  }
}
