/** Parse public server-rendered Remix data as JSON, never execute page scripts. */
export function readWattpadLoader(html: string, route: string): any | undefined {
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const assignment = /window\.__remixContext\s*=\s*/.exec(script[1]);
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
        try { return JSON.parse(raw.slice(0, i + 1))?.state?.loaderData?.[route]; }
        catch { break; }
      }
    }
  }
  return undefined;
}
