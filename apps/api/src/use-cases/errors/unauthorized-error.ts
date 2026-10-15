export class UnauthorizedError extends Error {
  constructor(message = 'Autenticação necessária.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
