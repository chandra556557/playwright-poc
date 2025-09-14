class TemplateEngine {
  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  initializeDefaultTemplates() {
    // JavaScript/TypeScript Templates
    this.templates.set('javascript-playwright', {
      name: 'Playwright (JavaScript)',
      language: 'javascript',
      framework: 'playwright',
      fileExtension: '.spec.js',
      imports: `const { test, expect } = require('@playwright/test');`,
      testSuite: (name, tests) => `
test.describe('${name}', () => {
${tests}
});`,
      testCase: (name, steps) => `  test('${name}', async ({ page }) => {
${steps}
  });`,
      actions: {
        navigate: (url) => `    await page.goto('${url}');`,
        click: (selector) => `    await page.click('${selector}');`,
        fill: (selector, value) => `    await page.fill('${selector}', '${value}');`,
        select: (selector, value) => `    await page.selectOption('${selector}', '${value}');`,
        wait: (selector) => `    await page.waitForSelector('${selector}');`,
        assertion: (selector, property, value) => `    await expect(page.locator('${selector}')).${this.getPlaywrightAssertion(property, value)};`
      }
    });

    this.templates.set('javascript-cypress', {
      name: 'Cypress (JavaScript)',
      language: 'javascript',
      framework: 'cypress',
      fileExtension: '.cy.js',
      imports: `/// <reference types="cypress" />`,
      testSuite: (name, tests) => `
describe('${name}', () => {
${tests}
});`,
      testCase: (name, steps) => `  it('${name}', () => {
${steps}
  });`,
      actions: {
        navigate: (url) => `    cy.visit('${url}');`,
        click: (selector) => `    cy.get('${selector}').click();`,
        fill: (selector, value) => `    cy.get('${selector}').type('${value}');`,
        select: (selector, value) => `    cy.get('${selector}').select('${value}');`,
        wait: (selector) => `    cy.get('${selector}').should('be.visible');`,
        assertion: (selector, property, value) => `    cy.get('${selector}').should('${this.getCypressAssertion(property, value)}');`
      }
    });

    this.templates.set('javascript-selenium', {
      name: 'Selenium WebDriver (JavaScript)',
      language: 'javascript',
      framework: 'selenium',
      fileExtension: '.test.js',
      imports: `const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');`,
      testSuite: (name, tests) => `
describe('${name}', function() {
  let driver;

  before(async function() {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async function() {
    await driver.quit();
  });

${tests}
});`,
      testCase: (name, steps) => `  it('${name}', async function() {
${steps}
  });`,
      actions: {
        navigate: (url) => `    await driver.get('${url}');`,
        click: (selector) => `    await driver.findElement(By.css('${selector}')).click();`,
        fill: (selector, value) => `    await driver.findElement(By.css('${selector}')).sendKeys('${value}');`,
        select: (selector, value) => `    const select = await driver.findElement(By.css('${selector}'));
    await select.findElement(By.css('option[value="${value}"]')).click();`,
        wait: (selector) => `    await driver.wait(until.elementLocated(By.css('${selector}')), 10000);`,
        assertion: (selector, property, value) => `    const element = await driver.findElement(By.css('${selector}'));
    ${this.getSeleniumAssertion(property, value)}`
      }
    });

    // Python Templates
    this.templates.set('python-playwright', {
      name: 'Playwright (Python)',
      language: 'python',
      framework: 'playwright',
      fileExtension: '.py',
      imports: `import pytest
from playwright.sync_api import Page, expect`,
      testSuite: (name, tests) => `
class Test${this.toPascalCase(name)}:
${tests}`,
      testCase: (name, steps) => `    def test_${this.toSnakeCase(name)}(self, page: Page):
${steps}`,
      actions: {
        navigate: (url) => `        page.goto('${url}')`,
        click: (selector) => `        page.click('${selector}')`,
        fill: (selector, value) => `        page.fill('${selector}', '${value}')`,
        select: (selector, value) => `        page.select_option('${selector}', '${value}')`,
        wait: (selector) => `        page.wait_for_selector('${selector}')`,
        assertion: (selector, property, value) => `        expect(page.locator('${selector}')).${this.getPythonPlaywrightAssertion(property, value)}`
      }
    });

    this.templates.set('python-selenium', {
      name: 'Selenium WebDriver (Python)',
      language: 'python',
      framework: 'selenium',
      fileExtension: '.py',
      imports: `import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC`,
      testSuite: (name, tests) => `
class Test${this.toPascalCase(name)}(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, 10)

    def tearDown(self):
        self.driver.quit()

${tests}`,
      testCase: (name, steps) => `    def test_${this.toSnakeCase(name)}(self):
${steps}`,
      actions: {
        navigate: (url) => `        self.driver.get('${url}')`,
        click: (selector) => `        self.driver.find_element(By.CSS_SELECTOR, '${selector}').click()`,
        fill: (selector, value) => `        self.driver.find_element(By.CSS_SELECTOR, '${selector}').send_keys('${value}')`,
        select: (selector, value) => `        from selenium.webdriver.support.ui import Select
        select = Select(self.driver.find_element(By.CSS_SELECTOR, '${selector}'))
        select.select_by_value('${value}')`,
        wait: (selector) => `        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))`,
        assertion: (selector, property, value) => `        element = self.driver.find_element(By.CSS_SELECTOR, '${selector}')
        ${this.getPythonSeleniumAssertion(property, value)}`
      }
    });

    // Java Templates
    this.templates.set('java-selenium', {
      name: 'Selenium WebDriver (Java)',
      language: 'java',
      framework: 'selenium',
      fileExtension: '.java',
      imports: `import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;`,
      testSuite: (name, tests) => `
public class ${this.toPascalCase(name)}Test {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

${tests}
}`,
      testCase: (name, steps) => `    @Test
    void test${this.toPascalCase(name)}() {
${steps}
    }`,
      actions: {
        navigate: (url) => `        driver.get("${url}");`,
        click: (selector) => `        driver.findElement(By.cssSelector("${selector}")).click();`,
        fill: (selector, value) => `        driver.findElement(By.cssSelector("${selector}")).sendKeys("${value}");`,
        select: (selector, value) => `        Select select = new Select(driver.findElement(By.cssSelector("${selector}")));
        select.selectByValue("${value}");`,
        wait: (selector) => `        wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("${selector}")));`,
        assertion: (selector, property, value) => `        WebElement element = driver.findElement(By.cssSelector("${selector}"));
        ${this.getJavaSeleniumAssertion(property, value)}`
      }
    });

    // C# Templates
    this.templates.set('csharp-selenium', {
      name: 'Selenium WebDriver (C#)',
      language: 'csharp',
      framework: 'selenium',
      fileExtension: '.cs',
      imports: `using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using System;`,
      testSuite: (name, tests) => `
[TestFixture]
public class ${this.toPascalCase(name)}Tests
{
    private IWebDriver driver;
    private WebDriverWait wait;

    [SetUp]
    public void SetUp()
    {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
    }

    [TearDown]
    public void TearDown()
    {
        driver?.Quit();
    }

${tests}
}`,
      testCase: (name, steps) => `    [Test]
    public void Test${this.toPascalCase(name)}()
    {
${steps}
    }`,
      actions: {
        navigate: (url) => `        driver.Navigate().GoToUrl("${url}");`,
        click: (selector) => `        driver.FindElement(By.CssSelector("${selector}")).Click();`,
        fill: (selector, value) => `        driver.FindElement(By.CssSelector("${selector}")).SendKeys("${value}");`,
        select: (selector, value) => `        var select = new SelectElement(driver.FindElement(By.CssSelector("${selector}")));
        select.SelectByValue("${value}");`,
        wait: (selector) => `        wait.Until(ExpectedConditions.ElementIsVisible(By.CssSelector("${selector}")));`,
        assertion: (selector, property, value) => `        var element = driver.FindElement(By.CssSelector("${selector}"));
        ${this.getCSharpSeleniumAssertion(property, value)}`
      }
    });
  }

  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  hasTemplate(templateId) {
    return this.templates.has(templateId);
  }

  getAllTemplates() {
    return Array.from(this.templates.entries()).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  getTemplatesByLanguage(language) {
    return this.getAllTemplates().filter(template => template.language === language);
  }

  getTemplatesByFramework(framework) {
    return this.getAllTemplates().filter(template => template.framework === framework);
  }

  generateCode(templateId, testData) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const { testSuite, actions } = testData;
    let code = template.imports + '\n';

    const testCases = testSuite.tests.map(test => {
      const steps = test.steps.map(step => {
        const actionTemplate = template.actions[step.action];
        if (!actionTemplate) {
          return `    // Unsupported action: ${step.action}`;
        }
        return actionTemplate(step.selector, step.value, step.options);
      }).join('\n');

      return template.testCase(test.name, steps);
    }).join('\n\n');

    code += template.testSuite(testSuite.name, testCases);
    return code;
  }

  addCustomTemplate(id, template) {
    this.templates.set(id, template);
  }

  removeTemplate(id) {
    return this.templates.delete(id);
  }

  // Helper methods for naming conventions
  toPascalCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  toSnakeCase(str) {
    return str.replace(/\W+/g, ' ')
      .split(/ |\s/)
      .map(word => word.toLowerCase())
      .join('_');
  }

  // Assertion helpers
  getPlaywrightAssertion(property, value) {
    switch (property) {
      case 'text': return `toHaveText('${value}')`;
      case 'value': return `toHaveValue('${value}')`;
      case 'visible': return 'toBeVisible()';
      case 'hidden': return 'toBeHidden()';
      case 'enabled': return 'toBeEnabled()';
      case 'disabled': return 'toBeDisabled()';
      default: return `toHaveAttribute('${property}', '${value}')`;
    }
  }

  getCypressAssertion(property, value) {
    switch (property) {
      case 'text': return `contain.text', '${value}'`;
      case 'value': return `have.value', '${value}'`;
      case 'visible': return 'be.visible';
      case 'hidden': return 'not.be.visible';
      case 'enabled': return 'not.be.disabled';
      case 'disabled': return 'be.disabled';
      default: return `have.attr', '${property}', '${value}'`;
    }
  }

  getSeleniumAssertion(property, value) {
    switch (property) {
      case 'text': return `assert.strictEqual(await element.getText(), '${value}');`;
      case 'value': return `assert.strictEqual(await element.getAttribute('value'), '${value}');`;
      case 'visible': return 'assert.ok(await element.isDisplayed());';
      case 'enabled': return 'assert.ok(await element.isEnabled());';
      default: return `assert.strictEqual(await element.getAttribute('${property}'), '${value}');`;
    }
  }

  getPythonPlaywrightAssertion(property, value) {
    switch (property) {
      case 'text': return `to_have_text('${value}')`;
      case 'value': return `to_have_value('${value}')`;
      case 'visible': return 'to_be_visible()';
      case 'hidden': return 'to_be_hidden()';
      case 'enabled': return 'to_be_enabled()';
      case 'disabled': return 'to_be_disabled()';
      default: return `to_have_attribute('${property}', '${value}')`;
    }
  }

  getPythonSeleniumAssertion(property, value) {
    switch (property) {
      case 'text': return `self.assertEqual(element.text, '${value}')`;
      case 'value': return `self.assertEqual(element.get_attribute('value'), '${value}')`;
      case 'visible': return 'self.assertTrue(element.is_displayed())';
      case 'enabled': return 'self.assertTrue(element.is_enabled())';
      default: return `self.assertEqual(element.get_attribute('${property}'), '${value}')`;
    }
  }

  getJavaSeleniumAssertion(property, value) {
    switch (property) {
      case 'text': return `assertEquals("${value}", element.getText());`;
      case 'value': return `assertEquals("${value}", element.getAttribute("value"));`;
      case 'visible': return 'assertTrue(element.isDisplayed());';
      case 'enabled': return 'assertTrue(element.isEnabled());';
      default: return `assertEquals("${value}", element.getAttribute("${property}"));`;
    }
  }

  getCSharpSeleniumAssertion(property, value) {
    switch (property) {
      case 'text': return `Assert.AreEqual("${value}", element.Text);`;
      case 'value': return `Assert.AreEqual("${value}", element.GetAttribute("value"));`;
      case 'visible': return 'Assert.IsTrue(element.Displayed);';
      case 'enabled': return 'Assert.IsTrue(element.Enabled);';
      default: return `Assert.AreEqual("${value}", element.GetAttribute("${property}"));`;
    }
  }
}

export default TemplateEngine;