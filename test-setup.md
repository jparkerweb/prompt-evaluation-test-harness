# Test Setup - ES Modules with Vitest

The project has been fully migrated to ES modules and is configured to use Vitest for testing.

## ✅ Migration Complete

### What Was Done:
1. **Converted to ES Modules**: Updated `package.json` to use `"type": "module"`
2. **Updated All Imports**: Changed from `require()` to `import` statements
3. **Updated All Exports**: Changed from `module.exports` to `export` statements
4. **Fixed File Extensions**: Added `.js` extensions to all relative imports
5. **Updated Vitest Config**: Configured for ES modules
6. **Fixed Test Files**: Updated test syntax to use ES module imports

## Configuration

### Root Level Tests (Backend)
- **Config File**: `vitest.config.js`
- **Environment**: Node.js
- **Module System**: ES Modules
- **Test Scripts**:
  - `npm test` - Run all tests
  - `npm run test:ui` - Run tests with UI
  - `npm run test:coverage` - Run tests with coverage

### Client Level Tests (Frontend)
- **Config File**: `client/vitest.config.js`
- **Environment**: happy-dom
- **Module System**: ES Modules
- **Test Scripts** (run from client directory):
  - `npm test` - Run all tests
  - `npm run test:ui` - Run tests with UI
  - `npm run test:coverage` - Run tests with coverage

## Writing Tests

### Backend Tests (ES Modules)
```javascript
import { describe, it, expect, vi } from 'vitest'
import { parseBoolean } from './helpers.js'

describe('Helpers', () => {
  it('should parse boolean correctly', () => {
    expect(parseBoolean('true')).toBe(true)
  })
})
```

### Mocking in Backend Tests
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock external modules
vi.mock('../../config/database.js', () => ({
  run: vi.fn(),
  get: vi.fn()
}))

describe('Service Tests', () => {
  let service
  let database
  
  beforeEach(async () => {
    vi.clearAllMocks()
    database = await import('../../config/database.js')
    service = (await import('./service.js')).default
  })
  
  it('should work with mocks', async () => {
    database.get.mockResolvedValue({ id: 1 })
    const result = await service.getData()
    expect(result).toBeDefined()
  })
})
```

### Frontend Tests (ES Modules)
```javascript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Component from './Component.vue'

describe('Component', () => {
  it('renders properly', () => {
    const wrapper = mount(Component)
    expect(wrapper.text()).toContain('Expected text')
  })
})
```

## ✅ Verification

All systems tested and working:
- ✅ Server starts successfully with ES modules
- ✅ Database migrations run correctly
- ✅ Backend tests pass (utils/helpers.test.js)
- ✅ Frontend tests pass (LoadingSpinner.test.js)
- ✅ Import/export syntax is consistent throughout

## Next Steps

The codebase is now fully modernized with ES modules and ready for:
1. Dataset management implementation
2. Prompt management implementation  
3. Evaluation engine implementation
4. Additional test coverage as features are built