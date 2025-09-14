# Visual Regression Testing with Percy

This project uses Percy for visual regression testing to catch visual bugs and ensure UI consistency across different browsers, devices, and screen sizes.

## Overview

Visual regression testing automatically captures screenshots of your application and compares them against baseline images to detect visual changes. This helps catch:

- Unintended visual changes
- Cross-browser rendering differences
- Responsive design issues
- CSS regression bugs
- Component state variations

## Setup

### 1. Percy Account Setup

1. Sign up for a free Percy account at [percy.io](https://percy.io)
2. Create a new project for your application
3. Get your Percy token from the project settings

### 2. Environment Configuration

Create a `.env` file in your project root with your Percy token:

```bash
PERCY_TOKEN=your_percy_token_here
```

**Important:** Add `.env` to your `.gitignore` file to keep your token secure.

### 3. CI/CD Integration

For GitHub Actions, add your Percy token as a repository secret:

1. Go to your repository settings
2. Navigate to Secrets and Variables > Actions
3. Add a new secret named `PERCY_TOKEN` with your token value

## Configuration Files

### percy.config.yml

The main Percy configuration file defines:

- **Project settings**: Name and base URL
- **Responsive breakpoints**: Mobile, tablet, desktop, and large desktop
- **Visual testing options**: JavaScript execution, network timeouts
- **CSS injection**: Hide dynamic elements and disable animations
- **Upload settings**: Parallel uploads and timeouts

### Visual Testing Utilities

The `tests/visual-utils.js` file provides helper functions:

- `takePercySnapshot()`: Enhanced snapshot with default options
- `takeResponsiveSnapshots()`: Test across multiple breakpoints
- `takeElementSnapshot()`: Focus on specific components
- `waitForVisualReady()`: Ensure page stability before screenshots
- `hideDynamicElements()`: Hide elements that cause flaky tests
- `disableAnimations()`: Disable animations for consistent results

## Running Visual Tests

### Available Commands

```bash
# Run visual regression tests
npm run test:visual

# Update visual baselines (use carefully!)
npm run test:visual:update

# Debug visual tests
npm run test:visual:debug

# Percy CLI commands
npm run percy:start     # Create new Percy project
npm run percy:finalize  # Finalize Percy build
npm run percy:status    # Check build status
```

### Local Development

1. Start your development server:
   ```bash
   npm run dev
   ```

2. In another terminal, run visual tests:
   ```bash
   npm run test:visual
   ```

3. View results in the Percy dashboard

## Test Structure

### Current Visual Tests

The `tests/visual-regression.spec.js` file includes:

1. **Full Page Tests**: Complete page screenshots
2. **Responsive Tests**: Multiple breakpoint testing
3. **Component Tests**: Individual component screenshots
4. **State Tests**: Different component states (hover, focus, disabled)
5. **Form Tests**: Empty and filled form states
6. **Modal Tests**: Before/after modal opening
7. **Theme Tests**: Light/dark mode comparisons
8. **Loading States**: Loading and error state testing

### Writing New Visual Tests

```javascript
import { test } from '@playwright/test';
import { takePercySnapshot, waitForVisualReady } from './visual-utils.js';

test('My Component Visual Test', async ({ page }) => {
  // Navigate to your page
  await page.goto('http://localhost:5173/my-page');
  
  // Wait for page to be ready
  await waitForVisualReady(page);
  
  // Take screenshot
  await takePercySnapshot(page, 'My Component');
});
```

## Best Practices

### 1. Stable Screenshots

- **Hide dynamic content**: Timestamps, user avatars, random IDs
- **Disable animations**: Prevent timing-based inconsistencies
- **Wait for network idle**: Ensure all resources are loaded
- **Use consistent data**: Mock APIs with predictable responses

### 2. Meaningful Test Names

```javascript
// Good
await takePercySnapshot(page, 'Login Form - Empty State');
await takePercySnapshot(page, 'Login Form - Validation Errors');

// Bad
await takePercySnapshot(page, 'Test 1');
await takePercySnapshot(page, 'Screenshot');
```

### 3. Responsive Testing

```javascript
// Test multiple breakpoints
await takeResponsiveSnapshots(page, 'Homepage', {
  breakpoints: ['mobile', 'tablet', 'desktop']
});
```

### 4. Component Isolation

```javascript
// Focus on specific components
await takeElementSnapshot(page, '.navigation', 'Navigation Component');
```

### 5. State Testing

```javascript
// Test different component states
await testComponentStates(page, 'Button', {
  'Default': async (page) => { /* setup default state */ },
  'Hover': async (page) => { await page.hover('button'); },
  'Disabled': async (page) => { /* setup disabled state */ }
});
```

## Troubleshooting

### Common Issues

1. **Flaky Tests**
   - Add longer wait times
   - Hide more dynamic elements
   - Check for animations or transitions

2. **Percy Token Issues**
   - Verify token is set correctly
   - Check token permissions
   - Ensure token is not expired

3. **Screenshot Differences**
   - Check for font loading issues
   - Verify consistent browser versions
   - Look for timing-related changes

### Debugging Tips

1. **Use debug mode**:
   ```bash
   npm run test:visual:debug
   ```

2. **Check Percy dashboard** for detailed diff views

3. **Run tests locally** before CI to catch issues early

4. **Use browser dev tools** to inspect elements causing differences

## Integration with Existing Tests

### Playwright Integration

Visual tests run alongside your existing Playwright tests:

```javascript
// Regular functional test
test('Login functionality', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});

// Visual test for the same flow
test('Login flow visual test', async ({ page }) => {
  await page.goto('/login');
  await takePercySnapshot(page, 'Login Page');
  
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await takePercySnapshot(page, 'Login Form - Filled');
  
  await page.click('button[type="submit"]');
  await waitForVisualReady(page);
  await takePercySnapshot(page, 'Dashboard After Login');
});
```

### Allure Integration

Visual test results can be included in Allure reports:

```javascript
test('Visual test with Allure', async ({ page }) => {
  await allure.step('Navigate to page', async () => {
    await page.goto('/my-page');
  });
  
  await allure.step('Take visual snapshot', async () => {
    await takePercySnapshot(page, 'My Page');
  });
});
```

## CI/CD Pipeline Integration

### GitHub Actions Example

```yaml
name: Visual Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install
        
      - name: Start development server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:5173
        
      - name: Run visual tests
        run: npm run test:visual
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Maintenance

### Updating Baselines

**⚠️ Use with caution!** Only update baselines when you've intentionally changed the UI:

```bash
npm run test:visual:update
```

### Regular Maintenance Tasks

1. **Review Percy builds** regularly for unexpected changes
2. **Update test selectors** when UI structure changes
3. **Add new tests** for new components or pages
4. **Clean up obsolete tests** for removed features
5. **Monitor test performance** and optimize slow tests

## Resources

- [Percy Documentation](https://docs.percy.io/)
- [Playwright Visual Testing](https://playwright.dev/docs/test-snapshots)
- [Percy Playwright Integration](https://docs.percy.io/docs/playwright)
- [Visual Testing Best Practices](https://docs.percy.io/docs/visual-testing-best-practices)

## Support

For issues with:
- **Percy setup**: Check Percy documentation or contact Percy support
- **Playwright integration**: Review Playwright documentation
- **Project-specific issues**: Create an issue in this repository