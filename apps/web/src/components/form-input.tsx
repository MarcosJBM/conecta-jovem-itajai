import { useFormContext } from 'react-hook-form'
import { Input } from './ui/input'
import { Label } from './ui/label'

export function FormInput({
  name,
  label,
  type = 'text',
  required = true,
  maxLength,
  disabled = false,
  minMonth,
  minDate,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  maxLength?: number
  disabled?: boolean
  minMonth?: string
  minDate?: string
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={name}>
        {label}
        {!required && ' (opcional)'}
      </Label>
      <Input
        id={name}
        type={type}
        disabled={disabled}
        min={minDate}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...register(name, {
          validate: (value) => {
            if (disabled) return true
            if (!value?.trim()) return !required || 'Campo obrigatório.'
            if (
              type === 'month' &&
              !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)
            )
              return 'Informe um mês válido.'
            if (minMonth && value < minMonth)
              return 'O término deve ser igual ou posterior ao início.'
            if (minDate && value < minDate)
              return 'Informe um prazo a partir de hoje.'
            return true
          },
          maxLength: maxLength
            ? { value: maxLength, message: `Use até ${maxLength} caracteres.` }
            : undefined,
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
