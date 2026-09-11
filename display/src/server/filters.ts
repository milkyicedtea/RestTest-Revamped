import { z } from 'zod'
import { platformSchema } from './upload-schema'

// language/framework accept multiple values. URL search and API query params
// carry them comma-separated (e.g. ?language=typescript,rust); the router and
// server functions may also pass them as JS arrays.
const csvArray = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => (Array.isArray(value) ? value : value.split(',')).filter(Boolean))
  .optional()

// Accepts both URL search strings (coerced) and plain objects with numbers.
export const resultFiltersSchema = z.object({
  language: csvArray,
  framework: csvArray,
  test_ids: csvArray,
  platform: platformSchema.optional(),
  min_cores: z.coerce.number().optional(),
  max_cores: z.coerce.number().optional(),
  min_threads: z.coerce.number().optional(),
  max_threads: z.coerce.number().optional(),
  min_ram: z.coerce.number().optional(),
  max_ram: z.coerce.number().optional(),
  limit: z.coerce.number().default(100),
  offset: z.coerce.number().default(0),
})

export type ResultFilters = z.infer<typeof resultFiltersSchema>

export const searchSchema = resultFiltersSchema.extend({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
})

export type Search = z.infer<typeof searchSchema>

// Dashboard defaults live here, not in the search schema: schema defaults
// would make the router canonicalize `/` into a 307 to `/?limit=200&offset=0`.
export function withDefaults(search: Search): ResultFilters {
  return { ...search, limit: search.limit ?? 200, offset: search.offset ?? 0 }
}
