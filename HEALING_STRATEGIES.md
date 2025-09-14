# Healing Strategies Documentation

This document explains how to create and add new healing strategies to the self-healing test framework.

## Overview

The healing engine uses TypeScript strategies located in the `strategies/` folder to automatically fix failing test selectors. These strategies are compiled to JavaScript and loaded dynamically by the system.

## Strategy Structure

All healing strategies must extend the `BaseHealingStrategy` class and implement the required methods:

```typescript
import { BaseHealingStrategy } from './base-strategy';
import { ElementContext, HealingCandidate } from '../types';

export class MyCustomStrategy extends BaseHealingStrategy {
  constructor(page: any) {
    super(page, 'my-custom-strategy');
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    // Your healing logic here
    return candidates;
  }
}
```

## Available Base Classes

### BaseHealingStrategy

Provides common functionality for all strategies:

- `page`: Playwright page object
- `name`: Strategy identifier
- `priority`: Strategy priority (1-10, higher = more important)
- `generateCandidates()`: Main method to implement
- `validateCandidate()`: Optional validation method

## Types

### ElementContext

```typescript
interface ElementContext {
  originalSelector: string;
  tagName?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  position?: { x: number; y: number };
  visible?: boolean;
  enabled?: boolean;
}
```

### HealingCandidate

```typescript
interface HealingCandidate {
  selector: string;
  confidence: number; // 0-1
  strategy: string;
  description: string;
  element?: any;
}
```

## Creating a New Strategy

1. **Create the TypeScript file** in the `strategies/` folder:

```typescript
// strategies/my-new-strategy.ts
import { BaseHealingStrategy } from './base-strategy';
import { ElementContext, HealingCandidate } from '../types';

export class MyNewStrategy extends BaseHealingStrategy {
  constructor(page: any) {
    super(page, 'my-new-strategy');
    this.priority = 5; // Set priority (1-10)
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];
    
    // Example: Find elements by partial text match
    if (context.textContent) {
      const elements = await this.page.locator(`text=${context.textContent}`).all();
      
      for (const element of elements) {
        candidates.push({
          selector: `text=${context.textContent}`,
          confidence: 0.8,
          strategy: this.name,
          description: `Found by text content: ${context.textContent}`,
          element
        });
      }
    }
    
    return candidates;
  }
}
```

2. **The strategy will be automatically compiled and loaded** when the server starts.

## Existing Strategies

The framework includes several built-in strategies:

### 1. Semantic Text Strategy
- **File**: `semantic-text.ts`
- **Purpose**: Matches elements using semantic text analysis and synonyms
- **Priority**: 7
- **Use case**: When text content changes slightly (e.g., "Login" vs "Sign In")

### 2. Attribute Relaxation Strategy
- **File**: `attribute-relaxation.ts`
- **Purpose**: Finds elements by relaxing attribute matching criteria
- **Priority**: 6
- **Use case**: When class names or IDs change partially

### 3. DOM Structure Strategy
- **File**: `dom-structure.ts`
- **Purpose**: Uses DOM hierarchy and structure to locate elements
- **Priority**: 5
- **Use case**: When selectors break but DOM structure remains similar

### 4. Visual Similarity Strategy
- **File**: `visual-similarity.ts`
- **Purpose**: Finds visually similar elements based on position and appearance
- **Priority**: 4
- **Use case**: When layout changes but visual appearance is similar

### 5. Role Accessible Name Strategy
- **File**: `role-accessible-name.ts`
- **Purpose**: Uses ARIA roles and accessible names for element detection
- **Priority**: 8
- **Use case**: Accessibility-focused element location

### 6. Text Fuzzy Match Strategy
- **File**: `text-fuzzy-match.ts`
- **Purpose**: Fuzzy text matching with tolerance for typos and variations
- **Priority**: 6
- **Use case**: When text content has minor variations

### 7. Anchor Proximity Strategy
- **File**: `anchor-proximity.ts`
- **Purpose**: Finds elements near stable anchor points
- **Priority**: 5
- **Use case**: When target element moves but nearby elements remain stable

## Best Practices

### 1. Strategy Design
- Keep strategies focused on a single healing approach
- Set appropriate priority levels (1-10)
- Return multiple candidates when possible
- Include descriptive messages for debugging

### 2. Performance
- Avoid expensive operations in `generateCandidates()`
- Use efficient selectors
- Limit the number of candidates returned (max 10)

### 3. Confidence Scoring
- Use confidence scores between 0 and 1
- Higher confidence for exact matches
- Lower confidence for fuzzy matches
- Consider multiple factors (text, position, attributes)

### 4. Error Handling
- Wrap operations in try-catch blocks
- Return empty array on errors
- Log meaningful error messages

## Testing Strategies

To test your custom strategy:

1. **Add it to the strategies folder**
2. **Restart the server** to compile and load it
3. **Run tests** that would benefit from your strategy
4. **Check the healing reports** to see if your strategy is being used

## Strategy Priority Guidelines

- **Priority 9-10**: Exact matches (ID, data-testid)
- **Priority 7-8**: Semantic matches (ARIA, accessible names)
- **Priority 5-6**: Structural matches (DOM, attributes)
- **Priority 3-4**: Visual/positional matches
- **Priority 1-2**: Fallback strategies

## Debugging

To debug strategy execution:

1. Check server logs for compilation errors
2. Look for strategy loading messages
3. Review healing reports for strategy usage
4. Add console.log statements in your strategy code

## Advanced Features

### Custom Validation

Override the `validateCandidate()` method for custom validation:

```typescript
async validateCandidate(candidate: HealingCandidate): Promise<boolean> {
  // Custom validation logic
  const element = await this.page.locator(candidate.selector).first();
  return await element.isVisible();
}
```

### Context Enhancement

Strategies can enhance the context with additional information:

```typescript
async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
  // Enhance context with additional data
  const enhancedContext = {
    ...context,
    parentElement: await this.getParentInfo(context),
    siblings: await this.getSiblingInfo(context)
  };
  
  // Use enhanced context for better matching
  return this.findCandidates(enhancedContext);
}
```

This documentation should help you create effective healing strategies for your test automation needs.