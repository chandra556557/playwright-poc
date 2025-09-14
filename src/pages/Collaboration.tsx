import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  Share2,
  MessageSquare,
  MessageCircle,
  GitBranch,
  UserPlus,
  Clock,
  Eye,
  Edit,
  Trash2,
  Star,
  Filter,
  Search,
  Plus,
  Settings,
  Bell,
  CheckCircle,
  AlertCircle,
  Calendar,
  Tag,
  Download,
  Upload,
  Mail
} from 'lucide-react';
import ShareTestModal from '../components/ShareTestModal';
import InviteTeamMemberModal from '../components/InviteTeamMemberModal';
import CommentSystem from '../components/CommentSystem';

// Mock data for demonstration
const mockTeamMembers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Test Lead',
    avatar: null,
    status: 'online',
    lastActive: '2024-01-15T10:30:00Z',
    testsOwned: 12,
    testsShared: 8
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    role: 'QA Engineer',
    avatar: null,
    status: 'away',
    lastActive: '2024-01-15T09:15:00Z',
    testsOwned: 15,
    testsShared: 5
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.chen@company.com',
    role: 'Developer',
    avatar: null,
    status: 'offline',
    lastActive: '2024-01-14T16:45:00Z',
    testsOwned: 7,
    testsShared: 12
  }
];

const mockSharedTests = [
  {
    id: '1',
    name: 'E-commerce Checkout Flow',
    description: 'Complete checkout process with payment validation',
    owner: 'John Doe',
    sharedWith: ['sarah.wilson@company.com', 'mike.chen@company.com'],
    permissions: 'edit',
    lastModified: '2024-01-15T10:30:00Z',
    version: '1.2.3',
    comments: 3,
    status: 'active',
    tags: ['e-commerce', 'critical', 'payment']
  },
  {
    id: '2',
    name: 'User Authentication Tests',
    description: 'Login, logout, and password reset functionality',
    owner: 'Sarah Wilson',
    sharedWith: ['john.doe@company.com'],
    permissions: 'view',
    lastModified: '2024-01-14T15:20:00Z',
    version: '2.1.0',
    comments: 7,
    status: 'active',
    tags: ['auth', 'security']
  },
  {
    id: '3',
    name: 'API Integration Suite',
    description: 'Backend API endpoints testing',
    owner: 'Mike Chen',
    sharedWith: ['john.doe@company.com', 'sarah.wilson@company.com'],
    permissions: 'edit',
    lastModified: '2024-01-13T11:45:00Z',
    version: '1.0.5',
    comments: 2,
    status: 'draft',
    tags: ['api', 'backend']
  }
];

const mockComments = [
  {
    id: '1',
    testId: '1',
    author: 'Sarah Wilson',
    content: 'The payment validation step needs to handle edge cases for international cards.',
    timestamp: '2024-01-15T09:30:00Z',
    replies: [
      {
        id: '1-1',
        author: 'John Doe',
        content: 'Good point! I\'ll add test cases for different card types.',
        timestamp: '2024-01-15T10:15:00Z'
      }
    ]
  },
  {
    id: '2',
    testId: '1',
    author: 'Mike Chen',
    content: 'Should we also test the timeout scenarios for payment processing?',
    timestamp: '2024-01-15T08:45:00Z',
    replies: []
  }
];

const mockVersionHistory = [
  {
    id: '1',
    version: '1.2.3',
    author: 'John Doe',
    timestamp: '2024-01-15T10:30:00Z',
    changes: 'Added payment validation steps',
    status: 'current'
  },
  {
    id: '2',
    version: '1.2.2',
    author: 'Sarah Wilson',
    timestamp: '2024-01-14T16:20:00Z',
    changes: 'Fixed selector for checkout button',
    status: 'previous'
  },
  {
    id: '3',
    version: '1.2.1',
    author: 'John Doe',
    timestamp: '2024-01-13T14:10:00Z',
    changes: 'Initial checkout flow implementation',
    status: 'previous'
  }
];

export default function Collaboration() {
  const [activeTab, setActiveTab] = useState<'shared' | 'team' | 'comments' | 'versions'>('shared');
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);

  const handleShareTest = (testId: string) => {
    setSelectedTest(testId);
    setShowShareModal(true);
  };

  const handleInviteTeamMember = () => {
    setShowInviteModal(true);
  };

  const handleAddComment = (testId: string, content: string) => {
    toast.success('Comment added successfully');
  };

  const handleVersionRestore = (versionId: string) => {
    toast.success('Version restored successfully');
  };

  const tabs = [
    { id: 'shared', name: 'Shared Tests', icon: Share2 },
    { id: 'team', name: 'Team Members', icon: Users },
    { id: 'comments', name: 'Comments', icon: MessageSquare },
    { id: 'versions', name: 'Version History', icon: GitBranch }
  ];

  const filteredTests = mockSharedTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || test.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Team Collaboration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Share tests, collaborate with team members, and track changes</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </button>
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Test
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Filter */}
      {(activeTab === 'shared' || activeTab === 'comments') && (
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'shared' ? 'tests' : 'comments'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {activeTab === 'shared' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'shared' && (
        <div className="grid gap-6">
          {filteredTests.map((test) => (
            <div key={test.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{test.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      test.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      test.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{test.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Owner: {test.owner}</span>
                    <span>Version: {test.version}</span>
                    <span>Modified: {new Date(test.lastModified).toLocaleDateString()}</span>
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {test.comments}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    {test.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowComments(showComments === test.id ? null : test.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Comments"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShareTest(test.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="View">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Shared with {test.sharedWith.length} member{test.sharedWith.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-sm font-medium ${
                      test.permissions === 'edit' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {test.permissions} access
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {test.sharedWith.slice(0, 3).map((email, index) => (
                      <div
                        key={email}
                        className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800"
                        title={email}
                      >
                        {email.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {test.sharedWith.length > 3 && (
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 border-2 border-white dark:border-gray-800">
                        +{test.sharedWith.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Comments Section */}
              {showComments === test.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <CommentSystem testId={test.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid gap-6">
          {mockTeamMembers.map((member) => (
            <div key={member.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                      member.status === 'online' ? 'bg-green-500' :
                      member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{member.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{member.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{member.testsOwned} owned</span>
                    <span>{member.testsShared} shared</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Last active: {new Date(member.lastActive).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-6">
          {mockComments.map((comment) => (
            <div key={comment.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  {comment.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{comment.author}</h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{comment.content}</p>
                  {comment.replies.length > 0 && (
                    <div className="space-y-3 ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                            {reply.author.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{reply.author}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(reply.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mt-2">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="space-y-4">
          {mockVersionHistory.map((version) => (
            <div key={version.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    version.status === 'current' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Version {version.version}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{version.changes}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>By {version.author}</span>
                      <span>{new Date(version.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {version.status !== 'current' && (
                  <button
                    onClick={() => handleVersionRestore(version.id)}
                    className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modals */}
      <ShareTestModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
      <InviteTeamMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  );
}