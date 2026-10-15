export class ForbiddenError extends Error {
  constructor(message = 'Operação não permitida.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
