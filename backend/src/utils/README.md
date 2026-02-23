# 🛠️ Utilities Directory

Shared utility functions and helpers used across the application.

## Files

- **logger.js**: Centralized logging utility with different log levels
- **errors.js**: Custom error classes for structured error handling
- **validators.js**: Validation helper functions
- **helpers.js**: General helper functions (sleep, formatDate, truncate, etc.)

## Usage

### Logger

```javascript
import logger from './utils/logger.js';

logger.info('Application started');
logger.error('Something went wrong', error);
logger.success('Operation completed');
logger.warning('This is a warning');
```

### Errors

```javascript
import { ValidationError, NotFoundError } from './utils/errors.js';

throw new ValidationError('Email is required', 'email');
throw new NotFoundError('Lead');
```

### Validators

```javascript
import { validateEmail, validateLinkedInUrl, validateRequired } from './utils/validators.js';

if (!validateEmail(email)) {
  throw new ValidationError('Invalid email format');
}
```

### Helpers

```javascript
import { sleep, truncate, formatDate } from './utils/helpers.js';

await sleep(1000); // Wait 1 second
const short = truncate(longString, 100);
const isoDate = formatDate(new Date());
```

## Guidelines

- Keep utilities pure functions when possible (no side effects)
- Document complex functions
- Export functions individually for tree-shaking
- Don't import services or database connections here
