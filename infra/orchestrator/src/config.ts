export interface Test {
  id: string
  description?: string
  endpoint: string
}

export interface Framework {
  name: string
  container: string
  port: number | string
  tests: Array<Test>
}

export interface ResolvedFramewrok extends Framework {
  language: string
}

export interface Language {
  name: string
  frameworks: Array<Framework>
}

export interface Config {
  langauges: Array<Language>
}

// Edit this to add more tests!
export const config: Config = {
  langauges: [
    {
      name: "typescript",
      frameworks: [
        {
          name: "hono",
          container: "hono",
          port: 4101,
          tests: [
            { id: "basic_hello", description: "Simple hello world endpoint", endpoint: "/" },
            { id: "pg_read", description: "Postgres read test", endpoint: "/pg/read" }
          ]
        }
      ]
    }
  ]
}
