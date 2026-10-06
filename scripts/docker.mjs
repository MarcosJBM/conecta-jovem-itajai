import { spawnSync } from 'node:child_process'
import { delimiter } from 'node:path'

const dockerDesktopDirectory = '/Applications/Docker.app/Contents/Resources/bin'
const candidates =
  process.platform === 'darwin'
    ? ['docker', `${dockerDesktopDirectory}/docker`]
    : ['docker']

for (const candidate of candidates) {
  const environment =
    candidate === 'docker'
      ? process.env
      : {
          ...process.env,
          PATH: `${dockerDesktopDirectory}${delimiter}${process.env.PATH ?? ''}`,
        }

  const result = spawnSync(candidate, process.argv.slice(2), {
    env: environment,
    stdio: 'inherit',
  })

  if (!result.error) {
    process.exit(result.status ?? 1)
  }

  if (result.error.code !== 'ENOENT') {
    throw result.error
  }
}

console.error(
  'Docker não encontrado. Instale e inicie o Docker Desktop antes de continuar.',
)
process.exit(1)
