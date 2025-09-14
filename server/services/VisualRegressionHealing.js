import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simplified version without heavy image processing dependencies

class VisualRegressionHealing {
  constructor() {
    this.baselineDir = path.join(__dirname, '../data/visual-baselines');
    this.screenshotDir = path.join(__dirname, '../data/screenshots');
    this.diffDir = path.join(__dirname, '../data/visual-diffs');
    this.healingThreshold = 0.1; // 10% difference threshold
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.baselineDir, { recursive: true });
      await fs.mkdir(this.screenshotDir, { recursive: true });
      await fs.mkdir(this.diffDir, { recursive: true });
    } catch (error) {
      console.error('Error initializing visual regression directories:', error);
    }
  }

  // Alias for compatibility
  async initialize() {
    return this.init();
  }

  // Capture baseline screenshot for comparison
  async captureBaseline(page, testName, elementSelector = null) {
    try {
      const timestamp = Date.now();
      const filename = `${testName}-baseline-${timestamp}.png`;
      const filepath = path.join(this.baselineDir, filename);

      let screenshotOptions = {
        path: filepath,
        fullPage: true
      };

      // If element selector provided, capture only that element
      if (elementSelector) {
        const element = await page.locator(elementSelector).first();
        if (await element.isVisible()) {
          screenshotOptions = {
            path: filepath,
            clip: await element.boundingBox()
          };
        }
      }

      await page.screenshot(screenshotOptions);
      
      return {
        filename,
        filepath,
        testName,
        elementSelector,
        timestamp
      };
    } catch (error) {
      console.error('Error capturing baseline:', error);
      throw error;
    }
  }

  // Capture current screenshot for comparison
  async captureCurrentScreenshot(page, testName, elementSelector = null) {
    try {
      const timestamp = Date.now();
      const filename = `${testName}-current-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      let screenshotOptions = {
        path: filepath,
        fullPage: true
      };

      if (elementSelector) {
        const element = await page.locator(elementSelector).first();
        if (await element.isVisible()) {
          screenshotOptions = {
            path: filepath,
            clip: await element.boundingBox()
          }
        }
      }

      await page.screenshot(screenshotOptions);
      
      return {
        filename,
        filepath,
        testName,
        elementSelector,
        timestamp
      };
    } catch (error) {
      console.error('Error capturing current screenshot:', error);
      throw error;
    }
  }

  // Compare images and detect visual differences
  async compareImages(baselinePath, currentPath, testName) {
    try {
      const baseline = PNG.sync.read(await fs.readFile(baselinePath));
      const current = PNG.sync.read(await fs.readFile(currentPath));
      
      const { width, height } = baseline;
      const diff = new PNG({ width, height });

      // Resize current image if dimensions don't match
      let currentResized = current;
      if (current.width !== width || current.height !== height) {
        const resizedBuffer = await sharp(currentPath)
          .resize(width, height)
          .png()
          .toBuffer();
        currentResized = PNG.sync.read(resizedBuffer);
      }

      const pixelDiff = pixelmatch(
        baseline.data,
        currentResized.data,
        diff.data,
        width,
        height,
        {
          threshold: 0.1,
          alpha: 0.2,
          diffMask: true
        }
      );

      const totalPixels = width * height;
      const diffPercentage = (pixelDiff / totalPixels) * 100;

      // Save diff image
      const diffFilename = `${testName}-diff-${Date.now()}.png`;
      const diffPath = path.join(this.diffDir, diffFilename);
      await fs.writeFile(diffPath, PNG.sync.write(diff));

      return {
        pixelDiff,
        totalPixels,
        diffPercentage: Math.round(diffPercentage * 100) / 100,
        diffPath,
        hasSignificantChange: diffPercentage > this.healingThreshold * 100,
        baseline: baselinePath,
        current: currentPath
      };
    } catch (error) {
      console.error('Error comparing images:', error);
      throw error;
    }
  }

  // Detect UI elements using computer vision
  async detectUIElements(imagePath) {
    try {
      const image = await cv.imreadAsync(imagePath);
      const gray = image.cvtColor(cv.COLOR_BGR2GRAY);
      
      // Detect buttons using template matching and contours
      const buttons = await this.detectButtons(gray);
      const inputs = await this.detectInputFields(gray);
      const links = await this.detectLinks(image);
      const text = await this.detectTextElements(gray);

      return {
        buttons,
        inputs,
        links,
        text,
        totalElements: buttons.length + inputs.length + links.length + text.length
      };
    } catch (error) {
      console.error('Error detecting UI elements:', error);
      return { buttons: [], inputs: [], links: [], text: [], totalElements: 0 };
    }
  }

  // Detect button elements using computer vision
  async detectButtons(grayImage) {
    try {
      // Use edge detection to find rectangular shapes
      const edges = grayImage.canny(50, 150);
      const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      const buttons = [];
      
      for (const contour of contours) {
        const rect = contour.boundingRect();
        const area = rect.width * rect.height;
        
        // Filter by size and aspect ratio typical for buttons
        if (area > 500 && area < 50000) {
          const aspectRatio = rect.width / rect.height;
          if (aspectRatio > 0.5 && aspectRatio < 10) {
            buttons.push({
              type: 'button',
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              area,
              confidence: this.calculateButtonConfidence(rect, aspectRatio)
            });
          }
        }
      }
      
      return buttons.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error detecting buttons:', error);
      return [];
    }
  }

  // Detect input field elements
  async detectInputFields(grayImage) {
    try {
      const edges = grayImage.canny(50, 150);
      const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      const inputs = [];
      
      for (const contour of contours) {
        const rect = contour.boundingRect();
        const area = rect.width * rect.height;
        
        // Input fields are typically wider than they are tall
        if (area > 1000 && area < 30000) {
          const aspectRatio = rect.width / rect.height;
          if (aspectRatio > 2 && aspectRatio < 20) {
            inputs.push({
              type: 'input',
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              area,
              confidence: this.calculateInputConfidence(rect, aspectRatio)
            });
          }
        }
      }
      
      return inputs.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error detecting input fields:', error);
      return [];
    }
  }

  // Detect clickable links using color analysis
  async detectLinks(colorImage) {
    try {
      // Convert to HSV for better color detection
      const hsv = colorImage.cvtColor(cv.COLOR_BGR2HSV);
      
      // Define blue color range (typical for links)
      const lowerBlue = new cv.Vec3(100, 50, 50);
      const upperBlue = new cv.Vec3(130, 255, 255);
      
      const mask = hsv.inRange(lowerBlue, upperBlue);
      const contours = mask.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      const links = [];
      
      for (const contour of contours) {
        const rect = contour.boundingRect();
        const area = rect.width * rect.height;
        
        if (area > 100 && area < 10000) {
          links.push({
            type: 'link',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            area,
            confidence: this.calculateLinkConfidence(rect)
          });
        }
      }
      
      return links.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error detecting links:', error);
      return [];
    }
  }

  // Detect text elements using OCR-like techniques
  async detectTextElements(grayImage) {
    try {
      // Use morphological operations to detect text regions
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const morph = grayImage.morphologyEx(cv.MORPH_CLOSE, kernel);
      
      const contours = morph.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      const textElements = [];
      
      for (const contour of contours) {
        const rect = contour.boundingRect();
        const area = rect.width * rect.height;
        
        // Text elements have specific size characteristics
        if (area > 50 && area < 5000) {
          const aspectRatio = rect.width / rect.height;
          if (aspectRatio > 0.1 && aspectRatio < 50) {
            textElements.push({
              type: 'text',
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              area,
              confidence: this.calculateTextConfidence(rect, aspectRatio)
            });
          }
        }
      }
      
      return textElements.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error detecting text elements:', error);
      return [];
    }
  }

  // Calculate confidence scores for different element types
  calculateButtonConfidence(rect, aspectRatio) {
    let confidence = 0.5;
    
    // Prefer rectangular shapes
    if (aspectRatio >= 1.5 && aspectRatio <= 4) confidence += 0.3;
    
    // Prefer medium-sized elements
    const area = rect.width * rect.height;
    if (area >= 2000 && area <= 15000) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  calculateInputConfidence(rect, aspectRatio) {
    let confidence = 0.4;
    
    // Input fields are typically wide
    if (aspectRatio >= 3 && aspectRatio <= 10) confidence += 0.4;
    
    // Prefer certain heights
    if (rect.height >= 20 && rect.height <= 50) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  calculateLinkConfidence(rect) {
    let confidence = 0.3;
    
    // Links are typically smaller
    const area = rect.width * rect.height;
    if (area >= 200 && area <= 3000) confidence += 0.4;
    
    // Prefer certain aspect ratios
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio >= 1 && aspectRatio <= 8) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
  }

  calculateTextConfidence(rect, aspectRatio) {
    let confidence = 0.2;
    
    // Text has varied aspect ratios
    if (aspectRatio >= 0.5 && aspectRatio <= 20) confidence += 0.3;
    
    // Prefer readable sizes
    if (rect.height >= 10 && rect.height <= 30) confidence += 0.3;
    
    const area = rect.width * rect.height;
    if (area >= 100 && area <= 2000) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  // Find matching elements between baseline and current screenshots
  async findMatchingElements(baselineElements, currentElements, tolerance = 50) {
    const matches = [];
    const unmatched = [];
    
    for (const baselineEl of baselineElements) {
      let bestMatch = null;
      let bestDistance = Infinity;
      
      for (const currentEl of currentElements) {
        if (baselineEl.type === currentEl.type) {
          const distance = this.calculateElementDistance(baselineEl, currentEl);
          
          if (distance < bestDistance && distance <= tolerance) {
            bestDistance = distance;
            bestMatch = currentEl;
          }
        }
      }
      
      if (bestMatch) {
        matches.push({
          baseline: baselineEl,
          current: bestMatch,
          distance: bestDistance,
          moved: bestDistance > 10
        });
      } else {
        unmatched.push(baselineEl);
      }
    }
    
    return { matches, unmatched };
  }

  // Calculate distance between two elements
  calculateElementDistance(el1, el2) {
    const centerX1 = el1.x + el1.width / 2;
    const centerY1 = el1.y + el1.height / 2;
    const centerX2 = el2.x + el2.width / 2;
    const centerY2 = el2.y + el2.height / 2;
    
    return Math.sqrt(
      Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2)
    );
  }

  // Generate healing suggestions based on visual analysis
  async generateHealingSuggestions(comparisonResult, baselineElements, currentElements) {
    const suggestions = [];
    
    if (!comparisonResult.hasSignificantChange) {
      return suggestions;
    }
    
    const { matches, unmatched } = await this.findMatchingElements(
      baselineElements,
      currentElements
    );
    
    // Suggest coordinate updates for moved elements
    for (const match of matches) {
      if (match.moved) {
        suggestions.push({
          type: 'coordinate_update',
          element: match.baseline,
          newCoordinates: {
            x: match.current.x,
            y: match.current.y,
            width: match.current.width,
            height: match.current.height
          },
          confidence: 0.8,
          reason: 'Element moved to new position'
        });
      }
    }
    
    // Suggest alternative selectors for unmatched elements
    for (const unmatchedEl of unmatched) {
      const nearbyElements = currentElements.filter(el => 
        el.type === unmatchedEl.type &&
        this.calculateElementDistance(unmatchedEl, el) <= 100
      );
      
      if (nearbyElements.length > 0) {
        suggestions.push({
          type: 'selector_update',
          element: unmatchedEl,
          alternatives: nearbyElements,
          confidence: 0.6,
          reason: 'Original element not found, suggesting nearby alternatives'
        });
      }
    }
    
    return suggestions;
  }

  // Perform visual regression healing
  async performVisualHealing(page, testName, originalSelector) {
    try {
      // Capture current state
      const currentScreenshot = await this.captureCurrentScreenshot(page, testName);
      
      // Find latest baseline
      const baseline = await this.findLatestBaseline(testName);
      if (!baseline) {
        console.log('No baseline found, capturing new baseline');
        return await this.captureBaseline(page, testName);
      }
      
      // Compare images
      const comparison = await this.compareImages(
        baseline.filepath,
        currentScreenshot.filepath,
        testName
      );
      
      if (!comparison.hasSignificantChange) {
        return { success: true, reason: 'No significant visual changes detected' };
      }
      
      // Detect elements in both images
      const baselineElements = await this.detectUIElements(baseline.filepath);
      const currentElements = await this.detectUIElements(currentScreenshot.filepath);
      
      // Generate healing suggestions
      const suggestions = await this.generateHealingSuggestions(
        comparison,
        baselineElements.buttons.concat(baselineElements.inputs, baselineElements.links),
        currentElements.buttons.concat(currentElements.inputs, currentElements.links)
      );
      
      return {
        success: suggestions.length > 0,
        comparison,
        suggestions,
        baselineElements,
        currentElements,
        healingApplied: suggestions.length
      };
    } catch (error) {
      console.error('Error performing visual healing:', error);
      return { success: false, error: error.message };
    }
  }

  // Find the latest baseline for a test
  async findLatestBaseline(testName) {
    try {
      const files = await fs.readdir(this.baselineDir);
      const baselineFiles = files
        .filter(file => file.startsWith(`${testName}-baseline-`) && file.endsWith('.png'))
        .map(file => {
          const timestamp = parseInt(file.match(/-baseline-(\d+)\.png$/)?.[1] || '0');
          return {
            filename: file,
            filepath: path.join(this.baselineDir, file),
            timestamp
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      
      return baselineFiles[0] || null;
    } catch (error) {
      console.error('Error finding latest baseline:', error);
      return null;
    }
  }

  // Get visual healing analytics
  getAnalytics() {
    return {
      healingThreshold: this.healingThreshold,
      directories: {
        baselines: this.baselineDir,
        screenshots: this.screenshotDir,
        diffs: this.diffDir
      }
    };
  }
}

export default VisualRegressionHealing;