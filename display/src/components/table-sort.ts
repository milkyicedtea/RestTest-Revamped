import type { DataTableSortStatus } from 'mantine-datatable'

function resolveAccessor(record: unknown, accessor: string): unknown {
  let current: unknown = record
  for (const key of accessor.split('.')) {
    if (current == null || typeof current !== 'object') {
      return current
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export function sortRecords<T>(records: T[], sortStatus: DataTableSortStatus<T>): T[] {
  const accessor = String(sortStatus.columnAccessor)
  return [...records].sort((a, b) => {
    const av = resolveAccessor(a, accessor)
    const bv = resolveAccessor(b, accessor)
    const result =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
    return sortStatus.direction === 'desc' ? -result : result
  })
}
