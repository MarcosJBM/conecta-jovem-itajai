export type Field = {
  name: string;
  label: string;
  type?: string;
  max?: number;
  optional?: boolean;
  mobileOnly?: boolean;
  autoComplete?: string;
};

export const credentials: Field[] = [
  {
    name: 'email',
    label: 'E-mail de acesso',
    type: 'email',
    max: 254,
    autoComplete: 'email',
  },
  {
    name: 'password',
    label: 'Senha',
    type: 'password',
    autoComplete: 'new-password',
  },
];

export const companyFields: Field[] = [
  {
    name: 'legalName',
    label: 'Razão social',
    max: 200,
    autoComplete: 'organization',
  },
  { name: 'tradeName', label: 'Nome fantasia', max: 200, optional: true },
  { name: 'cnpj', label: 'CNPJ', max: 18 },
  { name: 'city', label: 'Cidade', max: 100, autoComplete: 'address-level2' },
  { name: 'state', label: 'Estado (UF)' },
  {
    name: 'contactName',
    label: 'Nome do responsável',
    max: 150,
    autoComplete: 'name',
  },
  { name: 'contactRole', label: 'Cargo ou vínculo', max: 100 },
  { name: 'phone', label: 'Telefone com DDD', type: 'tel', max: 20 },
];
export const youthFields: Field[] = [
  { name: 'firstName', label: 'Nome', max: 150, autoComplete: 'given-name' },
  {
    name: 'lastName',
    label: 'Sobrenome',
    max: 150,
    autoComplete: 'family-name',
  },
  {
    name: 'birthDate',
    label: 'Data de nascimento',
    type: 'date',
    autoComplete: 'bday',
  },
  { name: 'cpf', label: 'CPF', max: 14 },
  {
    name: 'phone',
    label: 'Celular com DDD',
    type: 'tel',
    max: 20,
    mobileOnly: true,
  },
  { name: 'postalCode', label: 'CEP', max: 9, autoComplete: 'postal-code' },
  {
    name: 'street',
    label: 'Logradouro',
    max: 200,
    autoComplete: 'address-line1',
  },
  { name: 'number', label: 'Número', max: 20 },
  {
    name: 'complement',
    label: 'Complemento',
    max: 200,
    optional: true,
    autoComplete: 'address-line2',
  },
  { name: 'neighborhood', label: 'Bairro', max: 100 },
  { name: 'city', label: 'Cidade', max: 100, autoComplete: 'address-level2' },
  { name: 'state', label: 'Estado (UF)' },
];
