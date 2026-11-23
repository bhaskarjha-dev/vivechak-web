import React from 'react';

/**
 * Lightweight zero-dependency syntax highlighter for Markdown+YAML frontmatter,
 * JSON/YAML config snippets, and Vivechak artifacts. Keeps bundle crisp while
 * delivering publication-grade code legibility.
 */
export function renderHighlightedCode(code: string, lang: 'markdown' | 'json' | 'yaml' = 'markdown'): React.ReactNode {
  const lines = code.split('\n');
  let inFrontmatter = false;
  let fmDelims = 0;

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    if (lang === 'markdown') {
      if (trimmed === '---') {
        fmDelims++;
        inFrontmatter = fmDelims === 1;
        return (
          <span key={idx} className="tok-line">
            <span className="tok-delim">{line}</span>
            {'\n'}
          </span>
        );
      }

      if (inFrontmatter) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const k = line.slice(0, colonIdx);
          const v = line.slice(colonIdx);
          return (
            <span key={idx} className="tok-line">
              <span className="tok-key">{k}</span>
              <span className="tok-val">{v}</span>
              {'\n'}
            </span>
          );
        }
      }

      if (trimmed.startsWith('#')) {
        return (
          <span key={idx} className="tok-line">
            <span className="tok-heading">{line}</span>
            {'\n'}
          </span>
        );
      }

      if (trimmed.startsWith('```')) {
        return (
          <span key={idx} className="tok-line">
            <span className="tok-fence">{line}</span>
            {'\n'}
          </span>
        );
      }

      if (trimmed.startsWith('//') || trimmed.startsWith('>')) {
        return (
          <span key={idx} className="tok-line">
            <span className="tok-comment">{line}</span>
            {'\n'}
          </span>
        );
      }

      if (trimmed.startsWith('|')) {
        return (
          <span key={idx} className="tok-line">
            <span className="tok-table">{line}</span>
            {'\n'}
          </span>
        );
      }

      // Highlight inline evidence grade tags like [A · ...] or [Grade A: ...]
      const gradeParts = line.split(/(\[(?:[A-E]\s*·[^\]]+|Grade\s+[A-E][^\]]*)\])/g);
      if (gradeParts.length > 1) {
        return (
          <span key={idx} className="tok-line">
            {gradeParts.map((part, pIdx) =>
              part.startsWith('[') && part.endsWith(']') ? (
                <span key={pIdx} className="tok-grade">
                  {part}
                </span>
              ) : (
                <React.Fragment key={pIdx}>{part}</React.Fragment>
              )
            )}
            {'\n'}
          </span>
        );
      }

      return (
        <span key={idx} className="tok-line">
          {line}
          {'\n'}
        </span>
      );
    }

    if (lang === 'json') {
      const m = line.match(/^(\s*)("[^"]+")(\s*:\s*)(.*)$/);
      if (m) {
        const [, indent, key, sep, rest] = m;
        const isBoolOrNum = /^(true|false|null|\d+)/.test(rest.trim());
        const isStr = rest.trim().startsWith('"');
        return (
          <span key={idx} className="tok-line">
            {indent}
            <span className="tok-key">{key}</span>
            <span className="tok-punct">{sep}</span>
            <span className={isBoolOrNum ? 'tok-num' : isStr ? 'tok-str' : 'tok-punct'}>{rest}</span>
            {'\n'}
          </span>
        );
      }
      return (
        <span key={idx} className="tok-line">
          <span className="tok-punct">{line}</span>
          {'\n'}
        </span>
      );
    }

    // YAML
    const ym = line.match(/^(\s*)([A-Za-z0-9_-]+)(:)(.*)$/);
    if (ym) {
      const [, indent, key, sep, rest] = ym;
      return (
        <span key={idx} className="tok-line">
          {indent}
          <span className="tok-key">{key}</span>
          <span className="tok-punct">{sep}</span>
          <span className="tok-str">{rest}</span>
          {'\n'}
        </span>
      );
    }

    return (
      <span key={idx} className="tok-line">
        {line}
        {'\n'}
      </span>
    );
  });
}
