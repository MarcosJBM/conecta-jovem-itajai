export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message)
  }
}
export async function api(path: string, method = 'GET', body?: unknown) {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'Conecta',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Tente novamente.',
      0,
    )
  }
  const data =
    response.status === 204
      ? {}
      : await response.json().catch(() => {
          throw new ApiError(
            'O servidor retornou uma resposta inválida. Tente novamente.',
            response.status,
          )
        })
  if (!response.ok)
    throw new ApiError(
      data.message ?? 'Não foi possível concluir a solicitação.',
      response.status,
      data.fields,
    )
  return data
}
export type AuthUser = {
  id: string
  email: string
  role: 'YOUTH' | 'COMPANY' | 'ADMIN'
}
