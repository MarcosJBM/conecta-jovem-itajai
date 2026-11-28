import { FormProvider, useForm } from 'react-hook-form';
import { api, ApiError } from '../api';
import { FormSelect } from './form-select';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';

const statusLabels = {
  RECEIVED: 'Recebida',
  IN_REVIEW: 'Em análise',
  APPROVED: 'Aprovada',
  REJECTED: 'Reprovada',
};

type ApplicationStatus = keyof typeof statusLabels;
export type ApplicationStatusInfo = {
  status: ApplicationStatus;
  nextStatuses: ApplicationStatus[];
};

export function ApplicationStatusForm({
  path,
  current,
  expired,
  updated,
}: {
  path: string;
  current: ApplicationStatusInfo;
  expired: () => void;
  updated: (status: ApplicationStatusInfo) => void;
}) {
  const form = useForm<{ status: ApplicationStatus | '' }>({
    defaultValues: { status: '' },
  });
  const { isSubmitting, errors } = form.formState;

  async function save({ status }: { status: ApplicationStatus | '' }) {
    try {
      const result: ApplicationStatusInfo = await api(path, 'PATCH', {
        status,
      });
      form.reset();
      updated(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expired();
      else
        form.setError('root.server', {
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível atualizar o status.',
        });
    }
  }

  return (
    <Card className="gap-4 p-5">
      <h3 className="text-lg font-semibold">Status da candidatura</h3>
      <p role="status">{statusLabels[current.status]}</p>
      {current.nextStatuses.length > 0 && (
        <FormProvider {...form}>
          <form noValidate onSubmit={form.handleSubmit(save)}>
            <fieldset disabled={isSubmitting} className="space-y-3">
              <FormSelect
                name="status"
                label="Próximo status"
                options={current.nextStatuses.map((value) => ({
                  value,
                  label: statusLabels[value],
                }))}
              />
              {errors.root?.server && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {errors.root.server.message}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit">
                {isSubmitting ? 'Salvando…' : 'Atualizar status'}
              </Button>
            </fieldset>
          </form>
        </FormProvider>
      )}
    </Card>
  );
}
