import React, { useState } from 'react';
import { Upload, FileText, Download } from 'lucide-react';

export default function POMConverter() {
  const [code, setCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [language, setLanguage] = useState<'javascript' | 'typescript'>('javascript');
  const [className, setClassName] = useState<string>('GeneratedPage');
  const [testName, setTestName] = useState<string>('generated-test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setCode(text);
  };

  const doConvert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res = await fetch('/api/pom/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, className, testName })
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        // If parsing fails (likely HTML), retry against backend directly
      }
      if (!res.ok || !data?.success) {
        // Fallback to direct backend URL in dev
        res = await fetch('http://localhost:3001/api/pom/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language, className, testName })
        });
        data = await res.json();
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Conversion failed');
      }
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to convert');
    } finally {
      setLoading(false);
    }
  };

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">POM Converter</h1>
          <p className="text-gray-600 mt-1">Upload a Playwright test or paste code and get a generated Page Object + refactored test.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="GeneratedPage"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="generated-test"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            <span>{fileName || 'Choose file'}</span>
            <input
              type="file"
              accept=".js,.ts,.tsx,.mjs,.cjs,.jsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <button
            onClick={doConvert}
            disabled={loading || !code}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileText className={`w-4 h-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Converting...' : 'Convert to POM'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Or Paste Code</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`import { test, expect } from '@playwright/test';\n\n test('example', async ({ page }) => { /* ... */ });`}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{result.files?.pageObject?.fileName}</h3>
              <button
                onClick={() => download(result.files?.pageObject?.fileName, result.files?.pageObject?.content)}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                <Download className="w-4 h-4 mr-1" /> Download
              </button>
            </div>
            <pre className="bg-gray-50 rounded p-3 overflow-auto text-sm"><code>{result.files?.pageObject?.content}</code></pre>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{result.files?.test?.fileName}</h3>
              <button
                onClick={() => download(result.files?.test?.fileName, result.files?.test?.content)}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                <Download className="w-4 h-4 mr-1" /> Download
              </button>
            </div>
            <pre className="bg-gray-50 rounded p-3 overflow-auto text-sm"><code>{result.files?.test?.content}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}
