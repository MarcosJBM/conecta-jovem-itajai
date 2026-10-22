import { Button } from './ui/button'
export function Pagination({
  page,
  totalPages,
  loading,
  change,
}: {
  page: number
  totalPages: number
  loading: boolean
  change: (page: number) => void
}) {
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={loading || page <= 1}
        onClick={() => change(page - 1)}
      >
        Anterior
      </Button>
      <span className="text-sm">
        Página {page} de {Math.max(1, totalPages)}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={loading || page >= totalPages}
        onClick={() => change(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  )
}
