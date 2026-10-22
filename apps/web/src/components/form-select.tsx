import { useFormContext } from 'react-hook-form'
import { Label } from './ui/label'
import { NativeSelect, NativeSelectOption } from './ui/native-select'

export function FormSelect({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: readonly { value: string; label: string }[]
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect
        id={name}
        {...register(name, { required: 'Selecione uma opção.' })}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <NativeSelectOption value="">Selecione</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </p>
      )}
    </div>
  )
}
