import React, { useState } from 'react';
import { Bell, Search, User, Globe, Zap, Moon, Sun, Settings, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const notifications = [
    { id: 1, type: 'success', message: 'Test suite "Login Flow" passed successfully', time: '2 min ago' },
    { id: 2, type: 'warning', message: 'Element healing applied to checkout form', time: '5 min ago' },
    { id: 3, type: 'info', message: 'New AI strategy learned for button detection', time: '10 min ago' },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tests, executions, or healing suggestions..."
              className="pl-10 pr-4 py-2 w-64 md:w-80 lg:w-96 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status Indicators */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 dark:text-gray-300">Playwright Ready</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-600 dark:text-gray-300">Healing Active</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-300">3 Browsers</span>
            </div>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'success' ? 'bg-green-500' :
                          notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-gray-100">{notification.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                  <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Test Engineer</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">admin@company.com</p>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>
            
            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <User className="w-4 h-4 mr-3" />
                    Profile
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}