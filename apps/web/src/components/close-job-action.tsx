import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { api, ApiError } from '../api'
import { Button } from './ui/button'
export function CloseJobAction({
  id,
  expired,
  completed,
}: {
  id: string
  expired: () => void
  completed: () => void
}) {
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm()
  const lock = useRef(false)
  return (
    <form
      onSubmit={handleSubmit(async () => {
        if (lock.current) return
        lock.current = true
        try {
          await api(`/companies/me/jobs/${id}/close`, 'POST', {})
          completed()
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) expired()
          setError('root.server', {
            message:
              error instanceof Error ? error.message : 'Falha ao encerrar.',
          })
        } finally {
          lock.current = false
        }
      })}
    >
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        {isSubmitting ? 'Encerrando…' : 'Encerrar vaga'}
      </Button>
      {errors.root?.server && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {errors.root.server.message}
        </p>
      )}
    </form>
  )
}
