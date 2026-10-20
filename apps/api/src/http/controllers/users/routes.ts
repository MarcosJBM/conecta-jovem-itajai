import { Router } from 'express';
import {
  requireSession,
  requireAdmin,
  requireOwnerOrAdmin,
  requireSameOriginWrite,
} from '../../middlewares/auth.js';
import { createUser } from './create-user.js';
import { getUser } from './get-user.js';
import { fetchUsers } from './fetch-users.js';
import { updateUser } from './update-user.js';
import { deleteUser } from './delete-user.js';

export const usersRoutes = Router();

usersRoutes.post('/', createUser);
usersRoutes.get('/', requireSession, requireAdmin, fetchUsers);
usersRoutes.get('/:id', requireSession, requireOwnerOrAdmin, getUser);
usersRoutes.put(
  '/:id',
  requireSession,
  requireAdmin,
  requireSameOriginWrite,
  updateUser,
);
usersRoutes.patch(
  '/:id',
  requireSession,
  requireAdmin,
  requireSameOriginWrite,
  updateUser,
);
usersRoutes.delete(
  '/:id',
  requireSession,
  requireAdmin,
  requireSameOriginWrite,
  deleteUser,
);
