const test = require('ava')
const api = require('../../src/lib/api')

test('extractLimit undefined', (t) => {
  t.falsy(api.extractLimit({}), 'Returns undefined when no limit parameter')
})

test('extractLimit when set', (t) => {
  t.is(api.extractLimit({ limit: '1' }), 1)
})

test('extractLimit when over max limit', (t) => {
  t.is(api.extractLimit({ limit: '10001' }), 10000)
})

test('extractLimit invalid values', (t) => {
  const invalidLimits = ['', '-1', '0', 'a', -1, 0]

  for (const limit of invalidLimits) {
    t.throws(() => {
      api.extractLimit({ limit })
    }, { instanceOf: api.ValidationError }, `limit parsing of ${limit}`)
  }
})
