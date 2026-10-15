import { Router } from 'express';
import { createUser } from './create-user.js';
import { getUser } from './get-user.js';
import { fetchUsers } from './fetch-users.js';
import { updateUser } from './update-user.js';
import { deleteUser } from './delete-user.js';

export const usersRoutes = Router();

usersRoutes.post('/', createUser);
usersRoutes.get('/', fetchUsers);
usersRoutes.get('/:id', getUser);
usersRoutes.put('/:id', updateUser);
usersRoutes.patch('/:id', updateUser);
usersRoutes.delete('/:id', deleteUser);
