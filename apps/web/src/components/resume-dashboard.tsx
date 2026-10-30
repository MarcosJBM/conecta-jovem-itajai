import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { api, ApiError } from '../api';
import type { Education, Experience, ResumeResult } from '../lib/resume';
import { formatBrazilianField } from '../lib/brazilian-data';
import { FormInput } from './form-input';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

type Values = {
  skills: { name: string }[];
  educations: Education[];
  experiences: Experience[];
};
export function ResumeDashboard({ expired }: { expired: () => void }) {
  const form = useForm<Values>({
    mode: 'onSubmit',
    defaultValues: { skills: [], educations: [], experiences: [] },
  });
  const skills = useFieldArray({ control: form.control, name: 'skills' });
  const educations = useFieldArray({
    control: form.control,
    name: 'educations',
  });
  const experiences = useFieldArray({
    control: form.control,
    name: 'experiences',
  });
  const educationValues = useWatch({
    control: form.control,
    name: 'educations',
  });
  const experienceValues = useWatch({
    control: form.control,
    name: 'experiences',
  });
  const [saved, setSaved] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const {
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;
  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/resumes/me')
      .then((data: ResumeResult) => {
        if (!active) return;
        setSaved(data);
        reset({
          skills: data.resume.skills.map((name) => ({ name })),
          educations: data.resume.educations.map((e) => ({
            ...e,
            endMonth: e.endMonth ?? '',
          })),
          experiences: data.resume.experiences.map((e) => ({
            ...e,
            endMonth: e.endMonth ?? '',
            description: e.description ?? '',
          })),
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) expired();
        else
          setError('root.server', {
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar o currículo.',
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry, reset, setError, expired]);
  async function submit(values: Values) {
    if (lock.current) return;
    lock.current = true;
    clearErrors();
    setNotice('');
    try {
      const data: ResumeResult = await api('/resumes/me', 'PUT', {
        skills: (values.skills ?? []).map((s) => s.name),
        educations: (values.educations ?? []).map((e) => ({
          ...e,
          endMonth: e.inProgress ? null : e.endMonth || null,
        })),
        experiences: (values.experiences ?? []).map((e) => ({
          ...e,
          endMonth: e.isCurrent ? null : e.endMonth || null,
          description: e.description || null,
        })),
      });
      setSaved(data);
      setNotice('Currículo salvo com sucesso.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expired();
      setError('root.server', {
        message: error instanceof Error ? error.message : 'Falha ao salvar.',
      });
      if (error instanceof ApiError)
        for (const [key, message] of Object.entries(error.fields)) {
          const name = /^skills\.\d+$/.test(key) ? `${key}.name` : key;
          setError(name as Path<Values>, { message }, { shouldFocus: true });
        }
    } finally {
      lock.current = false;
    }
  }
  if (loading)
    return (
      <Card className="p-6" role="status">
        Carregando currículo…
      </Card>
    );
  return (
    <div className="space-y-6">
      {errors.root?.server && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}
      {!saved ? (
        <Button
          onClick={() => {
            clearErrors();
            setRetry(retry + 1);
          }}
        >
          Tentar novamente
        </Button>
      ) : (
        <>
          <Card className="gap-3 p-6">
            <h2 className="text-2xl font-semibold">Meu currículo</h2>
            <p>Conte suas habilidades. Formação e experiência são opcionais.</p>
            <p role="status">
              {saved.completeness.complete
                ? 'Currículo completo'
                : 'Currículo incompleto'}
            </p>
            {!saved.completeness.complete && (
              <p className="text-sm">
                {saved.completeness.missingFields.includes('skills')
                  ? 'Adicione ao menos uma habilidade. Você também pode salvar e continuar depois.'
                  : 'Existem dados cadastrais pendentes. Entre em contato com a equipe.'}
              </p>
            )}
          </Card>
          <FormProvider {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(submit)}
              aria-busy={isSubmitting}
            >
              <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
                <legend className="sr-only">Editar currículo</legend>
                <Card className="gap-4 p-6">
                  <h3 className="text-xl font-semibold">Habilidades</h3>
                  {skills.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <FormInput
                          name={`skills.${i}.name`}
                          label={`Habilidade ${i + 1}`}
                          maxLength={100}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          skills.remove(i);
                        }}
                        aria-label={`Remover habilidade ${i + 1}`}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={skills.fields.length >= 50}
                    onClick={() => skills.append({ name: '' })}
                  >
                    Adicionar habilidade
                  </Button>
                </Card>
                <Card className="gap-4 p-6">
                  <h3 className="text-xl font-semibold">Formação (opcional)</h3>
                  <p>Você pode deixar esta seção vazia.</p>
                  {educations.fields.map((field, i) => (
                    <section
                      key={field.id}
                      aria-label={`Formação ${i + 1}`}
                      className="space-y-4 rounded-lg border p-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormInput
                          name={`educations.${i}.institution`}
                          label="Instituição"
                          maxLength={200}
                        />
                        <FormInput
                          name={`educations.${i}.course`}
                          label="Curso"
                          maxLength={200}
                        />
                        <FormInput
                          name={`educations.${i}.level`}
                          label="Nível de formação"
                          maxLength={100}
                        />
                        <FormInput
                          name={`educations.${i}.startMonth`}
                          label="Início da formação"
                          type="month"
                        />
                        <FormInput
                          name={`educations.${i}.endMonth`}
                          label="Término da formação"
                          type="month"
                          minMonth={educationValues?.[i]?.startMonth}
                          required={!educationValues?.[i]?.inProgress}
                          disabled={!!educationValues?.[i]?.inProgress}
                        />
                      </div>
                      <Controller
                        name={`educations.${i}.inProgress`}
                        control={form.control}
                        render={({ field: checkbox }) => (
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`education-current-${i}`}
                              checked={checkbox.value}
                              onCheckedChange={(value) => {
                                checkbox.onChange(value === true);
                                if (value)
                                  form.setValue(`educations.${i}.endMonth`, '');
                              }}
                            />
                            <Label htmlFor={`education-current-${i}`}>
                              Formação em andamento
                            </Label>
                          </div>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          educations.remove(i);
                        }}
                        aria-label={`Remover formação ${i + 1}`}
                      >
                        Remover formação
                      </Button>
                    </section>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={educations.fields.length >= 20}
                    onClick={() =>
                      educations.append({
                        institution: '',
                        course: '',
                        level: '',
                        startMonth: '',
                        endMonth: '',
                        inProgress: true,
                      })
                    }
                  >
                    Adicionar formação
                  </Button>
                </Card>
                <Card className="gap-4 p-6">
                  <h3 className="text-xl font-semibold">
                    Experiência (opcional)
                  </h3>
                  <p>A primeira oportunidade não exige experiência anterior.</p>
                  {experiences.fields.map((field, i) => (
                    <section
                      key={field.id}
                      aria-label={`Experiência ${i + 1}`}
                      className="space-y-4 rounded-lg border p-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormInput
                          name={`experiences.${i}.title`}
                          label="Cargo"
                          maxLength={150}
                        />
                        <FormInput
                          name={`experiences.${i}.organization`}
                          label="Organização"
                          maxLength={200}
                        />
                        <FormInput
                          name={`experiences.${i}.startMonth`}
                          label="Início da experiência"
                          type="month"
                        />
                        <FormInput
                          name={`experiences.${i}.endMonth`}
                          label="Término da experiência"
                          type="month"
                          minMonth={experienceValues?.[i]?.startMonth}
                          required={!experienceValues?.[i]?.isCurrent}
                          disabled={!!experienceValues?.[i]?.isCurrent}
                        />
                        <FormInput
                          name={`experiences.${i}.description`}
                          label="Descrição"
                          maxLength={2000}
                          required={false}
                        />
                      </div>
                      <Controller
                        name={`experiences.${i}.isCurrent`}
                        control={form.control}
                        render={({ field: checkbox }) => (
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`experience-current-${i}`}
                              checked={checkbox.value}
                              onCheckedChange={(value) => {
                                checkbox.onChange(value === true);
                                if (value)
                                  form.setValue(
                                    `experiences.${i}.endMonth`,
                                    '',
                                  );
                              }}
                            />
                            <Label htmlFor={`experience-current-${i}`}>
                              Trabalho atualmente nesta organização
                            </Label>
                          </div>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          experiences.remove(i);
                        }}
                        aria-label={`Remover experiência ${i + 1}`}
                      >
                        Remover experiência
                      </Button>
                    </section>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={experiences.fields.length >= 20}
                    onClick={() =>
                      experiences.append({
                        title: '',
                        organization: '',
                        startMonth: '',
                        endMonth: '',
                        isCurrent: true,
                        description: '',
                      })
                    }
                  >
                    Adicionar experiência
                  </Button>
                </Card>
                {notice && <p role="status">{notice}</p>}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando…' : 'Salvar currículo'}
                </Button>
              </fieldset>
            </form>
          </FormProvider>
          <Card className="gap-3 p-6 break-words">
            <h3 className="text-xl font-semibold">
              Visualização do currículo salvo
            </h3>
            <p className="font-semibold">
              {saved.resume.personalDetails.firstName}{' '}
              {saved.resume.personalDetails.lastName}
            </p>
            <p>
              {saved.resume.personalDetails.city} /{' '}
              {saved.resume.personalDetails.state}
            </p>
            <p>
              {formatBrazilianField(
                'phone',
                saved.resume.personalDetails.phone ?? '',
              )}
            </p>
            <h4 className="font-semibold">Habilidades</h4>
            <p>
              {saved.resume.skills.join(' · ') ||
                'Nenhuma habilidade informada.'}
            </p>
            <h4 className="font-semibold">Formação</h4>
            {saved.resume.educations.map((e, i) => (
              <p key={i}>
                {e.course} — {e.institution} · {e.level} · {e.startMonth} a{' '}
                {e.endMonth ?? 'atual'}
              </p>
            ))}
            <h4 className="font-semibold">Experiência</h4>
            {saved.resume.experiences.map((e, i) => (
              <p key={i}>
                {e.title} — {e.organization} · {e.startMonth} a{' '}
                {e.endMonth ?? 'atual'}
                {e.description && ` · ${e.description}`}
              </p>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
