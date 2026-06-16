export interface MdcFrontmatter {
  description?: string;
  globs?: string | string[];
  alwaysApply?: boolean;
}

export interface ParsedMdc {
  frontmatter: MdcFrontmatter;
  body: string;
}

function parseYamlValue(raw: string): string | boolean | string[] {
  const trimmed = raw.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

/** Minimal frontmatter parser for `.mdc` rule files. */
export function parseMdc(content: string): ParsedMdc {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const end = content.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = content.slice(3, end).trim();
  const body = content.slice(end + 4).replace(/^\n/, "");
  const frontmatter: MdcFrontmatter = {};

  for (const line of yamlBlock.split("\n")) {
    const match = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    if (!key || rawValue === undefined) {
      continue;
    }
    if (key === "description") {
      frontmatter.description = String(parseYamlValue(rawValue));
    } else if (key === "globs") {
      const parsed = parseYamlValue(rawValue);
      frontmatter.globs = Array.isArray(parsed) ? parsed : String(parsed);
    } else if (key === "alwaysApply") {
      frontmatter.alwaysApply = parseYamlValue(rawValue) === true;
    }
  }

  return { frontmatter, body };
}
