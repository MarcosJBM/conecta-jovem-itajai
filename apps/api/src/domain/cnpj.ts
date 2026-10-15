export function normalizeCnpj(value: string) {
  return value.trim().toUpperCase().replace(/[./-]/g, '')
}

// Receita Federal: ASCII - 48, modulo 11, weights 2..9 from right to left.
export function isValidCnpj(value: string) {
  const cnpj = normalizeCnpj(value)
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj))
    return false
  function digit(base: string) {
    const sum = [...base]
      .reverse()
      .reduce(
        (total, character, index) =>
          total + (character.charCodeAt(0) - 48) * (2 + (index % 8)),
        0,
      )
    const remainder = sum % 11
    return remainder < 2 ? '0' : String(11 - remainder)
  }
  const base = cnpj.slice(0, 12)
  const first = digit(base)
  return cnpj === base + first + digit(base + first)
}
