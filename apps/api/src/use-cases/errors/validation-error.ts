export class ValidationError extends Error {
  constructor(message = 'Dados inválidos.') {
    super(message);
    this.name = 'ValidationError';
  }
}
