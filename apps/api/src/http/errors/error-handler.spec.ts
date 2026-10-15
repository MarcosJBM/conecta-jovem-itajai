import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.js';
import { ValidationError } from '../../use-cases/errors/validation-error.js';
import { UnauthorizedError } from '../../use-cases/errors/unauthorized-error.js';
import { ForbiddenError } from '../../use-cases/errors/forbidden-error.js';
import { ResourceNotFoundError } from '../../use-cases/errors/resource-not-found.js';
import { ConflictError } from '../../use-cases/errors/conflict-error.js';

describe('Central HTTP error translation', () => {
  it.each([
    [new ValidationError(), 400],
    [new UnauthorizedError(), 401],
    [new ForbiddenError(), 403],
    [new ResourceNotFoundError(), 404],
    [new ConflictError(), 409],
  ] as const)('translates %s to %s', async (error, status) => {
    const app = express();
    app.get('/', () => {
      throw error;
    });
    app.use(errorHandler);
    const response = await request(app).get('/');
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ message: error.message });
  });
  it('logs unknown errors in every environment and hides their details', async () => {
    const error = new Error('private details');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = express();
    app.get('/', async () => {
      throw error;
    });
    app.use(errorHandler);
    try {
      const response = await request(app).get('/');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Erro interno do servidor.' });
      expect(log).toHaveBeenCalledWith('Erro inesperado na API:', error);
    } finally {
      log.mockRestore();
    }
  });
});
