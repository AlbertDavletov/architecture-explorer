import { expect, it } from 'vitest'
import { architecture } from '../model/architecture'
import fixture from './details.json'
import { createDetailsCatalog, isExternalUrl } from './model'
import { getComponentDetails } from './details'

it('loads only the four explicitly authored leaves and leaves structural data untouched', () => {
  const before = JSON.stringify([...architecture.components])
  const catalog = createDetailsCatalog(fixture, architecture)
  expect([...catalog.keys()]).toEqual([
    'processing',
    'records',
    'compositor',
    'notifications',
  ])
  for (const id of catalog.keys())
    expect(architecture.children(id)).toHaveLength(0)
  expect(getComponentDetails('processing')?.owner).toBe(
    'Loom Media Team (fictional)',
  )
  expect(getComponentDetails('search')).toBeUndefined()
  expect(getComponentDetails('assets')).toBeUndefined()
  expect(JSON.stringify([...architecture.components])).toBe(before)
})

it('ignores unknown IDs and parents even with otherwise valid metadata', () => {
  expect(
    createDetailsCatalog(
      {
        components: {
          missing: { summary: 'Unknown' },
          cloud: { summary: 'Container' },
          rendering: { summary: 'Nested container' },
          records: { summary: 'Valid leaf' },
        },
      },
      architecture,
    ).size,
  ).toBe(1)
})

it.each([
  null,
  {},
  { arbitrary: 'No known fields' },
  { summary: '' },
  { owner: ' ' },
  { documentation: [] },
  { metrics: [] },
  { source: {} },
  {
    summary: 'Valid',
    source: { title: 'Bad URL', url: 'javascript:alert(1)' },
  },
  { usedBy: ['missing'] },
  { usedBy: 'gateway' },
  { documentation: [{ title: '', url: 'https://example.com' }] },
  { resources: [{ title: 'Missing URL' }] },
  { featureFlags: [{ name: '' }] },
  { metrics: [{ name: 'Count', description: 1 }] },
])(
  'does not create an Inspector from invalid/empty metadata: %j',
  (details) => {
    expect(
      createDetailsCatalog({ components: { records: details } }, architecture)
        .size,
    ).toBe(0)
  },
)

it('supports partial metadata and omits empty optional lists without creating placeholders', () => {
  const catalog = createDetailsCatalog(
    {
      components: {
        records: {
          owner: 'Example team',
          usedBy: ['gateway', 'gateway'],
          metrics: [],
          documentation: [],
        },
        files: { metrics: [{ name: 'Files stored' }] },
      },
    },
    architecture,
  )
  expect(catalog.get('records')).toEqual({
    owner: 'Example team',
    usedBy: ['gateway'],
  })
  expect(catalog.get('files')).toEqual({ metrics: [{ name: 'Files stored' }] })
  expect(createDetailsCatalog(null, architecture).size).toBe(0)
})

it.each([
  'javascript:alert(1)',
  'data:text/html,test',
  'file:///secret',
  '//example.com',
  '/relative',
  'not a URL',
  'https:example.com',
  'https://example.com/\u00a0',
  'https://user:pass@example.com',
  ' https://example.com',
  'https://example.com/\n',
])('rejects unsafe or malformed external URL %s', (url) => {
  expect(isExternalUrl(url)).toBe(false)
})
it('accepts absolute HTTP(S) links, including encoded paths and fragments', () => {
  expect(isExternalUrl('https://example.com/a%20b#guide')).toBe(true)
  expect(isExternalUrl('http://example.com/docs')).toBe(true)
})
