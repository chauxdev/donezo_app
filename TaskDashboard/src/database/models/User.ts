import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  static associations = {
    tasks: { type: 'has_many' as const, foreignKey: 'user_id' },
  };

  @field('username') username!: string;
  @field('password') password!: string;
  @field('name') name!: string;
  @field('last_name') lastName!: string;
  @field('age') age!: number;
  
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('tasks') tasks!: any;
}
