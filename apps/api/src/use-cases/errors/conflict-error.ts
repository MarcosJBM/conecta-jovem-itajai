export class ConflictError extends Error {
  constructor(public readonly field: 'email' | 'cnpj') {
    super(field === 'email' ? 'E-mail já cadastrado.' : 'CNPJ já cadastrado.')
  }
}
