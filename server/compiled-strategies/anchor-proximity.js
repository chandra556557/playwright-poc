const { BaseHealingStrategy } = require('./base-strategy');
// Types removed for JS compatibility

// Anchor proximity strategy nearby stable anchors/labels to locate element when text changes
class AnchorProximityStrategy extends BaseHealingStrategy {
  constructor(page) {
    super(page, 'anchor-proximity');
  }

  async findNearAnchors(context) {
    const anchors = new Set();

    // Use nearby labels and stable anchors recorded in context to craft queries
    for (const label of context.nearbyLabels || []) {
      const t = label.trim();
      if (t.length > 1) {
        anchors.add(`:has-text("${t}")`);
        anchors.add(`text=${t.split(' ').filter(w=>w.length>2)[0] || t}`);
      }
    }

    for (const a of context.stableAnchors || []) {
      if (a.startsWith('#') || a.startsWith('[') || a.startsWith(':') || a.includes('role="')) {
        anchors.add(a);
      } else {
        anchors.add(a);
      }
    }

    return [...anchors];
  }

  async generateCandidates(context) {
    const candidates = [];
    const { tagName } = context;

    try {
      const anchors = await this.findNearAnchors(context);

      // Probe elements under/near anchors
      for (const anchor of anchors) {
        const scoped = `${anchor} ${tagName}`.trim();
        try {
          const handles = await this.page.$$(scoped);
          for (const h of handles) {
            const selector = await this.generateSelectorFor(h);
            if (!selector) continue;
            if (!(await this.validateCandidate(selector))) continue;

            const candCtx = await this.getCandidateContext(selector);
            if (!candCtx) continue;

            const features = {};
            features.attribute = this.calculateAttributeSimilarity(candCtx.attributes || {}, context.attributes);
            features.structure = candCtx.tagName === context.tagName ? 0.6 .3;
            features.text = this.calculateTextSimilarity(candCtx.textContent || '', context.textContent);
            features.visual = 0.0;

            const score = await this.scoreCandidate(selector, context, features);
            candidates.push(this.createCandidate(selector, score, features, `Anchor proximity via ${anchor}`));
          }
        } catch {}
      }
    } catch {}

    return candidates;
  }

  async generateSelectorFor(element) {
    try {
      const [tagName, attrs, txt] = await Promise.all([
        element.evaluate((el) => el.tagName.toLowerCase()),
        element.evaluate((el) => {
          const o = {}; for (const a of Array.from(el.attributes)) o[a.name]=a.value; return o;
        }),
        element.evaluate((el) => el.textContent?.trim() || '')
      ]);

      if (attrs['data-testid']) return `[data-testid="${attrs['data-testid']}"]`;
      if (attrs.id) return `#${attrs.id}`;
      if (attrs.name) return `[name="${attrs.name}"]`;
      if (txt) return `${tagName}:has-text("${txt}")`;
      return null;
    } catch { return null; }
  }
}

module.exports = { AnchorProximityStrategy };