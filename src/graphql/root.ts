import { User } from '../models/User';

export const root = {
  helloWorld: () => 'Hello world!',
  newUser: User.signUp,
  me: User.me,
};