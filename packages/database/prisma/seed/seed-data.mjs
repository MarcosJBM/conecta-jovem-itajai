import { createHash } from 'node:crypto';
import { fakerPT_BR as faker } from '@faker-js/faker';
import {
  generateCpf,
  generateCnpj,
  isValidCpf,
  isValidCnpj,
  isValidCep,
  isValidMobilePhone,
  getStates,
  parseCpf,
  parseCnpj,
  parseCep,
  parsePhone,
} from '@brazilian-utils/brazilian-utils';

export const seedPassword = 'Conecta123!';

export const seedEmail = (kind, index) => `seed.${kind}.${index}@example.com`;

export function seedId(kind, index) {
  const hex = createHash('sha256')
    .update(`conecta-dev-seed-v1:${kind}:${index}`)
    .digest('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function brazilianData(index, company = false) {
  const document = company
    ? generateCnpj({ version: index === 4 ? 2 : 1 })
    : generateCpf('SC');
  const phone = `4799${String(1000000 + index)}`;
  const postalCode = '88301-000';
  if (
    !(company ? isValidCnpj(document, { version: 2 }) : isValidCpf(document)) ||
    !isValidMobilePhone(phone, { version: 2 }) ||
    !isValidCep(postalCode) ||
    !getStates().some(({ code }) => code === 'SC')
  ) {
    throw new Error('Dados brasileiros inválidos no seed.');
  }
  return {
    ...(company
      ? { cnpj: parseCnpj(document, { version: 2 }) }
      : { cpf: parseCpf(document), postalCode: parseCep(postalCode) }),
    phone: parsePhone(phone),
    city: 'Itajaí',
    state: 'SC',
  };
}

export function buildSeedData(
  passwordHash,
  adminId,
  referenceDate = new Date(),
) {
  faker.seed(20261030);
  const reviewedAt = new Date(referenceDate);
  const youths = Array.from({ length: 15 }, (_, offset) => {
    const index = offset + 1;
    const resume =
      index % 3 === 0
        ? undefined
        : {
            create: {
              skills: {
                create: [
                  { name: 'Comunicação' },
                  { name: 'Trabalho em equipe' },
                ],
              },
              ...(index % 3 === 2
                ? {
                    educations: {
                      create: [
                        {
                          institution: 'Escola Técnica de Itajaí',
                          course: 'Informática',
                          level: 'Técnico',
                          startMonth: '2024-02',
                          endMonth: '2025-12',
                          inProgress: false,
                        },
                      ],
                    },
                    experiences: {
                      create: [
                        {
                          title: 'Aprendiz administrativo',
                          organization: faker.company.name(),
                          startMonth: '2025-02',
                          endMonth: '2025-12',
                          isCurrent: false,
                          description:
                            'Apoio ao atendimento e organização de documentos.',
                        },
                      ],
                    },
                  }
                : {}),
            },
          };
    return {
      id: seedId('youth-user', index),
      email: seedEmail('jovem', index),
      role: 'YOUTH',
      passwordHash,
      youthProfile: {
        create: {
          id: seedId('youth-profile', index),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          birthDate: new Date(`${2003 + (index % 5)}-03-12T00:00:00Z`),
          ...brazilianData(index),
          street: faker.location.street(),
          number: String(100 + index),
          complement: index % 2 ? null : 'Apartamento 2',
          neighborhood: 'Centro',
          ...(resume ? { resume } : {}),
        },
      },
    };
  });
  const statuses = ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'REJECTED'];
  const companies = statuses.map((status, offset) => {
    const index = offset + 1;
    const name = faker.company.name();
    return {
      id: seedId('company-user', index),
      email: seedEmail('empresa', index),
      role: 'COMPANY',
      passwordHash,
      companyProfile: {
        create: {
          id: seedId('company-profile', index),
          ...brazilianData(index, true),
          legalName: `${name} Ltda.`,
          tradeName: name,
          contactName: faker.person.fullName(),
          contactRole: 'Recursos Humanos',
          validation: {
            create: {
              status,
              ...(status === 'PENDING'
                ? {}
                : { reviewedById: adminId, reviewedAt }),
              ...(status === 'REJECTED'
                ? { rejectionReason: 'Dados de contato precisam de correção.' }
                : {}),
            },
          },
        },
      },
    };
  });
  const areas = [
    'ADMINISTRATION',
    'SALES',
    'TECHNOLOGY',
    'LOGISTICS',
    'INDUSTRY',
    'HEALTH',
    'EDUCATION',
    'OTHER',
  ];
  const contracts = ['APPRENTICESHIP', 'INTERNSHIP', 'FORMAL_EMPLOYMENT'];
  const regimes = ['ONSITE', 'HYBRID', 'REMOTE'];
  const jobs = Array.from({ length: 25 }, (_, offset) => {
    const index = offset + 1;
    const deadline = new Date(referenceDate);
    deadline.setUTCDate(
      deadline.getUTCDate() + (index % 5 === 0 ? -10 : 30 + index),
    );
    deadline.setUTCHours(0, 0, 0, 0);
    return {
      id: seedId('job', index),
      companyId: seedId('company-profile', (offset % 3) + 1),
      title: `${index % 2 ? 'Assistente' : 'Aprendiz'} de ${['administração', 'vendas', 'tecnologia', 'logística'][offset % 4]}`,
      description: `Oportunidade de desenvolvimento profissional em Itajaí. ${faker.lorem.paragraphs(index % 4 === 0 ? 3 : 1)}`,
      requirements:
        'Organização, vontade de aprender e boa comunicação. Não é necessário ter experiência anterior.',
      city: 'Itajaí',
      state: 'SC',
      area: areas[offset % areas.length],
      contract: contracts[offset % contracts.length],
      regime: regimes[offset % regimes.length],
      deadline,
      status: index % 4 === 0 ? 'CLOSED' : 'OPEN',
    };
  });
  return { youths, companies, jobs };
}
