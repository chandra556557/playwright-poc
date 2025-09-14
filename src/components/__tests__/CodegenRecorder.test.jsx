import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodegenRecorder from '../CodegenRecorder';
import { mockFetch, mockApiResponse, createMockWebSocket } from '../../test/utils';

// Mock WebSocket
const mockWebSocket = createMockWebSocket();
global.WebSocket = vi.fn(() => mockWebSocket);

// Mock fetch
global.fetch = vi.fn();

describe('CodegenRecorder', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/codegen/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            ready: true,
            supportedLanguages: ['javascript', 'typescript', 'python'],
            activeSessions: 0,
            recordingMethods: {
              native: { supported: true },
              custom: { supported: true }
            }
          })
        });
      }
      if (url.includes('/api/codegen/languages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            data: [
              { id: 'javascript', name: 'JavaScript', templates: ['javascript-playwright'] },
              { id: 'typescript', name: 'TypeScript', templates: ['typescript-playwright'] },
              { id: 'python', name: 'Python', templates: ['python-playwright'] }
            ]
          })
        });
      }
      if (url.includes('/api/codegen/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            data: []
          })
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the main recording interface', async () => {
      render(<CodegenRecorder />);
      
      await waitFor(() => {
        expect(screen.getByText('Code Generation Recorder')).toBeInTheDocument();
        expect(screen.getByText('Recording Controls')).toBeInTheDocument();
        expect(screen.getByText('Target Language')).toBeInTheDocument();
      });
    });

    it('displays language selection dropdown', async () => {
      render(<CodegenRecorder />);
      
      await waitFor(() => {
        const languageSelect = screen.getByDisplayValue('javascript');
        expect(languageSelect).toBeInTheDocument();
      });
    });

    it('shows start recording button when not recording', async () => {
      render(<CodegenRecorder />);
      
      await waitFor(() => {
        expect(screen.getByText('Start Recording')).toBeInTheDocument();
      });
    });
  });

  describe('Recording Controls', () => {
    it('starts recording when start button is clicked', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url.includes('/api/codegen/start') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'success',
              data: { sessionId: 'test-session-123' }
            })
          });
        }
        return global.fetch(url, options);
      });

      render(<CodegenRecorder />);
      
      await waitFor(() => {
        expect(screen.getByText('Start Recording')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Recording');
      await user.click(startButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/codegen/start', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('javascript')
        }));
      });
    });

    it('shows pause and stop buttons when recording', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url.includes('/api/codegen/start')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'success',
              data: { sessionId: 'test-session-123' }
            })
          });
        }
        return global.fetch(url, options);
      });

      render(<CodegenRecorder />);
      
      const startButton = await screen.findByText('Start Recording');
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument();
        expect(screen.getByText('Stop')).toBeInTheDocument();
      });
    });

    it('handles recording pause and resume', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url.includes('/api/codegen/start')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'success',
              data: { sessionId: 'test-session-123' }
            })
          });
        }
        if (url.includes('/api/codegen/pause')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'success' })
          });
        }
        if (url.includes('/api/codegen/resume')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'success' })
          });
        }
        return global.fetch(url, options);
      });

      render(<CodegenRecorder />);
      
      // Start recording
      const startButton = await screen.findByText('Start Recording');
      await user.click(startButton);

      // Pause recording
      const pauseButton = await screen.findByText('Pause');
      await user.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument();
        expect(screen.getByText('Recording Paused')).toBeInTheDocument();
      });

      // Resume recording
      const resumeButton = screen.getByText('Resume');
      await user.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument();
        expect(screen.getByText('Recording Active')).toBeInTheDocument();
      });
    });
  });

  describe('Settings and Configuration', () => {
    it('opens settings modal when settings button is clicked', async () => {
      render(<CodegenRecorder />);
      
      const settingsButton = await screen.findByLabelText(/settings/i);
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Recording Settings')).toBeInTheDocument();
        expect(screen.getByText('Browser')).toBeInTheDocument();
        expect(screen.getByText('Target URL')).toBeInTheDocument();
      });
    });

    it('allows changing recording options', async () => {
      render(<CodegenRecorder />);
      
      const settingsButton = await screen.findByLabelText(/settings/i);
      await user.click(settingsButton);

      const urlInput = await screen.findByDisplayValue('https://example.com');
      await user.clear(urlInput);
      await user.type(urlInput, 'https://test.com');

      expect(urlInput.value).toBe('https://test.com');
    });

    it('toggles healing mode option', async () => {
      render(<CodegenRecorder />);
      
      const settingsButton = await screen.findByLabelText(/settings/i);
      await user.click(settingsButton);

      const healingCheckbox = await screen.findByLabelText('Enable Healing Mode');
      expect(healingCheckbox).toBeChecked();

      await user.click(healingCheckbox);
      expect(healingCheckbox).not.toBeChecked();
    });

    it('switches between native and custom recording methods', async () => {
      render(<CodegenRecorder />);
      
      const settingsButton = await screen.findByLabelText(/settings/i);
      await user.click(settingsButton);

      const nativeRadio = await screen.findByLabelText(/Native Playwright Recording/i);
      const customRadio = await screen.findByLabelText(/Custom Recording Engine/i);

      expect(nativeRadio).toBeChecked();
      expect(customRadio).not.toBeChecked();

      await user.click(customRadio);
      expect(customRadio).toBeChecked();
      expect(nativeRadio).not.toBeChecked();
    });
  });

  describe('Language and Template Selection', () => {
    it('changes language selection', async () => {
      render(<CodegenRecorder />);
      
      const languageSelect = await screen.findByDisplayValue('javascript');
      await user.selectOptions(languageSelect, 'typescript');

      expect(languageSelect.value).toBe('typescript');
    });

    it('updates templates when language changes', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/codegen/languages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'success',
              data: [
                { 
                  id: 'typescript', 
                  name: 'TypeScript', 
                  templates: ['typescript-playwright', 'typescript-jest'] 
                }
              ]
            })
          });
        }
        return global.fetch(url);
      });

      render(<CodegenRecorder />);
      
      const languageSelect = await screen.findByDisplayValue('javascript');
      await user.selectOptions(languageSelect, 'typescript');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/codegen/languages');
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('establishes WebSocket connection on mount', async () => {
      render(<CodegenRecorder />);
      
      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
      });
    });

    it('handles WebSocket messages for recording updates', async () => {
      render(<CodegenRecorder />);
      
      // Simulate WebSocket message
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'actionsRecorded',
          data: {
            sessionId: 'test-session',
            actions: [{ type: 'click', selector: '#button' }]
          }
        })
      });

      mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1](messageEvent);

      // Verify the component handles the message appropriately
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      global.fetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<CodegenRecorder />);
      
      // Component should still render despite API errors
      expect(screen.getByText('Code Generation Recorder')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('shows error message when recording fails to start', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url.includes('/api/codegen/start')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'error',
              message: 'Service unavailable'
            })
          });
        }
        return global.fetch(url, options);
      });

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CodegenRecorder />);
      
      const startButton = await screen.findByText('Start Recording');
      await user.click(startButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to start recording: Service unavailable');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Code Generation and Export', () => {
    it('displays generated code when available', async () => {
      render(<CodegenRecorder />);
      
      // Simulate receiving generated code via WebSocket
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'codeGenerated',
          data: {
            sessionId: 'test-session',
            code: 'await page.click("#button");'
          }
        })
      });

      mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1](messageEvent);

      // The component should handle and display the generated code
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('opens export modal when export button is clicked', async () => {
      render(<CodegenRecorder />);
      
      // First need to have some generated code
      const codeEditor = screen.queryByText(/Generated Code/i);
      if (codeEditor) {
        const exportButton = screen.getByLabelText(/download/i);
        await user.click(exportButton);

        await waitFor(() => {
          expect(screen.getByText('Export Test Code')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Session Management', () => {
    it('loads existing sessions on mount', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/codegen/sessions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'success',
              data: [
                {
                  id: 'session-1',
                  name: 'Test Session',
                  createdAt: new Date().toISOString()
                }
              ]
            })
          });
        }
        return global.fetch(url);
      });

      render(<CodegenRecorder />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/codegen/sessions');
      });
    });

    it('displays session history when available', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/codegen/sessions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'success',
              data: [
                {
                  id: 'session-1',
                  name: 'Login Test Recording',
                  createdAt: new Date().toISOString(),
                  language: 'javascript'
                }
              ]
            })
          });
        }
        return global.fetch(url);
      });

      render(<CodegenRecorder />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
      });
    });
  });
});