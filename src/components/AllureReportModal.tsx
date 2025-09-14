import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface AllureReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionId: string;
  executionName?: string;
}

interface ReportStatus {
  exists: boolean;
  generated: boolean;
  lastModified?: string;
  reportPath?: string;
}

export default function AllureReportModal({ 
  isOpen, 
  onClose, 
  executionId, 
  executionName 
}: AllureReportModalProps) {
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && executionId) {
      checkReportStatus();
    }
  }, [isOpen, executionId]);

  const checkReportStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/allure/status/${executionId}`);
      const data = await response.json();
      
      if (response.ok) {
        setReportStatus(data);
      } else {
        setError(data.error || 'Failed to check report status');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/allure/generate/${executionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await checkReportStatus(); // Refresh status
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const openInNewTab = () => {
    if (reportStatus?.reportPath) {
      window.open(reportStatus.reportPath, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Allure Report
            </h2>
            <p className="text-sm text-gray-600">
              {executionName || `Execution ${executionId}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {reportStatus?.exists && (
              <button
                onClick={openInNewTab}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </button>
            )}
            
            <button
              onClick={checkReportStatus}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                <p className="text-gray-600">Checking report status...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={checkReportStatus}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </button>
              </div>
            </div>
          ) : reportStatus?.exists ? (
            <div className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">
                    Report generated on {new Date(reportStatus.lastModified!).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <iframe
                src={reportStatus.reportPath}
                className="w-full h-full border border-gray-300 rounded-lg"
                title="Allure Report"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Allure Report Available
                </h3>
                <p className="text-gray-600 mb-6">
                  Generate an Allure report for this execution to view detailed test results.
                </p>
                <button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    'Generate Allure Report'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}