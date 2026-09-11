import { Badge, Card, Title } from '@mantine/core'
import { DataTable, type DataTableSortStatus } from 'mantine-datatable'
import type React from 'react'
import { useMemo, useState } from 'react'
import { sortRecords } from '@/components/table-sort'
import type { FullResult } from '@/server/types'

interface ComparisonRow {
  id: string
  frameworkKey: string
  testId: string
  samples: number
  avgRps: number
  avgP95: number
  avgSuccess: number
  errors: number
}

interface ComparisonTableProps {
  results: FullResult[]
}

function groupByFrameworkAndTest(results: FullResult[]): ComparisonRow[] {
  const groups = new Map<
    string,
    { samples: number; rps: number; p95: number; success: number; errors: number }
  >()

  for (const item of results) {
    const key = `${item.language}/${item.framework}::${item.test_id}`
    const current = groups.get(key) ?? { samples: 0, rps: 0, p95: 0, success: 0, errors: 0 }
    groups.set(key, {
      samples: current.samples + 1,
      rps: current.rps + item.metrics.requests_per_sec,
      p95: current.p95 + item.metrics.latency_p95,
      success: current.success + item.metrics.success_rate,
      errors: current.errors + item.metrics.error_count,
    })
  }

  return Array.from(groups.entries()).map(([key, value]) => {
    const [frameworkKey, testId] = key.split('::')
    return {
      id: key,
      frameworkKey,
      testId,
      samples: value.samples,
      avgRps: value.rps / value.samples,
      avgP95: value.p95 / value.samples,
      avgSuccess: value.success / value.samples,
      errors: value.errors,
    }
  })
}

export function ComparisonTable(props: ComparisonTableProps): React.JSX.Element {
  const [sort, setSort] = useState<DataTableSortStatus<ComparisonRow>>({
    columnAccessor: 'avgRps',
    direction: 'desc',
  })

  const rows = useMemo(() => groupByFrameworkAndTest(props.results), [props.results])
  const sortedRows = useMemo(() => sortRecords(rows, sort), [rows, sort])

  return (
    <Card withBorder>
      <Title order={4}>Framework/Test Comparison</Title>
      <DataTable
        mt="sm"
        records={sortedRows}
        idAccessor="id"
        columns={[
          {
            accessor: 'frameworkKey',
            title: 'Framework',
            render: (row) => <Badge variant="light">{row.frameworkKey}</Badge>,
          },
          { accessor: 'testId', title: 'Test' },
          { accessor: 'samples', title: 'Samples', textAlign: 'right', sortable: true },
          {
            accessor: 'avgRps',
            title: 'Avg req/s',
            textAlign: 'right',
            sortable: true,
            render: (row) => row.avgRps.toFixed(2),
          },
          {
            accessor: 'avgP95',
            title: 'Avg p95 (ms)',
            textAlign: 'right',
            sortable: true,
            render: (row) => (row.avgP95 * 1000).toFixed(2),
          },
          {
            accessor: 'avgSuccess',
            title: 'Avg success',
            textAlign: 'right',
            sortable: true,
            render: (row) => `${(row.avgSuccess * 100).toFixed(2)}%`,
          },
          { accessor: 'errors', title: 'Total errors', textAlign: 'right', sortable: true },
        ]}
        sortStatus={sort}
        onSortStatusChange={setSort}
        withTableBorder
        striped
        highlightOnHover
        noRecordsText="No results found."
      />
    </Card>
  )
}
