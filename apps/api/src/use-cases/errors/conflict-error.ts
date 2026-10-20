export class ConflictError extends Error {
  constructor(
    message = 'E-mail já cadastrado.',
    public readonly field?: 'email' | 'cnpj',
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}
