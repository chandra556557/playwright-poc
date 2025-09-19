import { v4 as uuidv4 } from 'uuid';

/**
 * POMConverterService
 * Converts raw Playwright test code to a simple Page Object Model (POM) structure.
 * Input: JavaScript/TypeScript Playwright test file content
 * Output: { pageObject: {fileName, content}, test: {fileName, content}, summary }
 */
export default class POMConverterService {
  constructor() {}

  /**
   * Convert Playwright test code to POM
   * @param {string} code - Raw code text
   * @param {object} options - { language?: 'javascript'|'typescript', className?: string }
   */
  async convertToPOM(code, options = {}) {
    const language = options.language || 'javascript';
    const className = options.className || 'GeneratedPage';
    const testName = options.testName || 'generated-test';

    // Naive parse: collect locator lines and actions
    const lines = code.split(/\r?\n/);
    const actions = [];

    const locatorRegexes = [
      /page\.getByRole\(([^)]*)\)/,
      /page\.getByText\(([^)]*)\)/,
      /page\.locator\(([^)]*)\)/,
      /page\.getByLabel\(([^)]*)\)/,
      /page\.getByPlaceholder\(([^)]*)\)/
    ];

    const actionRegex = /(click|fill|type|press|check|uncheck|hover|dblclick|selectOption)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Try to find a locator chain like page.getByRole(...).click() or with await
      if (line.includes('page.')) {
        let locatorExpr = null;
        for (const r of locatorRegexes) {
          const m = line.match(r);
          if (m) { locatorExpr = `page.${r.source.split('\\(')[0].replace('page\\.', '')}(${m[1]})`; break; }
        }
        const actionMatch = line.match(actionRegex);
        if (locatorExpr && actionMatch) {
          const actionName = actionMatch[1];
          const argMatch = line.match(/\.(?:click|fill|type|press|check|uncheck|hover|dblclick|selectOption)\((.*)\)\s*;?$/);
          const actionArg = argMatch ? argMatch[1] : '';
          actions.push({ locatorExpr, actionName, actionArg });
        }
      }
    }

    // Build POM members (deduplicate locators)
    const locatorMap = new Map();
    let idx = 1;
    for (const a of actions) {
      if (!locatorMap.has(a.locatorExpr)) {
        const key = this._suggestMemberName(a.locatorExpr, idx);
        locatorMap.set(a.locatorExpr, key);
        idx++;
      }
    }

    // Generate class code
    const poImports = language === 'typescript'
      ? `import { Page, expect } from '@playwright/test';\n`
      : `const { expect } = require('@playwright/test');\n`;

    const classHeader = language === 'typescript'
      ? `export class ${className} {\n  constructor(private page: Page) {}\n\n`
      : `class ${className} {\n  /** @param {import('@playwright/test').Page} page */\n  constructor(page) { this.page = page; }\n\n`;

    const memberLines = [];
    locatorMap.forEach((name, expr) => {
      // Convert expr starting with 'page.' to 'this.page.'
      const memberExpr = expr.replace(/^page\./, 'this.page.');
      memberLines.push(`  ${name}() { return ${memberExpr}; }`);
    });

    // Action methods
    const methodLines = [];
    actions.forEach((a, i) => {
      const memberName = locatorMap.get(a.locatorExpr);
      const methodName = this._suggestMethodName(a.actionName, memberName, i + 1);
      const callArg = a.actionArg && a.actionArg.trim().length > 0 ? a.actionArg : '';
      const argSig = a.actionName === 'fill' || a.actionName === 'type' ? (language === 'typescript' ? 'value: string' : 'value') : '';
      const passArg = a.actionName === 'fill' || a.actionName === 'type' ? (callArg || 'value') : (callArg || '');
      const method = `  async ${methodName}(${argSig}) {\n    await this.${memberName}().${a.actionName}(${passArg});\n  }`;
      methodLines.push(method);
    });

    const classFooter = language === 'typescript' ? '}\n' : '}\nmodule.exports = { ' + className + ' };\n';

    const pageObjectContent = [
      poImports,
      classHeader,
      ...memberLines,
      '',
      ...methodLines,
      classFooter
    ].join('\n');

    // Generate refactored test using POM
    const testImports = `import { test, expect } from '@playwright/test';\nimport { ${className} } from './${className}.page';\n`;
    const testBody = `test('${testName}', async ({ page }) => {\n  const po = new ${className}(page);\n  // TODO: navigate to base URL if needed\n${methodLines.map(m => m.match(/async\s+(\w+)/)?.[1]).filter(Boolean).map(n => `  await po.${n}();`).join('\n')}\n});\n`;

    const files = {
      pageObject: {
        fileName: `${className}.page.${language === 'typescript' ? 'ts' : 'js'}`,
        content: pageObjectContent
      },
      test: {
        fileName: `${className}.spec.${language === 'typescript' ? 'ts' : 'js'}`,
        content: testImports + '\n' + testBody
      }
    };

    return {
      id: uuidv4(),
      files,
      summary: {
        locators: locatorMap.size,
        actions: actions.length,
        className,
        language
      }
    };
  }

  _suggestMemberName(expr, index) {
    // Try to infer from role/name, placeholder, label; fallback to elN
    if (expr.includes('getByRole')) {
      const nameMatch = expr.match(/name:\s*'([^']+)'/);
      if (nameMatch) return this._toSafeName(nameMatch[1]) + 'ByRole';
      return 'byRole' + index;
    }
    if (expr.includes('getByPlaceholder')) return 'byPlaceholder' + index;
    if (expr.includes('getByLabel')) return 'byLabel' + index;
    if (expr.includes('getByText')) return 'byText' + index;
    if (expr.includes('locator')) return 'el' + index;
    return 'el' + index;
  }

  _suggestMethodName(action, memberName, index) {
    const base = memberName.replace(/^by|^el/, '').replace(/[^a-zA-Z0-9]/g, '');
    const actionVerb = action === 'click' ? 'click' : action === 'fill' ? 'fill' : action;
    return (actionVerb + (base ? this._capitalize(base) : index)).replace(/\s+/g, '');
  }

  _toSafeName(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  _capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
