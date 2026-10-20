import { readdir } from 'node:fs/promises'
const root = new URL('../src/components/', import.meta.url)
const files = await readdir(root, { recursive: true, withFileTypes: true })
const invalid = files.filter(
  (file) =>
    file.isFile() &&
    /\.[cm]?[jt]sx?$/.test(file.name) &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:spec|test))?\.[a-z]+$/.test(file.name),
)
if (invalid.length) {
  console.error(
    'Componentes devem usar kebab-case:',
    invalid.map((file) => file.name).join(', '),
  )
  process.exitCode = 1
}
