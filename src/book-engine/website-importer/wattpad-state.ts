/** Depth-balanced extraction of a `window.<name> = { ... }` JSON assignment, never eval'd/executed. */
function readWattpadWindowAssignment(html: string, name: string): any | undefined {
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const assignment = new RegExp(`window\\.${name}\\s*=\\s*`).exec(script[1]);
    if (!assignment) continue;
    const raw = script[1].slice(assignment.index + assignment[0].length).trimStart();
    if (raw[0] !== '{') continue;
    let depth = 0, quoted = false, escaped = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') quoted = false;
      } else if (ch === '"') quoted = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        try { return JSON.parse(raw.slice(0, i + 1)); }
        catch { break; }
      }
    }
  }
  return undefined;
}

/** Parse public server-rendered Remix data as JSON, never execute page scripts. */
export function readWattpadLoader(html: string, route: string): any | undefined {
  return readWattpadWindowAssignment(html, '__remixContext')?.state?.loaderData?.[route];
}

/**
 * Wattpad's search pages (e.g. /search/<keyword>) embed their results the
 * same way: a plain `window.prefetched = {...}` JSON blob, keyed like
 * `search.stories.results.<keyword>.false.false`, present even for an
 * anonymous, cookie-less request — no undocumented API call needed.
 */
export function readWattpadPrefetched(html: string): Record<string, any> | undefined {
  return readWattpadWindowAssignment(html, 'prefetched');
}
