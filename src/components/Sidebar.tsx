import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TestTube, 
  Plus, 
  Play, 
  Wrench, 
  BarChart3, 
  Settings,
  Bot,
  Video,
  Brain,
  Users,
  FileText
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Test Suites', href: '/test-suites', icon: TestTube },
  { name: 'Test Builder', href: '/test-builder', icon: Plus },
  { name: 'Code Recorder', href: '/codegen', icon: Video },
  { name: 'POM Converter', href: '/pom', icon: FileText },
  { name: 'Executions', href: '/executions', icon: Play },
  { name: 'Healing Center', href: '/healing', icon: Wrench },
  { name: 'AI Healing', href: '/ai-healing', icon: Brain },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Collaboration', href: '/collaboration', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        <div className="ml-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">PlaywrightAI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Self-Healing Tests</p>
        </div>
      </div>
      
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-700 dark:border-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon
                className="mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200"
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}