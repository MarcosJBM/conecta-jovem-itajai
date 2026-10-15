export class ConflictError extends Error {
  constructor(message = 'E-mail já cadastrado.') {
    super(message);
    this.name = 'ConflictError';
  }
}
