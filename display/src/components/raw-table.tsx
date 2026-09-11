import { Badge, Card, Title } from '@mantine/core'
import { DataTable, type DataTableSortStatus } from 'mantine-datatable'
import type React from 'react'
import { useMemo, useState } from 'react'
import { sortRecords } from '@/components/table-sort'
import type { FullResult } from '@/server/types'

interface RawTableProps {
  results: FullResult[]
}

const RAW_PAGE_SIZE = 50

export function RawTable(props: RawTableProps): React.JSX.Element {
  const [sort, setSort] = useState<DataTableSortStatus<FullResult>>({
    columnAccessor: 'timestamp',
    direction: 'desc',
  })
  const [page, setPage] = useState(1)

  // Filters can shrink the dataset below the current page — clamp instead of
  // dispatching an effect on every search change.
  const pageCount = Math.max(1, Math.ceil(props.results.length / RAW_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const sortedRows = useMemo(() => sortRecords(props.results, sort), [props.results, sort])

  return (
    <Card withBorder>
      <Title order={4}>Raw Benchmark Runs</Title>
      <DataTable
        mt="sm"
        records={sortedRows}
        idAccessor="result_id"
        columns={[
          {
            accessor: 'timestamp',
            title: 'Timestamp',
            sortable: true,
            render: (row) => new Date(row.timestamp).toLocaleString(),
          },
          {
            accessor: 'language',
            title: 'Framework',
            render: (row) => (
              <Badge variant="light">
                {row.language}/{row.framework}
              </Badge>
            ),
          },
          { accessor: 'test_id', title: 'Test' },
          {
            accessor: 'metrics.requests_per_sec',
            title: 'Req/s',
            textAlign: 'right',
            sortable: true,
            render: (row) => row.metrics.requests_per_sec.toFixed(2),
          },
          {
            accessor: 'metrics.latency_p95',
            title: 'P95 (ms)',
            textAlign: 'right',
            sortable: true,
            render: (row) => (row.metrics.latency_p95 * 1000).toFixed(2),
          },
          { accessor: 'machine.platform', title: 'Machine' },
          {
            accessor: 'machine.cpu_cores',
            title: 'CPU / RAM',
            render: (row) =>
              `${row.machine.cpu_cores}c/${row.machine.cpu_threads}t • ${row.machine.ram_gb}GB`,
          },
        ]}
        sortStatus={sort}
        onSortStatusChange={setSort}
        page={safePage}
        onPageChange={setPage}
        totalRecords={props.results.length}
        recordsPerPage={RAW_PAGE_SIZE}
        withTableBorder
        striped
        highlightOnHover
        noRecordsText="No benchmark runs found."
      />
    </Card>
  )
}
