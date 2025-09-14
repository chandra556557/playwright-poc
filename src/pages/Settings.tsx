import React from 'react';
import { Settings as SettingsIcon, Globe, Database, Bell, Shield } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your Playwright testing environment</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Panel</h3>
        <p className="text-gray-500 mb-6">
          Configuration options for browsers, environments, notifications, 
          and security settings will be available here.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 bg-gray-50 rounded-lg">
            <Globe className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Browser Settings</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <Database className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Environment Config</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <Bell className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Notifications</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <Shield className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Security</p>
          </div>
        </div>
      </div>
    </div>
  );
}