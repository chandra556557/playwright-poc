import React, { useState } from 'react';
import { MessageCircle, Send, Reply, Heart, MoreVertical, Edit2, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  author: {
    name: string;
    avatar?: string;
    role: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  isEditing?: boolean;
}

interface CommentSystemProps {
  testId: string;
  className?: string;
}

const mockComments: Comment[] = [
  {
    id: '1',
    author: {
      name: 'Sarah Johnson',
      role: 'QA Lead'
    },
    content: 'This test case looks comprehensive. Should we add a validation for the error message format?',
    timestamp: '2024-01-15T10:30:00Z',
    likes: 3,
    isLiked: false,
    replies: [
      {
        id: '1-1',
        author: {
          name: 'Mike Chen',
          role: 'Developer'
        },
        content: 'Good point! I\'ll add that validation in the next iteration.',
        timestamp: '2024-01-15T11:15:00Z',
        likes: 1,
        isLiked: true
      }
    ]
  },
  {
    id: '2',
    author: {
      name: 'Alex Rodriguez',
      role: 'QA Engineer'
    },
    content: 'The login flow test is failing intermittently. It might be a timing issue with the page load.',
    timestamp: '2024-01-15T14:20:00Z',
    likes: 2,
    isLiked: true
  }
];

export default function CommentSystem({ testId, className = '' }: CommentSystemProps) {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const comment: Comment = {
        id: Date.now().toString(),
        author: {
          name: 'You',
          role: 'QA Engineer'
        },
        content: newComment,
        timestamp: new Date().toISOString(),
        likes: 0,
        isLiked: false
      };
      
      setComments([...comments, comment]);
      setNewComment('');
      setIsSubmitting(false);
      toast.success('Comment added successfully');
    }, 500);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const reply: Comment = {
        id: `${parentId}-${Date.now()}`,
        author: {
          name: 'You',
          role: 'QA Engineer'
        },
        content: replyContent,
        timestamp: new Date().toISOString(),
        likes: 0,
        isLiked: false
      };
      
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        }
        return comment;
      }));
      
      setReplyContent('');
      setReplyingTo(null);
      setIsSubmitting(false);
      toast.success('Reply added successfully');
    }, 500);
  };

  const handleLike = (commentId: string, isReply = false, parentId?: string) => {
    if (isReply && parentId) {
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies?.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1,
                  isLiked: !reply.isLiked
                };
              }
              return reply;
            })
          };
        }
        return comment;
      }));
    } else {
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            isLiked: !comment.isLiked
          };
        }
        return comment;
      }));
    }
  };

  const CommentItem = ({ comment, isReply = false, parentId }: { comment: Comment; isReply?: boolean; parentId?: string }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'} bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {comment.author.name}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                {comment.author.role}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(comment.timestamp)}
              </span>
            </div>
            
            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {comment.content}
          </p>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleLike(comment.id, isReply, parentId)}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                comment.isLiked
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />
              <span>{comment.likes}</span>
            </button>
            
            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>
            )}
          </div>
          
          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyContent.trim() || isSubmitting}
                  className="flex items-center px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Reply
                </button>
              </div>
            </div>
          )}
          
          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isReply={true}
                  parentId={comment.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Comments ({comments.length})
        </h3>
      </div>
      
      {/* New Comment Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
        <div className="flex items-center justify-end mt-3">
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}