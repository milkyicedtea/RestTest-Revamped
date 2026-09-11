import { Card, Text, Title } from '@mantine/core'
import type React from 'react'

interface StatCardProps {
  title: string
  value: string
}

export function StatCard(props: StatCardProps): React.JSX.Element {
  return (
    <Card withBorder>
      <Text size="sm" c="dimmed">
        {props.title}
      </Text>
      <Title order={3}>{props.value}</Title>
    </Card>
  )
}
