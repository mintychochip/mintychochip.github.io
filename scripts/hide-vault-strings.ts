import ts from 'typescript';

/**
 * Build-time only. Rewrites string literals and template text in a vault chunk
 * into a base64 table so the shipped file does not contain those strings.
 * Import and export specifiers stay literal so the chunk can still load.
 */
export function hideStrings(code: string): string {
  const source = ts.createSourceFile('vault.js', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const values: string[] = [];
  const indexOf = new Map<string, number>();
  const decode = uniqueName(code, '$vaultDecode');
  const table = uniqueName(code, '$vaultStrings');

  function ref(value: string, computed: boolean): string {
    let index = indexOf.get(value);
    if (index === undefined) {
      index = values.length;
      indexOf.set(value, index);
      values.push(value);
    }
    const call = `${decode}(${index})`;
    return computed ? `[${call}]` : call;
  }

  function pad(start: number, end: number, text: string): string {
    const previous = code[start - 1] ?? '';
    const next = code[end] ?? '';
    const left = /[A-Za-z0-9_$]/.test(previous) && /[A-Za-z0-9_$]/.test(text[0] ?? '') ? ' ' : '';
    const right = /[A-Za-z0-9_$]/.test(next) && /[A-Za-z0-9_$]/.test(text.at(-1) ?? '') ? ' ' : '';
    return left + text + right;
  }

  function hidden(node: ts.Node): boolean {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return !skipString(node) && !isTaggedTemplate(node);
    }
    return ts.isTemplateExpression(node) && !isTaggedTemplate(node);
  }

  function rewrite(start: number, end: number): string {
    const nodes: ts.Node[] = [];
    const walk = (node: ts.Node) => {
      const nodeStart = node.getStart(source);
      const nodeEnd = node.getEnd();
      if (nodeEnd <= start || nodeStart >= end) return;
      if (nodeStart >= start && nodeEnd <= end && hidden(node)) {
        nodes.push(node);
        return;
      }
      ts.forEachChild(node, walk);
    };
    walk(source);

    nodes.sort((a, b) => a.getStart(source) - b.getStart(source));
    let out = '';
    let cursor = start;
    for (const node of nodes) {
      const nodeStart = node.getStart(source);
      const nodeEnd = node.getEnd();
      out += code.slice(cursor, nodeStart);
      out += pad(nodeStart, nodeEnd, emit(node));
      cursor = nodeEnd;
    }
    out += code.slice(cursor, end);
    return out;
  }

  function emit(node: ts.Node): string {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return ref(node.text, propertyName(node));
    }
    if (!ts.isTemplateExpression(node)) return code.slice(node.getStart(source), node.getEnd());

    const parts: string[] = [];
    const push = (text: string) => {
      if (text !== '') parts.push(ref(text, false));
    };
    push(node.head.text);
    for (const span of node.templateSpans) {
      parts.push(`(${rewrite(span.expression.getStart(source), span.expression.getEnd())})`);
      push(span.literal.text);
    }
    return parts.length > 0 ? parts.join('+') : '""';
  }

  const body = rewrite(0, source.getEnd());
  if (values.length === 0) return code;

  const encoded = values.map((value) => JSON.stringify(Buffer.from(value, 'utf8').toString('base64')));
  const prelude =
    `function ${decode}(i){const b=atob(${table}[i]);const u=new Uint8Array(b.length);` +
    `for(let n=0;n<b.length;n++)u[n]=b.charCodeAt(n);return new TextDecoder().decode(u)}` +
    `const ${table}=[${encoded.join(',')}];`;

  return prelude + body;
}

function isTaggedTemplate(node: ts.Node): boolean {
  return ts.isTaggedTemplateExpression(node.parent);
}

function propertyName(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (
    ts.isPropertyAssignment(parent) ||
    ts.isShorthandPropertyAssignment(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent)
  ) {
    return parent.name === node;
  }
  return false;
}

function skipString(node: ts.StringLiteralLike): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) {
    return true;
  }
  return (
    ts.isCallExpression(parent) &&
    parent.expression.kind === ts.SyntaxKind.ImportKeyword &&
    parent.arguments[0] === node
  );
}

function uniqueName(code: string, base: string): string {
  let name = base;
  let n = 0;
  while (code.includes(name)) {
    n += 1;
    name = `${base}${n}`;
  }
  return name;
}
