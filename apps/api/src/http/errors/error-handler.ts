import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { ConflictError } from '../../use-cases/errors/conflict-error.js'

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of error.issues)
      fields[String(issue.path[0] ?? '_form')] ??= issue.message
    response
      .status(400)
      .json({ message: 'Revise os dados informados.', fields })
    return
  }
  if (error instanceof ConflictError) {
    response
      .status(409)
      .json({
        message: error.message,
        fields: { [error.field]: error.message },
      })
    return
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      response.status(400).json({ message: 'JSON inválido.' })
      return
    }
    if (error.type === 'entity.too.large') {
      response.status(413).json({ message: 'Requisição muito grande.' })
      return
    }
  }
  console.error('Erro inesperado na API:', error)
  response
    .status(500)
    .json({ message: 'Não foi possível concluir o cadastro. Tente novamente.' })
}
