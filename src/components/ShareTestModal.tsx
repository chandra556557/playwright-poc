import React, { useState } from 'react';
import { X, Mail, Copy, Check, UserPlus, Shield, Eye, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  testId: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Test Lead'
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    role: 'QA Engineer'
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.chen@company.com',
    role: 'Developer'
  },
  {
    id: '4',
    name: 'Lisa Park',
    email: 'lisa.park@company.com',
    role: 'Product Manager'
  }
];

export default function ShareTestModal({ isOpen, onClose, testName, testId }: ShareTestModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [emailInput, setEmailInput] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleGenerateLink = () => {
    const link = `${window.location.origin}/shared-test/${testId}?token=abc123`;
    setShareLink(link);
  };

  const handleCopyLink = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setLinkCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleShare = () => {
    const selectedMemberEmails = mockTeamMembers
      .filter(member => selectedMembers.includes(member.id))
      .map(member => member.email);
    
    const additionalEmails = emailInput
      .split(',')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    const allEmails = [...selectedMemberEmails, ...additionalEmails];

    if (allEmails.length === 0 && !shareLink) {
      toast.error('Please select team members or generate a share link');
      return;
    }

    // Simulate API call
    setTimeout(() => {
      toast.success(`Test "${testName}" shared successfully with ${allEmails.length} member${allEmails.length !== 1 ? 's' : ''}`);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Share Test</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{testName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Permission Level
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="permission"
                  value="view"
                  checked={permission === 'view'}
                  onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                  className="mr-2"
                />
                <Eye className="w-4 h-4 mr-2 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">View Only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="permission"
                  value="edit"
                  checked={permission === 'edit'}
                  onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                  className="mr-2"
                />
                <Edit className="w-4 h-4 mr-2 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Can Edit</span>
              </label>
            </div>
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Share with Team Members
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              {mockTeamMembers.map((member) => (
                <label key={member.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    className="mr-3"
                  />
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300 mr-3">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{member.email} • {member.role}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invite by Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Enter email addresses separated by commas"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple email addresses with commas
            </p>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share Link
            </label>
            <div className="flex space-x-2">
              <button
                onClick={handleGenerateLink}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Generate Link
              </button>
              {shareLink && (
                <div className="flex-1 flex">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-r-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
            {shareLink && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Anyone with this link can {permission} the test
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to include with the share invitation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Share Test
          </button>
        </div>
      </div>
    </div>
  );
}