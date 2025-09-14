import React, { useState } from 'react';
import { X, Mail, UserPlus, Shield, Users, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface InviteTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roles = [
  {
    id: 'test-lead',
    name: 'Test Lead',
    description: 'Full access to all tests and team management',
    permissions: ['Create tests', 'Edit all tests', 'Manage team', 'View analytics']
  },
  {
    id: 'qa-engineer',
    name: 'QA Engineer',
    description: 'Can create and edit tests, view analytics',
    permissions: ['Create tests', 'Edit own tests', 'View shared tests', 'View analytics']
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Can view and comment on tests',
    permissions: ['View shared tests', 'Add comments', 'View test results']
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to shared tests',
    permissions: ['View shared tests', 'View test results']
  }
];

export default function InviteTeamMemberModal({ isOpen, onClose }: InviteTeamMemberModalProps) {
  const [emails, setEmails] = useState('');
  const [selectedRole, setSelectedRole] = useState('qa-engineer');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async () => {
    const emailList = emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emailList.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast.success(`Invitation${emailList.length > 1 ? 's' : ''} sent to ${emailList.length} member${emailList.length > 1 ? 's' : ''}`);
      setIsLoading(false);
      onClose();
      // Reset form
      setEmails('');
      setSelectedRole('qa-engineer');
      setMessage('');
    }, 1500);
  };

  const selectedRoleData = roles.find(role => role.id === selectedRole);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Invite Team Members</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add new members to your testing team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Addresses *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="Enter email addresses separated by commas&#10;e.g., john@company.com, sarah@company.com"
                rows={3}
                className="pl-10 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple email addresses with commas
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Role *
            </label>
            <div className="grid gap-3">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={selectedRole === role.id}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Shield className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{role.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{role.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Selected Role Summary */}
          {selectedRoleData && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Selected Role: {selectedRoleData.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedRoleData.description}</p>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Permissions:</strong> {selectedRoleData.permissions.join(', ')}
              </div>
            </div>
          )}

          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to include with the invitation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Invitation Preview</span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              New members will receive an email invitation to join your testing team as <strong>{selectedRoleData?.name}</strong>.
              They'll be able to access shared tests and collaborate based on their role permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={isLoading}
            className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitations
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}