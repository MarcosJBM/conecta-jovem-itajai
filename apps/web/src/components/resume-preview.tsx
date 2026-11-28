import type { ResumeResult } from '../lib/resume';
import { formatBrazilianField } from '../lib/brazilian-data';
import { Card } from './ui/card';

export function ResumePreview({
  title,
  resume,
}: {
  title: string;
  resume: ResumeResult['resume'];
}) {
  return (
    <Card className="gap-3 p-6 break-words">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="font-semibold">
        {resume.personalDetails.firstName} {resume.personalDetails.lastName}
      </p>
      <p>
        {resume.personalDetails.city} / {resume.personalDetails.state}
      </p>
      <p>{formatBrazilianField('phone', resume.personalDetails.phone ?? '')}</p>
      <h4 className="font-semibold">Habilidades</h4>
      <p>{resume.skills.join(' · ') || 'Nenhuma habilidade informada.'}</p>
      <h4 className="font-semibold">Formação</h4>
      {resume.educations.map((e, i) => (
        <p key={i}>
          {e.course} — {e.institution} · {e.level} · {e.startMonth} a{' '}
          {e.endMonth ?? 'atual'}
        </p>
      ))}
      <h4 className="font-semibold">Experiência</h4>
      {resume.experiences.map((e, i) => (
        <p key={i}>
          {e.title} — {e.organization} · {e.startMonth} a{' '}
          {e.endMonth ?? 'atual'}
          {e.description && ` · ${e.description}`}
        </p>
      ))}
    </Card>
  );
}
