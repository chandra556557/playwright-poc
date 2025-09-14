// Type definitions for healing strategies

export interface ElementContext {
  originalSelector: string;
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  isVisible?: boolean;
  role?: string;
  ariaName?: string;
  ariaLabel?: string;
  nearbyLabels?: string[];
  stableAnchors?: string[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  computedStyles?: Record<string, string>;
  parentContext?: Partial<ElementContext>;
  siblingContexts?: Partial<ElementContext>[];
}

export interface HealingCandidate {
  selector: string;
  strategy: string;
  score: number;
  confidence: number;
  features: Record<string, number>;
  reasoning?: string;
  metadata?: Record<string, any>;
}

export interface HealingResult {
  success: boolean;
  selector?: string;
  strategy?: string;
  confidence?: number;
  attempts: HealingCandidate[];
  error?: string;
}

export interface StrategyConfig {
  name: string;
  enabled: boolean;
  priority: number;
  timeout?: number;
  maxCandidates?: number;
  minConfidence?: number;
}

export interface HealingOptions {
  strategies?: StrategyConfig[];
  maxRetries?: number;
  retryDelay?: number;
  minConfidence?: number;
  enableLearning?: boolean;
  screenshot?: boolean;
}