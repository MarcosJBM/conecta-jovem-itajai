import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { ChangeEvent } from 'react'
import { ApiError } from '../api'
import type { Field } from '../forms'
import {
  states,
  formatBrazilianField,
  validateBrazilianField,
} from '@/lib/brazilian-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Props = {
  title: string
  fields: Field[]
  action: string
  initial?: Record<string, string | undefined>
  terms?: boolean
  login?: boolean
  onSubmit: (data: Record<string, string>) => Promise<void>
}

export function DataForm({
  title,
  fields,
  action,
  initial = {},
  terms,
  login,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({
    mode: 'onBlur',
    defaultValues: {
      ...Object.fromEntries(
        fields.map((field) => [
          field.name,
          formatBrazilianField(field.name, initial[field.name] ?? ''),
        ]),
      ),
      ...(terms ? { acceptedTerms: '' } : {}),
    },
  })
  const lock = useRef(false)
  const feedback = useRef<HTMLDivElement>(null)
  const maskedNames = ['cpf', 'cnpj', 'postalCode', 'phone']
  function change(
    event: ChangeEvent<HTMLInputElement>,
    name: string,
    onChange: (value: string) => void,
  ) {
    const input = event.currentTarget
    const value = input.value
    if (!maskedNames.includes(name)) {
      onChange(value)
      return
    }
    const position = input.selectionStart ?? value.length
    const significant = (character: string) =>
      '0123456789'.includes(character) ||
      (name === 'cnpj' &&
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(character.toUpperCase()))
    const before = [...value.slice(0, position)].filter(significant).length
    const formatted = formatBrazilianField(name, value)
    onChange(formatted)
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return
      let cursor = 0,
        count = 0
      while (cursor < formatted.length && count < before) {
        if (significant(formatted[cursor])) count++
        cursor++
      }
      input.setSelectionRange(cursor, cursor)
    })
  }
  async function submit(data: Record<string, string>) {
    if (lock.current) return
    lock.current = true
    clearErrors()
    try {
      await onSubmit(data)
    } catch (error) {
      setError('root.server', {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível conectar ao servidor.',
      })
      let focused = false
      if (error instanceof ApiError)
        for (const [name, message] of Object.entries(error.fields)) {
          if (
            fields.some((field) => field.name === name) ||
            name === 'acceptedTerms'
          ) {
            setError(
              name,
              { type: 'server', message },
              { shouldFocus: !focused },
            )
            focused = true
          }
        }
      if (!focused) requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      lock.current = false
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>
          {login
            ? 'Entre com o e-mail e a senha da sua conta.'
            : 'Os campos marcados como opcionais podem ficar em branco.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          aria-busy={isSubmitting}
        >
          <div ref={feedback} tabIndex={-1} role="alert">
            {errors.root?.server?.message && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>
                  {errors.root.server.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <fieldset disabled={isSubmitting} className="min-w-0">
            <legend className="sr-only">{title}</legend>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {fields.map((field) => (
                <Controller
                  key={field.name}
                  name={field.name}
                  control={control}
                  rules={{
                    required: field.optional ? false : 'Campo obrigatório.',
                    maxLength: field.max
                      ? {
                          value: field.max,
                          message: `Use no máximo ${field.max} caracteres.`,
                        }
                      : undefined,
                    validate: (value) => {
                      if (field.optional && !value) return true
                      if (!value.trim()) return 'Campo obrigatório.'
                      if (field.name === 'password') {
                        if (!login && value.length < 6)
                          return 'Use pelo menos 6 caracteres.'
                        if (
                          !login &&
                          new TextEncoder().encode(value).length > 72
                        )
                          return 'Use no máximo 72 bytes na senha.'
                      }

                      return validateBrazilianField(
                        field.name,
                        value,
                        field.mobileOnly,
                      )
                    },
                  }}
                  render={({ field: input, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.optional && (
                          <span className="font-normal text-muted-foreground">
                            (opcional)
                          </span>
                        )}
                      </Label>
                      {field.name === 'state' ? (
                        <NativeSelect
                          {...input}
                          id={field.name}
                          className="h-11"
                          aria-invalid={!!fieldState.error}
                          aria-describedby={
                            fieldState.error ? `${field.name}-error` : undefined
                          }
                        >
                          <NativeSelectOption value="" disabled>
                            Selecione o estado
                          </NativeSelectOption>
                          {states.map((state) => (
                            <NativeSelectOption
                              key={state.code}
                              value={state.code}
                            >
                              {state.code} — {state.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Input
                          {...input}
                          id={field.name}
                          type={field.type ?? 'text'}
                          className="h-11"
                          inputMode={
                            ['cpf', 'postalCode', 'phone'].includes(field.name)
                              ? 'numeric'
                              : undefined
                          }
                          autoComplete={
                            field.name === 'password' && login
                              ? 'current-password'
                              : field.autoComplete
                          }
                          onChange={(event) =>
                            change(event, field.name, input.onChange)
                          }
                          aria-invalid={!!fieldState.error}
                          aria-describedby={
                            fieldState.error
                              ? `${field.name}-error`
                              : field.name === 'password' && !login
                                ? 'password-help'
                                : undefined
                          }
                        />
                      )}
                      {field.name === 'password' && !login && (
                        <p
                          className="text-xs text-muted-foreground"
                          id="password-help"
                        >
                          Use pelo menos 6 caracteres.
                        </p>
                      )}
                      {fieldState.error && (
                        <p
                          className="text-sm text-destructive"
                          role="alert"
                          id={`${field.name}-error`}
                        >
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              ))}
            </div>
            {terms && (
              <div className="mt-6 space-y-4 text-sm">
                <details>
                  <summary>Termos de uso</summary>
                  <p className="mt-2 leading-7">
                    Ao criar sua conta, você concorda em informar dados corretos
                    e utilizar a plataforma com respeito aos demais
                    participantes. Os dados do cadastro são utilizados para
                    identificar sua conta e oferecer as funcionalidades do
                    Conecta Jovem Itajaí. Não compartilhe sua senha.
                  </p>
                </details>
                <Controller
                  name="acceptedTerms"
                  control={control}
                  rules={{
                    validate: (value) =>
                      value === 'on' || 'O aceite dos termos é obrigatório.',
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="acceptedTerms"
                          name={field.name}
                          ref={field.ref}
                          checked={field.value === 'on'}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true ? 'on' : '')
                          }
                          onBlur={field.onBlur}
                          disabled={isSubmitting}
                          aria-invalid={!!fieldState.error}
                          aria-describedby={
                            fieldState.error ? 'terms-error' : undefined
                          }
                        />
                        <Label htmlFor="acceptedTerms">
                          Li e aceito os termos de uso.
                        </Label>
                      </div>
                      {fieldState.error && (
                        <p
                          className="text-sm text-destructive"
                          id="terms-error"
                          role="alert"
                        >
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>
            )}
            <div className="mt-8 border-t pt-6">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Aguarde…' : action}
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  )
}
