import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

// Generate Allure report for a specific execution
router.post('/generate/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const { force = false } = req.body;
    
    const allureResultsPath = path.join(process.cwd(), 'allure-results');
    const allureReportPath = path.join(process.cwd(), 'allure-report');
    const executionReportPath = path.join(allureReportPath, executionId);
    
    // Check if report already exists and force is not set
    if (!force) {
      try {
        await fs.access(path.join(executionReportPath, 'index.html'));
        return res.json({ 
          success: true, 
          message: 'Report already exists',
          reportPath: `/api/allure/report/${executionId}`
        });
      } catch (error) {
        // Report doesn't exist, continue with generation
      }
    }
    
    // Check if allure-results directory exists
    try {
      await fs.access(allureResultsPath);
    } catch (error) {
      return res.status(404).json({ 
        success: false, 
        error: 'No Allure results found. Run tests with Allure reporter first.' 
      });
    }
    
    // Create execution-specific report directory
    await fs.mkdir(executionReportPath, { recursive: true });
    
    // Generate Allure report
    const command = `npx allure generate ${allureResultsPath} -o ${executionReportPath} --clean`;
    
    console.log(`Generating Allure report for execution ${executionId}...`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Report successfully generated')) {
      console.error('Allure generation stderr:', stderr);
    }
    
    console.log('Allure generation stdout:', stdout);
    
    // Verify report was generated
    try {
      await fs.access(path.join(executionReportPath, 'index.html'));
    } catch (error) {
      throw new Error('Report generation failed - index.html not found');
    }
    
    res.json({ 
      success: true, 
      message: 'Allure report generated successfully',
      reportPath: `/api/allure/report/${executionId}`
    });
    
  } catch (error) {
    console.error('Error generating Allure report:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Serve Allure report files
router.use('/report/:executionId', (req, res, next) => {
  const { executionId } = req.params;
  const reportPath = path.join(process.cwd(), 'allure-report', executionId);
  
  // Serve static files from the execution-specific report directory
  express.static(reportPath)(req, res, next);
});

// Get Allure report status for an execution
router.get('/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const executionReportPath = path.join(process.cwd(), 'allure-report', executionId);
    const indexPath = path.join(executionReportPath, 'index.html');
    
    try {
      const stats = await fs.stat(indexPath);
      res.json({ 
        exists: true, 
        generated: true,
        lastModified: stats.mtime,
        reportPath: `/api/allure/report/${executionId}`
      });
    } catch (error) {
      res.json({ 
        exists: false, 
        generated: false,
        reportPath: null
      });
    }
  } catch (error) {
    console.error('Error checking Allure report status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// List all available Allure reports
router.get('/reports', async (req, res) => {
  try {
    const allureReportPath = path.join(process.cwd(), 'allure-report');
    
    try {
      const entries = await fs.readdir(allureReportPath, { withFileTypes: true });
      const reports = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'data' && entry.name !== 'history') {
          const indexPath = path.join(allureReportPath, entry.name, 'index.html');
          try {
            const stats = await fs.stat(indexPath);
            reports.push({
              executionId: entry.name,
              lastModified: stats.mtime,
              reportPath: `/api/allure/report/${entry.name}`
            });
          } catch (error) {
            // Skip directories without valid reports
          }
        }
      }
      
      res.json({ success: true, reports });
    } catch (error) {
      res.json({ success: true, reports: [] });
    }
  } catch (error) {
    console.error('Error listing Allure reports:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete Allure report for an execution
router.delete('/report/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const executionReportPath = path.join(process.cwd(), 'allure-report', executionId);
    
    try {
      await fs.rm(executionReportPath, { recursive: true, force: true });
      res.json({ 
        success: true, 
        message: 'Allure report deleted successfully' 
      });
    } catch (error) {
      res.json({ 
        success: true, 
        message: 'Report did not exist or was already deleted' 
      });
    }
  } catch (error) {
    console.error('Error deleting Allure report:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;