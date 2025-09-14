import { BaseHealingStrategy } from './base-strategy';
import { ElementContext, HealingCandidate } from '../../types';

/**
 * Strategy: Role + Accessible Name based healing
 * - Targets cases where role/accessible name are stable but ids/classes/text changed
 * - Generates Playwright role selectors like: role=button[name="Submit"]
 */
export class RoleAccessibleNameStrategy extends BaseHealingStrategy {
  constructor(page: any) {
    super(page, 'role-accessible-name');
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    const candidates: HealingCandidate[] = [];

    // Collect role/name hints from context
    const roleHints: string[] = [];
    const nameHints: string[] = [];

    if (context.role) roleHints.push(context.role);

    // Prefer explicit ariaName, otherwise try ariaLabel, then nearby labels and text
    if (context.ariaName) nameHints.push(context.ariaName);
    if (context.ariaLabel) nameHints.push(context.ariaLabel);

    // Nearby labels are likely good accessible names
    if (context.nearbyLabels && context.nearbyLabels.length) {
      nameHints.push(...context.nearbyLabels.slice(0, 3));
    }

    // Fallback to element text
    if (context.textContent) nameHints.push(context.textContent);

    // De-duplicate and trim
    const names = [...new Set(nameHints.map(n => n.trim()).filter(Boolean))];

    // If we have no role detected, try common interactive roles based on tag
    if (roleHints.length === 0) {
      const tag = (context.tagName || '').toLowerCase();
      if (tag === 'button' || tag === 'input') roleHints.push('button');
      if (tag === 'a') roleHints.push('link');
      if (tag === 'img') roleHints.push('img');
      if (tag === 'select' || tag === 'listbox') roleHints.push('combobox');
    }

    // Build selector candidates: role + name combinations
    const roleSelectors: string[] = [];
    for (const role of roleHints) {
      // Exact role only
      roleSelectors.push(`role=${role}`);

      for (const name of names) {
        // Exact name match
        roleSelectors.push(`role=${role}[name="${this.escapeQuotes(name)}"]`);

        // Partial name variants (prefix/suffix common cases)
        const trimmed = name.trim();
        if (trimmed.length > 3) {
          roleSelectors.push(`role=${role}[name="${this.escapeQuotes(trimmed)}"]`);
        }
      }
    }

    // Validate, compute features, and score
    for (const selector of roleSelectors) {
      try {
        if (await this.validateCandidate(selector)) {
          const candidateContext = await this.getCandidateContext(selector);
          if (candidateContext) {
            const features = await this.calculateFeatures(context, candidateContext, selector);
            const score = await this.scoreCandidate(selector, context, features);
            candidates.push(this.createCandidate(
              selector,
              score,
              features,
              `Role/AccessibleName matching: ${selector}`
            ));
          }
        }
      } catch {
        // ignore
      }
    }

    return candidates;
  }

  private escapeQuotes(text: string): string {
    return text.replace(/"/g, '\\"');
  }

  private async calculateFeatures(
    original: ElementContext,
    candidate: Partial<ElementContext>,
    selector: string
  ): Promise<Record<string, number>> {
    const features: Record<string, number> = {};

    // Role match gets high weight
    features.role = original.role && candidate.attributes?.role === original.role ? 1 : 0;

    // Accessible name similarity using text similarity as proxy
    const candidateName = candidate.attributes?.['aria-label'] || candidate.textContent || '';
    features.text = this.calculateTextSimilarity(candidateName, original.ariaName || original.ariaLabel || original.textContent);

    // Attribute similarity for stability
    features.attribute = this.calculateAttributeSimilarity(
      candidate.attributes || {},
      original.attributes
    );

    // Structural hint: same tag increases confidence
    features.structure = candidate.tagName === original.tagName ? 0.5 : 0.2;

    // Visibility alignment
    features.visual = candidate.isVisible === original.isVisible ? 0.5 : 0.2;

    return features;
  }
}