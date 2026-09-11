import { ActionIcon, Grid, Group, Indicator, Stack, Text } from '@mantine/core'
import { IconFilter } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import type React from 'react'
import { useMemo, useState } from 'react'
import { ComparisonTable } from '@/components/comparison-table'
import { FiltersDrawer } from '@/components/filters-drawer'
import { RawTable } from '@/components/raw-table'
import { StatCard } from '@/components/stat-card'
import { withDefaults } from '@/server/filters'
import { resultsQueryOptions } from '@/server/results'

export const Route = createLazyFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage(): React.JSX.Element {
  const search = Route.useSearch()
  const { data: results } = useSuspenseQuery(resultsQueryOptions(withDefaults(search)))

  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeFilterCount =
    (search.language?.length ?? 0) +
    (search.framework?.length ?? 0) +
    (search.test_ids?.length ?? 0) +
    (search.platform ? 1 : 0) +
    Number(search.min_cores != null) +
    Number(search.max_cores != null) +
    Number(search.min_threads != null) +
    Number(search.max_threads != null) +
    Number(search.min_ram != null) +
    Number(search.max_ram != null)

  const summary = useMemo(() => {
    if (results.length === 0) {
      return {
        count: 0,
        avgRps: 0,
        avgP95: 0,
        avgSuccess: 0,
        bestFramework: '-',
      }
    }

    const avgRps =
      results.reduce((total, item) => total + item.metrics.requests_per_sec, 0) / results.length
    const avgP95 =
      results.reduce((total, item) => total + item.metrics.latency_p95, 0) / results.length
    const avgSuccess =
      results.reduce((total, item) => total + item.metrics.success_rate, 0) / results.length

    const frameworkStats = new Map<string, { totalRps: number; count: number }>()

    for (const item of results) {
      const key = `${item.language}/${item.framework}`
      const current = frameworkStats.get(key) ?? { totalRps: 0, count: 0 }
      frameworkStats.set(key, {
        totalRps: current.totalRps + item.metrics.requests_per_sec,
        count: current.count + 1,
      })
    }

    let bestFramework = '-'
    let bestRps = -1

    for (const [name, stat] of frameworkStats.entries()) {
      const frameworkRps = stat.totalRps / stat.count
      if (frameworkRps > bestRps) {
        bestRps = frameworkRps
        bestFramework = name
      }
    }

    return {
      count: results.length,
      avgRps,
      avgP95,
      avgSuccess,
      bestFramework,
    }
  }, [results])

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <Indicator
            size={16}
            disabled={activeFilterCount === 0}
            label={activeFilterCount}
            zIndex={1}
          >
            <ActionIcon
              size="lg"
              variant={activeFilterCount > 0 ? 'light' : 'default'}
              aria-label="Toggle filters"
              onClick={() => setDrawerOpen(true)}
            >
              <IconFilter style={{ width: '70%', height: '70%' }} stroke={1.5} />
            </ActionIcon>
          </Indicator>
          <Text size="sm" c="dimmed">
            {activeFilterCount > 0
              ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`
              : 'No filters applied'}
          </Text>
        </Group>
      </Group>
      <FiltersDrawer opened={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <StatCard title="Results" value={String(summary.count)} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <StatCard title="Avg req/s" value={summary.avgRps.toFixed(2)} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <StatCard title="Avg p95 latency" value={`${(summary.avgP95 * 1000).toFixed(2)} ms`} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <StatCard title="Best framework" value={summary.bestFramework} />
        </Grid.Col>
      </Grid>

      <ComparisonTable results={results} />
      <RawTable results={results} />
    </Stack>
  )
}
