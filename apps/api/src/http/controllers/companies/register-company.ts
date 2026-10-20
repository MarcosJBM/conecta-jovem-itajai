import type { RequestHandler } from 'express';
import type { RegisterCompanyUseCase } from '../../../use-cases/register-company.js';
import { registerCompanySchema } from './schema.js';

export function registerCompanyController(
  makeUseCase: () => RegisterCompanyUseCase,
): RequestHandler {
  return async (request, response) => {
    const input = registerCompanySchema.parse(request.body);
    const company = await makeUseCase().execute(input);
    response.status(201).json({
      company,
      message: 'Cadastro realizado. Sua empresa está aguardando validação.',
    });
  };
}
