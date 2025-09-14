import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Globe, 
  MousePointer, 
  Type, 
  Clock, 
  Eye,
  Settings,
  Wand2,
  Upload,
  Code,
  Download,
  X,
  Zap,
  Target,
  Layers,
  Filter,
  CheckSquare,
  Lightbulb,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import TestTemplates from '../components/TestTemplates';
import { TestTemplate } from '../data/testTemplates';

interface TestStep {
  id: string;
  type: 'click' | 'fill' | 'wait' | 'assert' | 'navigate';
  target: string;
  value?: string;
  description: string;
  strategies: Array<{
    name: string;
    locator: string;
    description: string;
    priority: number;
  }>;
}

interface TestCase {
  id: string;
  name: string;
  url: string;
  browser: string;
  steps: TestStep[];
}

interface TestSuiteForm {
  name: string;
  description: string;
  tags: string;
  tests: TestCase[];
}

export default function TestBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionUrl, setInspectionUrl] = useState('');
  const [discoveredElements, setDiscoveredElements] = useState<any[]>([]);
  const [codegenSessions, setCodegenSessions] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [elementFilter, setElementFilter] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TestSuiteForm>({
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      tests: [{
        id: '1',
        name: 'Test Case 1',
        url: 'https://example.com',
        browser: 'chromium',
        steps: []
      }]
    }
  });

  const { fields: testFields, append: appendTest, remove: removeTest } = useFieldArray({
    control,
    name: 'tests'
  });

  const stepTypes = [
    { value: 'navigate', label: 'Navigate', icon: Globe, description: 'Navigate to a URL' },
    { value: 'click', label: 'Click', icon: MousePointer, description: 'Click on an element' },
    { value: 'fill', label: 'Fill', icon: Type, description: 'Fill an input field' },
    { value: 'wait', label: 'Wait', icon: Clock, description: 'Wait for an element or condition' },
    { value: 'assert', label: 'Assert', icon: Eye, description: 'Verify element or content' },
  ];

  const browsers = [
    { value: 'chromium', label: 'Chromium' },
    { value: 'firefox', label: 'Firefox' },
    { value: 'webkit', label: 'WebKit (Safari)' },
  ];

  // Load available codegen sessions
  useEffect(() => {
    const loadCodegenSessions = async () => {
      try {
        const response = await fetch('/api/codegen/sessions');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            setCodegenSessions(data.data.sessions || []);
          }
        }
      } catch (error) {
        console.error('Failed to load codegen sessions:', error);
      }
    };
    
    loadCodegenSessions();
  }, []);

  // Handle template selection
  const handleSelectTemplate = (template: TestTemplate) => {
    const templateSteps: TestStep[] = template.steps.map((step, index) => ({
      id: `step-${Date.now()}-${index}`,
      type: step.action as 'click' | 'fill' | 'wait' | 'assert' | 'navigate',
      target: step.selector || step.value || '',
      value: step.value,
      description: step.description,
      strategies: [{
        name: 'selector',
        locator: step.selector || step.value || '',
        description: step.description,
        priority: 10
      }]
    }));

    const newTest: TestCase = {
      id: Date.now().toString(),
      name: template.name,
      url: template.steps.find(s => s.action === 'navigate')?.value || 'https://example.com',
      browser: 'chromium',
      steps: templateSteps
    };

    appendTest(newTest);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" added successfully!`);
  };

  // Import generated code from codegen session
  const handleImportFromCodegen = async () => {
    if (!selectedSession) {
      toast.error('Please select a codegen session');
      return;
    }

    setIsImporting(true);
    try {
      // Get generated code from session
      const codeResponse = await fetch(`/api/codegen/code/${selectedSession}`);
      if (!codeResponse.ok) throw new Error('Failed to get generated code');
      
      const codeData = await codeResponse.json();
      const code = codeData.data.code;
      setGeneratedCode(code);

      // Parse the generated code to extract test steps
      const testSteps = parseGeneratedCodeToSteps(code);
      
      // Create a new test case with the imported steps
      const newTest = {
        id: Date.now().toString(),
        name: `Imported Test - ${selectedSession.slice(0, 8)}`,
        url: extractUrlFromCode(code) || 'https://example.com',
        browser: 'chromium',
        steps: testSteps
      };

      // Add the new test to the form
      appendTest(newTest);
      
      toast.success('Code imported successfully!');
      setShowImportModal(false);
      setSelectedSession('');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import generated code');
    } finally {
      setIsImporting(false);
    }
  };

  // Parse generated Playwright code to extract test steps
  const parseGeneratedCodeToSteps = (code: string): TestStep[] => {
    const steps: TestStep[] = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Parse navigation
      if (trimmedLine.includes('.goto(')) {
        const urlMatch = trimmedLine.match(/\.goto\(['"]([^'"]+)['"]/); 
        if (urlMatch) {
          steps.push({
            id: `step-${index}`,
            type: 'navigate',
            target: urlMatch[1],
            description: `Navigate to ${urlMatch[1]}`,
            strategies: [{
              name: 'url',
              locator: urlMatch[1],
              description: `Navigate to ${urlMatch[1]}`,
              priority: 10
            }]
          });
        }
      }
      
      // Parse clicks
      if (trimmedLine.includes('.click(')) {
        const selectorMatch = trimmedLine.match(/\.click\(['"]((?:[^'"\\]|\\.)*)['"]/); 
        if (selectorMatch) {
          steps.push({
            id: `step-${index}`,
            type: 'click',
            target: selectorMatch[1],
            description: `Click ${selectorMatch[1]}`,
            strategies: [{
              name: 'selector',
              locator: selectorMatch[1],
              description: `Click element with selector ${selectorMatch[1]}`,
              priority: 8
            }]
          });
        }
      }
      
      // Parse fills
      if (trimmedLine.includes('.fill(')) {
        const fillMatch = trimmedLine.match(/\.fill\(['"]((?:[^'"\\]|\\.)*)['"]\.s*,\s*['"]((?:[^'"\\]|\\.)*)['"]/); 
        if (fillMatch) {
          steps.push({
            id: `step-${index}`,
            type: 'fill',
            target: fillMatch[1],
            value: fillMatch[2],
            description: `Fill ${fillMatch[1]} with "${fillMatch[2]}"`,
            strategies: [{
              name: 'selector',
              locator: fillMatch[1],
              description: `Fill input with selector ${fillMatch[1]}`,
              priority: 8
            }]
          });
        }
      }
      
      // Parse assertions
      if (trimmedLine.includes('expect(') && trimmedLine.includes('.toBeVisible()')) {
        const expectMatch = trimmedLine.match(/expect\([^)]*\.locator\(['"]((?:[^'"\\]|\\.)*)['"]/); 
        if (expectMatch) {
          steps.push({
            id: `step-${index}`,
            type: 'assert',
            target: expectMatch[1],
            description: `Assert ${expectMatch[1]} is visible`,
            strategies: [{
              name: 'selector',
              locator: expectMatch[1],
              description: `Assert element with selector ${expectMatch[1]} is visible`,
              priority: 7
            }]
          });
        }
      }
    });
    
    return steps;
  };

  // Extract URL from generated code
  const extractUrlFromCode = (code: string): string | null => {
    const urlMatch = code.match(/\.goto\(['"]([^'"]+)['"]/); 
    return urlMatch ? urlMatch[1] : null;
  };

  // Handle test execution
  const handleRunTestPreview = async () => {
    try {
      setIsRunningTest(true);
      
      // Get current form data
      const formData = watch();
      
      // Validate test suite name
      if (!formData.name || !formData.name.trim()) {
        toast.error('Please enter a test suite name');
        return;
      }
      
      // Validate that we have at least one test with steps
      if (!formData.tests || formData.tests.length === 0) {
        toast.error('Please add at least one test case');
        return;
      }
      
      const hasSteps = formData.tests.some(test => test.steps && test.steps.length > 0);
      if (!hasSteps) {
        toast.error('Please add at least one test step to run the preview. Use the "Add Step" button to create test steps.');
        return;
      }
      
      // Validate test case names and URLs
      const invalidTests = formData.tests.filter(test => !test.name.trim() || !test.url.trim());
      if (invalidTests.length > 0) {
        toast.error('Please ensure all test cases have a name and URL');
        return;
      }
      
      // First, save the test suite
      const testSuiteData = {
        ...formData,
        id: id || `suite-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save test suite
      const saveResponse = await fetch('/api/test-suites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testSuiteData),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save test suite');
      }
      
      const savedSuite = await saveResponse.json();
      const suiteId = savedSuite.id || testSuiteData.id;
      
      // Now run the test
      const runResponse = await fetch(`/api/test-suites/${suiteId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!runResponse.ok) {
        throw new Error('Failed to start test execution');
      }
      
      const result = await runResponse.json();
      console.log('Test execution started:', result);
      toast.success('Test execution started successfully!');
      
      // Navigate to test suites page to see execution results
      setTimeout(() => {
        navigate('/test-suites');
      }, 1500);
      
    } catch (error) {
      console.error('Error running test preview:', error);
      toast.error('Failed to run test preview');
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleInspectPage = async () => {
    if (!inspectionUrl) {
      toast.error('Please enter a URL to inspect');
      return;
    }

    setIsInspecting(true);
    try {
      const response = await fetch('/api/discover-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: inspectionUrl,
          browser: 'chromium',
          context: { 
            viewport: { width: 1920, height: 1080 },
            enableVisualHighlighting: true,
            enableSmartSuggestions: true,
            batchMode: batchMode
          }
        })
      });

      if (!response.ok) throw new Error('Failed to inspect page');
      
      const data = await response.json();
      setDiscoveredElements(data.elements || data);
      
      // Set smart suggestions if available
      if (data.suggestions) {
        setSmartSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
      
      // Set highlighted elements for visual feedback
      if (data.highlightedElements) {
        setHighlightedElements(data.highlightedElements);
      }
      
      toast.success(`Page inspected successfully! Found ${Object.values(data.elements || data).flat().length} elements`);
    } catch (error) {
      toast.error('Failed to inspect page');
      console.error(error);
    } finally {
      setIsInspecting(false);
    }
  };

  const addStepFromElement = (testIndex: number, element: any, actionType: string) => {
    const currentTest = watch(`tests.${testIndex}`);
    const newStep: TestStep = {
      id: Date.now().toString(),
      type: actionType as any,
      target: element.name,
      description: `${actionType} ${element.description}`,
      strategies: [{
        name: element.name,
        locator: element.locator,
        description: element.description,
        priority: element.priority || 5
      }]
    };

    const updatedSteps = [...(currentTest.steps || []), newStep];
    setValue(`tests.${testIndex}.steps`, updatedSteps);
    toast.success(`Added ${actionType} step for ${element.name}`);
  };

  const handleAddStepManually = (testIndex: number) => {
    const currentTest = watch(`tests.${testIndex}`);
    const newStep: TestStep = {
      id: Date.now().toString(),
      type: 'click',
      target: '',
      value: '',
      description: 'New step',
      strategies: [{
        name: 'manual-step',
        locator: '',
        description: 'Manually added step',
        priority: 5
      }]
    };

    const updatedSteps = [...(currentTest.steps || []), newStep];
    setValue(`tests.${testIndex}.steps`, updatedSteps);
    setEditingStep(newStep.id);
    toast.success('Added new step manually');
  };

  const handleDeleteStep = (testIndex: number, stepIndex: number) => {
    const currentTest = watch(`tests.${testIndex}`);
    const updatedSteps = currentTest.steps.filter((_, index) => index !== stepIndex);
    setValue(`tests.${testIndex}.steps`, updatedSteps);
    toast.success('Step deleted');
  };

  const handleUpdateStep = (testIndex: number, stepIndex: number, field: string, value: string) => {
    const currentTest = watch(`tests.${testIndex}`);
    const updatedSteps = [...currentTest.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      [field]: value
    };
    setValue(`tests.${testIndex}.steps`, updatedSteps);
  };

  // Batch element selection functions
  const toggleElementSelection = (elementId: string) => {
    setSelectedElements(prev => 
      prev.includes(elementId) 
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId]
    );
  };

  const selectAllElements = () => {
    const allElementIds = Object.values(discoveredElements)
      .flat()
      .map((element: any) => element.id || element.name);
    setSelectedElements(allElementIds);
  };

  const clearSelection = () => {
    setSelectedElements([]);
  };

  const addBatchSteps = (testIndex: number, actionType: string) => {
    const currentTest = watch(`tests.${testIndex}`);
    const selectedElementsData = Object.values(discoveredElements)
      .flat()
      .filter((element: any) => selectedElements.includes(element.id || element.name));

    const newSteps = selectedElementsData.map((element: any) => ({
      id: `${Date.now()}-${Math.random()}`,
      type: actionType as any,
      target: element.name,
      description: `${actionType} ${element.description}`,
      strategies: [{
        name: element.name,
        locator: element.locator,
        description: element.description,
        priority: element.priority || 5
      }]
    }));

    const updatedSteps = [...(currentTest.steps || []), ...newSteps];
    setValue(`tests.${testIndex}.steps`, updatedSteps);
    toast.success(`Added ${newSteps.length} ${actionType} steps`);
    clearSelection();
  };

  // Filter elements based on type
  const getFilteredElements = () => {
    if (elementFilter === 'all') return discoveredElements;
    
    const filtered: any = {};
    Object.entries(discoveredElements).forEach(([category, elements]: [string, any]) => {
      if (elementFilter === 'interactive') {
        filtered[category] = elements.filter((el: any) => 
          ['button', 'input', 'link', 'select'].includes(category.toLowerCase())
        );
      } else if (elementFilter === category.toLowerCase()) {
        filtered[category] = elements;
      }
    });
    
    return filtered;
  };

  // Apply smart suggestion
  const applySuggestion = (suggestion: any) => {
    if (suggestion.type === 'workflow') {
      const steps = suggestion.steps.map((step: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        type: step.action,
        target: step.element,
        description: step.description,
        value: step.value,
        strategies: [{
          name: step.element,
          locator: step.locator,
          description: step.description,
          priority: 8
        }]
      }));
      
      const currentTest = watch('tests.0');
      const updatedSteps = [...(currentTest.steps || []), ...steps];
      setValue('tests.0.steps', updatedSteps);
      toast.success(`Applied workflow: ${suggestion.name}`);
    }
  };

  const onSubmit = async (data: TestSuiteForm) => {
    try {
      const testSuite = {
        ...data,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        tests: data.tests.map(test => ({
          ...test,
          steps: test.steps || []
        }))
      };

      const response = await fetch('/api/test-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSuite)
      });

      if (!response.ok) throw new Error('Failed to save test suite');

      toast.success('Test suite saved successfully!');
      navigate('/test-suites');
    } catch (error) {
      toast.error('Failed to save test suite');
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {id ? 'Edit Test Suite' : 'Create Test Suite'}
          </h1>
          <p className="text-gray-600 mt-1">Build intelligent, self-healing test suites with AI assistance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Suite
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Suite Name
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., E-commerce User Journey"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Describe what this test suite covers..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  {...register('tags')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., critical, e-commerce, user-journey"
                />
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test Cases</h2>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="inline-flex items-center px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Use Template
                </button>
                <button
                  type="button"
                  onClick={() => appendTest({
                    id: Date.now().toString(),
                    name: `Test Case ${testFields.length + 1}`,
                    url: 'https://example.com',
                    browser: 'chromium',
                    steps: []
                  })}
                  className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Test Case
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {testFields.map((test, testIndex) => (
                <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900">Test Case {testIndex + 1}</h3>
                    {testFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTest(testIndex)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Test Name
                      </label>
                      <input
                        {...register(`tests.${testIndex}.name` as const)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Browser
                      </label>
                      <select
                        {...register(`tests.${testIndex}.browser` as const)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {browsers.map(browser => (
                          <option key={browser.value} value={browser.value}>
                            {browser.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starting URL
                    </label>
                    <input
                      {...register(`tests.${testIndex}.url` as const)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  {/* Test Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Test Steps
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddStepManually(testIndex)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Add Step Manually
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {watch(`tests.${testIndex}.steps`)?.map((step, stepIndex) => (
                        <div key={step.id} className={`p-3 rounded-lg border ${
                          editingStep === step.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                                {stepIndex + 1}
                              </div>
                            </div>
                            
                            {editingStep === step.id ? (
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
                                    <select
                                      value={step.type}
                                      onChange={(e) => handleUpdateStep(testIndex, stepIndex, 'type', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                      <option value="click">Click</option>
                                      <option value="fill">Fill</option>
                                      <option value="wait">Wait</option>
                                      <option value="assert">Assert</option>
                                      <option value="navigate">Navigate</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Target Selector</label>
                                    <input
                                      type="text"
                                      value={step.target}
                                      onChange={(e) => handleUpdateStep(testIndex, stepIndex, 'target', e.target.value)}
                                      placeholder="CSS selector or element identifier"
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Value (if needed)</label>
                                    <input
                                      type="text"
                                      value={step.value || ''}
                                      onChange={(e) => handleUpdateStep(testIndex, stepIndex, 'value', e.target.value)}
                                      placeholder="Text to fill or wait time"
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                    <input
                                      type="text"
                                      value={step.description}
                                      onChange={(e) => handleUpdateStep(testIndex, stepIndex, 'description', e.target.value)}
                                      placeholder="Step description"
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingStep(null)}
                                    className="px-3 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{step.description}</p>
                                <p className="text-xs text-gray-500">{step.type} • {step.target}</p>
                                {step.value && <p className="text-xs text-gray-400">Value: {step.value}</p>}
                              </div>
                            )}
                            
                            <div className="flex space-x-1">
                              {editingStep !== step.id && (
                                <button
                                  type="button"
                                  onClick={() => setEditingStep(step.id)}
                                  className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                                  title="Edit step"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteStep(testIndex, stepIndex)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete step"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-500">
                          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No steps added yet. Use the element inspector to add steps automatically.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Element Inspector Sidebar */}
        <div className="space-y-6">
          {/* Page Inspector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Wand2 className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">AI Element Inspector</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page URL to Inspect
                </label>
                <input
                  value={inspectionUrl}
                  onChange={(e) => setInspectionUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              
              <button
                onClick={handleInspectPage}
                disabled={isInspecting}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isInspecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Inspecting...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Inspect Page
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Discovered Elements */}
          {Object.keys(discoveredElements).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Discovered Elements</h3>
              
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {Object.entries(discoveredElements).map(([category, elements]: [string, any]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                      {category} ({elements.length})
                    </h4>
                    <div className="space-y-2">
                      {elements.slice(0, 5).map((element: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{element.name}</p>
                              <p className="text-xs text-gray-500 truncate">{element.description}</p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {element.priority}/10
                            </span>
                          </div>
                          
                          <div className="flex space-x-1">
                            {stepTypes.slice(1, 4).map((stepType) => (
                              <button
                                key={stepType.value}
                                onClick={() => addStepFromElement(0, element, stepType.value)}
                                className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                              >
                                {stepType.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="w-full flex items-center px-3 py-2 text-left text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4 mr-3 text-blue-600" />
                Import from Codegen
              </button>
              
              <button 
                onClick={handleRunTestPreview}
                disabled={isRunningTest}
                className="w-full flex items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningTest ? (
                  <>
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full mr-3"></div>
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-3 text-green-600" />
                    Run Test Preview
                  </>
                )}
              </button>
              
              <button className="w-full flex items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <Settings className="w-4 h-4 mr-3 text-gray-600" />
                Configure Healing
              </button>
              
              <button
                type="button"
                onClick={() => setShowCodePreview(true)}
                className="w-full flex items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Code className="w-4 h-4 mr-3 text-blue-600" />
                Preview Generated Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import from Codegen Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Import from Codegen Session</h3>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Codegen Session
                </label>
                <select
                   value={selectedSession}
                   onChange={(e) => setSelectedSession(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="">Choose a session...</option>
                   {codegenSessions.map((session) => (
                     <option key={session.sessionId} value={session.sessionId}>
                       Session {session.sessionId.slice(0, 8)} - {session.language} ({session.actionsCount} actions) - {new Date(session.startTime).toLocaleDateString()}
                     </option>
                   ))}
                 </select>
              </div>
              {codegenSessions.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  No codegen sessions available. Create a recording session first.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedSession('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportFromCodegen}
                disabled={!selectedSession || isImporting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Importing...
                  </>
                ) : (
                  'Import Code'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Preview Modal */}
      {showCodePreview && generatedCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Generated Code Preview</h3>
              <button
                onClick={() => setShowCodePreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCodePreview(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Templates Modal */}
      {showTemplates && (
        <TestTemplates
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}