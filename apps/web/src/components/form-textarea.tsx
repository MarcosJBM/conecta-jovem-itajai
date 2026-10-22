import { useFormContext } from 'react-hook-form'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
export function FormTextarea({
  name,
  label,
  maxLength,
}: {
  name: string
  label: string
  maxLength: number
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        rows={5}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...register(name, {
          validate: (value) => !!value?.trim() || 'Campo obrigatório.',
          maxLength: {
            value: maxLength,
            message: `Use até ${maxLength} caracteres.`,
          },
        })}
      />
      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="text-sm text-destructive"
        >
          {error.message}
        </p>
      )}
    </div>
  )
}
