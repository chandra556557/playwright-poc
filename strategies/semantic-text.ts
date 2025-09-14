import { BaseHealingStrategy } from './base-strategy';
import { ElementContext, HealingCandidate } from '../../types';

// Lightweight semantic matching using synonyms/abbreviations and stemming
export class SemanticTextStrategy extends BaseHealingStrategy {
  constructor(page: any) {
    super(page, 'semantic-text');
  }

  private synonyms: Array<[string, string]> = [
    ['document', 'doc'],
    ['save document', 'save doc'],
    ['cancel operation', 'cancel'],
    ['username', 'user name'],
    ['e-mail', 'email'],
    ['sign in', 'login'],
    ['sign out', 'logout'],
    ['catalog', 'catalogue'],
    ['colour', 'color'],
    ['amount', 'price'],
  ];

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[()\[\]{}]/g, '')
      .replace(/[^\w\s]/g, '');
  }

  private stem(word: string): string {
    return word
      .replace(/(ing|ed|ly|s)$/i, '') // very naive stemming
      .toLowerCase();
  }

  private generateSemanticVariants(text: string): string[] {
    const variants = new Set<string>();
    const base = this.normalize(text);
    variants.add(base);

    // synonyms/abbreviations both directions
    for (const [a, b] of this.synonyms) {
      const ra = new RegExp(a, 'ig');
      const rb = new RegExp(b, 'ig');
      if (base.match(ra)) variants.add(base.replace(ra, b));
      if (base.match(rb)) variants.add(base.replace(rb, a));
    }

    // per-token stemming reassemble
    const tokens = base.split(' ').filter(Boolean);
    const stemmed = tokens.map(t => this.stem(t)).join(' ').trim();
    if (stemmed && stemmed !== base) variants.add(stemmed);

    return [...variants];
  }

  private buildSelectors(text: string, tagName: string): string[] {
    const sels: string[] = [];
    const variants = this.generateSemanticVariants(text);
    for (const v of variants) {
      // exact quoted and :has-text
      sels.push(`text="${v}"`);
      sels.push(`${tagName}:has-text("${v}")`);
      // partial per token (unquoted text=word)
      const words = v.split(' ').filter(w => w.length > 2);
      for (const w of words) sels.push(`text=${w}`);
    }
    return [...new Set(sels)];
  }

  async generateCandidates(context: ElementContext): Promise<HealingCandidate[]> {
    const out: HealingCandidate[] = [];
    const { textContent, tagName } = context;
    if (!textContent || textContent.trim().length < 2) return out;

    const selectors = this.buildSelectors(textContent, tagName);
    for (const selector of selectors) {
      if (await this.validateCandidate(selector)) {
        const cand = await this.getCandidateContext(selector);
        if (!cand) continue;

        // compute simple features emphasizing text similarity
        const features: Record<string, number> = {};
        features.text = this.calculateTextSimilarity(cand.textContent || '', textContent);
        features.attribute = this.calculateAttributeSimilarity(cand.attributes || {}, context.attributes);
        features.structure = cand.tagName === context.tagName ? 0.5 : 0.2;
        features.visual = 0.0; // not used here

        // combine to score using base scoring
        const score = await this.scoreCandidate(selector, context, features);
        out.push(this.createCandidate(selector, score, features, `Semantic text variant match: ${selector}`));
      }
    }

    return out;
  }
}