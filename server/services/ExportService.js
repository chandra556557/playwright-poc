import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

class ExportService {
  constructor() {
    this.exportFormats = {
      'single-file': this.exportSingleFile.bind(this),
      'project-structure': this.exportProjectStructure.bind(this),
      'zip-archive': this.exportZipArchive.bind(this),
      'json-data': this.exportJsonData.bind(this),
      'csv-report': this.exportCsvReport.bind(this)
    };
    
    this.projectTemplates = {
      'javascript-playwright': {
        packageJson: {
          name: 'generated-tests',
          version: '1.0.0',
          scripts: {
            test: 'playwright test',
            'test:headed': 'playwright test --headed',
            'test:debug': 'playwright test --debug'
          },
          devDependencies: {
            '@playwright/test': '^1.40.0'
          }
        },
        configFile: 'playwright.config.js',
        configContent: `module.exports = {
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
};`
      },
      'python-selenium': {
        requirementsTxt: 'selenium==4.15.0\npytest==7.4.3\npytest-html==4.1.1',
        configFile: 'pytest.ini',
        configContent: `[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --html=reports/report.html --self-contained-html`
      }
    };
  }

  async exportCode(testCode, language, format, options = {}) {
    try {
      const exportFunction = this.exportFormats[format];
      if (!exportFunction) {
        throw new Error(`Unsupported export format: ${format}`);
      }

      return await exportFunction(testCode, language, options);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  async exportSingleFile(testCode, language, options) {
    const fileName = options.fileName || `test.${this.getFileExtension(language)}`;
    const content = this.addFileHeader(testCode, language, options);
    
    return {
      type: 'single-file',
      fileName,
      content,
      mimeType: 'text/plain'
    };
  }

  async exportProjectStructure(testCode, language, options) {
    const projectName = options.projectName || 'generated-test-project';
    const template = this.getProjectTemplate(language);
    
    const files = [];
    
    // Main test file
    const testFileName = `test.${this.getFileExtension(language)}`;
    files.push({
      path: `tests/${testFileName}`,
      content: this.addFileHeader(testCode, language, options)
    });
    
    // Configuration files
    if (template.packageJson) {
      files.push({
        path: 'package.json',
        content: JSON.stringify(template.packageJson, null, 2)
      });
    }
    
    if (template.requirementsTxt) {
      files.push({
        path: 'requirements.txt',
        content: template.requirementsTxt
      });
    }
    
    if (template.configFile && template.configContent) {
      files.push({
        path: template.configFile,
        content: template.configContent
      });
    }
    
    // README file
    files.push({
      path: 'README.md',
      content: this.generateReadme(language, projectName)
    });
    
    // .gitignore
    files.push({
      path: '.gitignore',
      content: this.generateGitignore(language)
    });
    
    return {
      type: 'project-structure',
      projectName,
      files
    };
  }

  async exportZipArchive(testCode, language, options) {
    const projectStructure = await this.exportProjectStructure(testCode, language, options);
    const archiveName = `${projectStructure.projectName}.zip`;
    
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];
      
      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          type: 'zip-archive',
          fileName: archiveName,
          content: buffer,
          mimeType: 'application/zip'
        });
      });
      archive.on('error', reject);
      
      // Add files to archive
      projectStructure.files.forEach(file => {
        archive.append(file.content, { name: file.path });
      });
      
      archive.finalize();
    });
  }

  async exportJsonData(testCode, language, options) {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        language,
        format: 'json-data',
        version: '1.0.0'
      },
      testCode,
      options,
      statistics: {
        linesOfCode: testCode.split('\n').length,
        characters: testCode.length
      }
    };
    
    return {
      type: 'json-data',
      fileName: 'test-export.json',
      content: JSON.stringify(exportData, null, 2),
      mimeType: 'application/json'
    };
  }

  async exportCsvReport(testCode, language, options) {
    const lines = testCode.split('\n');
    const csvData = [
      ['Line Number', 'Code', 'Type', 'Length'],
      ...lines.map((line, index) => [
        index + 1,
        `"${line.replace(/"/g, '""')}"`,
        this.detectLineType(line),
        line.length
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    return {
      type: 'csv-report',
      fileName: 'test-report.csv',
      content: csvContent,
      mimeType: 'text/csv'
    };
  }

  getFileExtension(language) {
    const extensions = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs'
    };
    return extensions[language] || 'txt';
  }

  getProjectTemplate(language) {
    const key = `${language}-playwright`;
    return this.projectTemplates[key] || this.projectTemplates['javascript-playwright'];
  }

  addFileHeader(code, language, options) {
    const timestamp = new Date().toISOString();
    const header = `/**
 * Generated Test Code
 * Language: ${language}
 * Generated at: ${timestamp}
 * ${options.description ? `Description: ${options.description}` : ''}
 */\n\n`;
    
    return header + code;
  }

  generateReadme(language, projectName) {
    return `# ${projectName}

Generated test project using ${language}.

## Installation

${language === 'javascript' || language === 'typescript' ? 
  '```bash\nnpm install\n```' : 
  '```bash\npip install -r requirements.txt\n```'
}

## Running Tests

${language === 'javascript' || language === 'typescript' ? 
  '```bash\nnpm test\n```' : 
  '```bash\npytest\n```'
}

## Generated Files

- \`tests/\` - Test files
- \`reports/\` - Test reports (generated after running tests)

## Notes

This project was automatically generated. You may need to adjust configuration based on your specific requirements.
`;
  }

  generateGitignore(language) {
    const common = `# Dependencies\nnode_modules/\n__pycache__/\n*.pyc\n\n# Reports\nreports/\ntest-results/\n\n# IDE\n.vscode/\n.idea/\n\n# OS\n.DS_Store\nThumbs.db\n`;
    
    if (language === 'javascript' || language === 'typescript') {
      return common + `\n# JavaScript/TypeScript\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.npm\n.yarn-integrity\n`;
    }
    
    if (language === 'python') {
      return common + `\n# Python\n*.egg-info/\ndist/\nbuild/\n.pytest_cache/\n`;
    }
    
    return common;
  }

  detectLineType(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) return 'comment';
    if (trimmed.includes('test(') || trimmed.includes('def test_')) return 'test';
    if (trimmed.includes('expect(') || trimmed.includes('assert')) return 'assertion';
    if (trimmed.includes('click(') || trimmed.includes('.click')) return 'action';
    if (trimmed === '') return 'empty';
    return 'code';
  }

  getSupportedFormats() {
    return Object.keys(this.exportFormats).map(format => ({
      id: format,
      name: this.formatDisplayNames[format] || format,
      description: this.formatDescriptions[format] || ''
    }));
  }

  get formatDisplayNames() {
    return {
      'single-file': 'Single File',
      'project-structure': 'Project Structure',
      'zip-archive': 'ZIP Archive',
      'json-data': 'JSON Data',
      'csv-report': 'CSV Report'
    };
  }

  get formatDescriptions() {
    return {
      'single-file': 'Export as a single test file',
      'project-structure': 'Export as a complete project with configuration',
      'zip-archive': 'Export as a compressed ZIP file',
      'json-data': 'Export test data in JSON format',
      'csv-report': 'Export test analysis as CSV report'
    };
  }
}

export default ExportService;