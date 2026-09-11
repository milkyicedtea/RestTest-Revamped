import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getFilterOptions, getResults } from '@/server/db/queries'
import { type ResultFilters, resultFiltersSchema } from '@/server/filters'

export const listResults = createServerFn({ method: 'GET' })
  .validator(resultFiltersSchema)
  .handler(async ({ data }) => {
    return getResults(data)
  })

export const resultsQueryOptions = (filters: ResultFilters) =>
  queryOptions({
    queryKey: ['results', filters],
    queryFn: () => listResults({ data: filters }),
    staleTime: 30_000,
  })

export const listFilterOptions = createServerFn({ method: 'GET' }).handler(() => {
  return getFilterOptions()
})

export const filterOptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['filter-options'],
    queryFn: () => listFilterOptions(),
    staleTime: 60_000,
  })
