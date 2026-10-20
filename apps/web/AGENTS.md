# Aplicação web

- Todo arquivo dentro de `src/components` deve usar kebab-case; exports React continuam PascalCase. Exemplos: `data-form.tsx`, `company-dashboard.tsx`.
- Use shadcn/ui em `src/components/ui` e Tailwind CSS. Adicione componentes pelo CLI a partir deste workspace; `components.json` define os aliases.
- Use React Hook Form (`useForm`, `Controller`, `formState`, `setError`) para formulários. Não manter cópias de erros, valores ou estado de submissão em `useState`.
- Use Brazilian Utils para validar e formatar dados brasileiros. Máscaras devem funcionar digitando, colando, apagando e ao abrir dados já preenchidos, inclusive no formulário de correção da empresa.
- A validação do cliente não substitui a validação da API.
- Rode `pnpm --filter @conecta/web check:names`, `typecheck` e `build` após alterações.
