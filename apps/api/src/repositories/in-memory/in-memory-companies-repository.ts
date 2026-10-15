import { randomUUID } from 'node:crypto'
import type {
  CompaniesRepository,
  CreateCompanyData,
} from '../companies-repository.js'
import type { RegisteredCompany } from '../../domain/company.js'
import { ConflictError } from '../../use-cases/errors/conflict-error.js'

export class InMemoryCompaniesRepository implements CompaniesRepository {
  items: (CreateCompanyData & RegisteredCompany)[] = []

  async findConflict(email: string, cnpj: string) {
    if (this.items.some((item) => item.email === email)) return 'email' as const
    if (this.items.some((item) => item.cnpj === cnpj)) return 'cnpj' as const
    return null
  }

  async create(data: CreateCompanyData) {
    const conflict = this.items.some((item) => item.email === data.email)
      ? 'email'
      : this.items.some((item) => item.cnpj === data.cnpj)
        ? 'cnpj'
        : null
    if (conflict) throw new ConflictError(conflict)
    const result: RegisteredCompany = {
      id: randomUUID(),
      userId: randomUUID(),
      validation: { id: randomUUID(), status: 'PENDING' },
    }
    this.items.push({ ...data, ...result })
    return result
  }
}
