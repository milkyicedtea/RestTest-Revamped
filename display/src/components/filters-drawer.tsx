import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Tooltip,
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type React from 'react'
import { useMemo } from 'react'
import type { ResultFilters } from '@/server/filters'
import { filterOptionsQueryOptions } from '@/server/results'

const platformOptions = [
  { label: 'Any', value: '' },
  { label: 'Linux', value: 'linux' },
  { label: 'Windows', value: 'windows' },
  { label: 'macOS', value: 'macos' },
  { label: 'Unknown', value: 'unknown' },
]

const numberFilterKeys = [
  'min_cores',
  'max_cores',
  'min_threads',
  'max_threads',
  'min_ram',
  'max_ram',
] as const

type NumberFilterKey = (typeof numberFilterKeys)[number]

interface FiltersDrawerProps {
  opened: boolean
  onClose: () => void
}

export function FiltersDrawer(props: FiltersDrawerProps): React.JSX.Element {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const { data: options } = useSuspenseQuery(filterOptionsQueryOptions())

  function commitSearch(next: typeof search): void {
    navigate({ search: { ...next, offset: 0 }, replace: true })
  }

  function patchSearch(patch: Partial<typeof search>): void {
    commitSearch({ ...search, ...patch })
  }

  function setNumberFilter(key: NumberFilterKey | 'limit', value: string | number): void {
    if (key === 'limit') {
      patchSearch({ limit: typeof value === 'number' ? value : 200 })
      return
    }

    const patch: Partial<typeof search> = {}
    patch[key] = typeof value === 'number' ? value : undefined
    patchSearch(patch)
  }

  // Framework options are scoped to the selected languages (all languages when
  // none are selected) — the dependency is communicated via the info tooltip.
  function availableFrameworks(languages: string[]): Set<string> {
    const source =
      languages.length > 0
        ? options.frameworks.filter((pair) => languages.includes(pair.language))
        : options.frameworks
    return new Set(source.map((pair) => pair.framework))
  }

  const frameworkOptions = useMemo(
    () => [...availableFrameworks(search.language ?? [])],
    [options, search.language]
  )

  function setLanguages(languages: string[]): void {
    const allowed = availableFrameworks(languages)
    const kept = (search.framework ?? []).filter((framework) => allowed.has(framework))
    patchSearch({
      language: languages.length > 0 ? languages : undefined,
      framework: kept.length > 0 ? kept : undefined,
    })
  }

  function setFrameworks(frameworks: string[]): void {
    patchSearch({ framework: frameworks.length > 0 ? frameworks : undefined })
  }

  function setTestIds(testIds: string[]): void {
    patchSearch({ test_ids: testIds.length > 0 ? testIds : undefined })
  }

  function setPlatform(platform: string | null): void {
    patchSearch({ platform: platform ? (platform as ResultFilters['platform']) : undefined })
  }

  function resetFilters(): void {
    navigate({ search: {}, replace: true })
  }

  return (
    <Drawer
      opened={props.opened}
      onClose={props.onClose}
      title="Filters"
      position="right"
      size="md"
    >
      <Stack gap="sm">
        <MultiSelect
          label="Language"
          placeholder="Any"
          data={options.languages}
          value={search.language ?? []}
          onChange={setLanguages}
          searchable
          clearable
        />
        <MultiSelect
          label={
            <Group gap={4} wrap="nowrap">
              <span>Framework</span>
              <Tooltip label="Options are limited to the selected languages" withArrow>
                <ActionIcon
                  variant="transparent"
                  color="gray"
                  aria-label="Framework options depend on the selected languages"
                  tabIndex={-1}
                  onClick={(event: React.MouseEvent) => event.preventDefault()}
                >
                  <IconInfoCircle size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          }
          data={frameworkOptions}
          value={search.framework ?? []}
          onChange={setFrameworks}
          searchable
          clearable
        />
        <MultiSelect
          label="Test ID"
          placeholder="pg_read"
          data={options.testIds}
          value={search.test_ids ?? []}
          onChange={setTestIds}
          searchable
          clearable
        />
        <Select
          label="Platform"
          data={platformOptions}
          value={search.platform ?? ''}
          onChange={setPlatform}
        />
        <Group grow>
          <NumberInput
            label="Min cores"
            value={search.min_cores ?? ''}
            onChange={(value: string | number) => setNumberFilter('min_cores', value)}
            min={1}
          />
          <NumberInput
            label="Max cores"
            value={search.max_cores ?? ''}
            onChange={(value: string | number) => setNumberFilter('max_cores', value)}
            min={1}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Min threads"
            value={search.min_threads ?? ''}
            onChange={(value: string | number) => setNumberFilter('min_threads', value)}
            min={1}
          />
          <NumberInput
            label="Max threads"
            value={search.max_threads ?? ''}
            onChange={(value: string | number) => setNumberFilter('max_threads', value)}
            min={1}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Min RAM (GB)"
            value={search.min_ram ?? ''}
            onChange={(value: string | number) => setNumberFilter('min_ram', value)}
            min={1}
          />
          <NumberInput
            label="Max RAM (GB)"
            value={search.max_ram ?? ''}
            onChange={(value: string | number) => setNumberFilter('max_ram', value)}
            min={1}
          />
        </Group>
        <NumberInput
          label="Limit"
          value={search.limit ?? 200}
          onChange={(value: string | number) => setNumberFilter('limit', value)}
          min={1}
          max={1000}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={resetFilters}>
            Reset all
          </Button>
        </Group>
      </Stack>
    </Drawer>
  )
}
