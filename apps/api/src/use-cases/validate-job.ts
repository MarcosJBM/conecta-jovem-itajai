import { getStates } from '@brazilian-utils/brazilian-utils';
import {
  brazilianDate,
  jobAreas,
  jobContracts,
  workRegimes,
} from '../domain/job.js';
import type { JobData } from '../domain/job.js';
import { ValidationError } from './errors/validation-error.js';
export type JobInput = Omit<JobData, 'deadline'> & { deadline: string };
export function normalizeJob(input: JobInput, now = new Date()): JobData {
  const text = (value: string, max: number) => {
    if (!value.trim() || value.trim().length > max)
      throw new ValidationError(
        `Informe os campos da vaga com até ${max} caracteres.`,
      );
    return value.trim();
  };
  const state = input.state.trim().toUpperCase();
  if (!getStates().some((item) => item.code === state))
    throw new ValidationError('UF inválida.');
  if (
    !jobContracts.includes(input.contract) ||
    !workRegimes.includes(input.regime) ||
    !jobAreas.includes(input.area)
  )
    throw new ValidationError('Tipo de contratação, regime ou área inválidos.');
  const deadline = new Date(`${input.deadline}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ||
    Number.isNaN(deadline.getTime()) ||
    deadline.toISOString().slice(0, 10) !== input.deadline ||
    input.deadline < brazilianDate(now)
  )
    throw new ValidationError('Informe um prazo válido a partir de hoje.');
  return {
    title: text(input.title, 150),
    description: text(input.description, 5000),
    requirements: text(input.requirements, 5000),
    city: text(input.city, 100),
    state,
    area: input.area,
    contract: input.contract,
    regime: input.regime,
    deadline,
  };
}
