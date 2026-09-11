import { Center, Loader, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { searchSchema, withDefaults } from '@/server/filters'
import { filterOptionsQueryOptions, resultsQueryOptions } from '@/server/results'

// The dashboard UI lives in index.lazy.tsx so it code-splits away from the
// initial bundle. pendingComponent/errorComponent stay here: they must render
// while the lazy chunk loads and when it fails.
export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps, context }) =>
    Promise.all([
      context.queryClient.query({
        ...resultsQueryOptions(withDefaults(deps)),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...filterOptionsQueryOptions(),
        staleTime: 'static',
      }),
    ]),
  pendingComponent: () => (
    <Center py="xl">
      <Loader />
    </Center>
  ),
  errorComponent: ({ error }) => (
    <Text c="red" p="md">
      {error instanceof Error ? error.message : 'Failed to load results'}
    </Text>
  ),
})
