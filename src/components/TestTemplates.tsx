import React, { useState } from 'react';
import { Search, Filter, Clock, Tag, ChevronRight, Zap } from 'lucide-react';
import { testTemplates, TestTemplate, getTemplateCategories } from '../data/testTemplates';

interface TestTemplatesProps {
  onSelectTemplate: (template: TestTemplate) => void;
  onClose: () => void;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

const categoryColors = {
  'e-commerce': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'authentication': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  'forms': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  'navigation': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  'api': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
};

export default function TestTemplates({ onSelectTemplate, onClose }: TestTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = getTemplateCategories();

  const filteredTemplates = testTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Zap className="w-6 h-6 mr-2 text-yellow-500" />
                Test Templates
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Choose from pre-built test scenarios to get started quickly
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No templates found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer group hover:border-indigo-300 dark:hover:border-indigo-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {template.name}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
                      {template.category}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[template.difficulty]}`}>
                      {template.difficulty}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{template.steps.length} steps</span>
                    </div>
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      <span>{template.tags.length} tags</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}