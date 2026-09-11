import { AppShell, Container, Group, MantineProvider, Text, Title } from '@mantine/core'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import '@mantine/core/styles.css'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'RestTest Display' },
      {
        // inline icon: no /favicon.ico request, no router 404 warning
        rel: 'icon',
        href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="%23228be6"/><text x="8" y="12" font-size="10" text-anchor="middle" fill="white" font-family="sans-serif">R</text></svg>',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <MantineProvider defaultColorScheme="dark" forceColorScheme="dark">
        <AppShell header={{ height: 68 }}>
          <AppShell.Header>
            <Container size="xl" h="100%">
              <Group h="100%" justify="space-between">
                <div>
                  <Title order={3}>RestTest Display</Title>
                  <Text size="xs" c="dimmed">
                    Framework benchmark explorer
                  </Text>
                </div>
              </Group>
            </Container>
          </AppShell.Header>
          <AppShell.Main>
            <Container size="xl" py="md">
              <Outlet />
            </Container>
          </AppShell.Main>
        </AppShell>
      </MantineProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-mantine-color-scheme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
