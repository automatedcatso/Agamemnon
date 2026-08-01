import type { ReactNode } from "react";

type MessageContentProps = {
  content: string;
};

type MathSymbol = {
  value: string;
  kind: "mi" | "mo";
};

const MATH_SYMBOLS: Record<string, MathSymbol> = {
  alpha: { value: "α", kind: "mi" },
  beta: { value: "β", kind: "mi" },
  gamma: { value: "γ", kind: "mi" },
  delta: { value: "δ", kind: "mi" },
  epsilon: { value: "ε", kind: "mi" },
  theta: { value: "θ", kind: "mi" },
  lambda: { value: "λ", kind: "mi" },
  mu: { value: "μ", kind: "mi" },
  pi: { value: "π", kind: "mi" },
  rho: { value: "ρ", kind: "mi" },
  sigma: { value: "σ", kind: "mi" },
  tau: { value: "τ", kind: "mi" },
  phi: { value: "φ", kind: "mi" },
  omega: { value: "ω", kind: "mi" },
  Gamma: { value: "Γ", kind: "mi" },
  Delta: { value: "Δ", kind: "mi" },
  Theta: { value: "Θ", kind: "mi" },
  Lambda: { value: "Λ", kind: "mi" },
  Pi: { value: "Π", kind: "mi" },
  Sigma: { value: "Σ", kind: "mi" },
  Phi: { value: "Φ", kind: "mi" },
  Omega: { value: "Ω", kind: "mi" },
  partial: { value: "∂", kind: "mo" },
  nabla: { value: "∇", kind: "mo" },
  sum: { value: "∑", kind: "mo" },
  prod: { value: "∏", kind: "mo" },
  int: { value: "∫", kind: "mo" },
  infty: { value: "∞", kind: "mo" },
  cdot: { value: "·", kind: "mo" },
  times: { value: "×", kind: "mo" },
  div: { value: "÷", kind: "mo" },
  pm: { value: "±", kind: "mo" },
  mp: { value: "∓", kind: "mo" },
  le: { value: "≤", kind: "mo" },
  leq: { value: "≤", kind: "mo" },
  ge: { value: "≥", kind: "mo" },
  geq: { value: "≥", kind: "mo" },
  neq: { value: "≠", kind: "mo" },
  approx: { value: "≈", kind: "mo" },
  equiv: { value: "≡", kind: "mo" },
  propto: { value: "∝", kind: "mo" },
  in: { value: "∈", kind: "mo" },
  notin: { value: "∉", kind: "mo" },
  subset: { value: "⊂", kind: "mo" },
  subseteq: { value: "⊆", kind: "mo" },
  cup: { value: "∪", kind: "mo" },
  cap: { value: "∩", kind: "mo" },
  forall: { value: "∀", kind: "mo" },
  exists: { value: "∃", kind: "mo" },
  therefore: { value: "∴", kind: "mo" },
  because: { value: "∵", kind: "mo" },
  to: { value: "→", kind: "mo" },
  rightarrow: { value: "→", kind: "mo" },
  leftarrow: { value: "←", kind: "mo" },
  leftrightarrow: { value: "↔", kind: "mo" },
  Rightarrow: { value: "⇒", kind: "mo" },
  Leftarrow: { value: "⇐", kind: "mo" },
};

const MATH_FUNCTIONS = new Set(["sin", "cos", "tan", "sec", "csc", "cot", "log", "ln", "exp", "lim", "max", "min", "det"]);
const SPACING_COMMANDS: Record<string, string> = {
  ",": "0.18em",
  ";": "0.28em",
  ":": "0.22em",
  quad: "1em",
  qquad: "2em",
  enspace: "0.5em",
};

class LatexParser {
  private position = 0;
  private keyIndex = 0;

  constructor(private readonly input: string) {}

  parse(): ReactNode[] {
    return this.parseSequence();
  }

  private key(prefix: string) {
    this.keyIndex += 1;
    return `${prefix}-${this.keyIndex}`;
  }

  private parseSequence(stopCharacter?: string): ReactNode[] {
    const nodes: ReactNode[] = [];

    while (this.position < this.input.length) {
      if (stopCharacter && this.input[this.position] === stopCharacter) {
        this.position += 1;
        break;
      }

      const atom = this.parseAtom();
      if (atom !== null) nodes.push(this.attachScripts(atom));
    }

    return nodes;
  }

  private attachScripts(base: ReactNode): ReactNode {
    let subscript: ReactNode | null = null;
    let superscript: ReactNode | null = null;

    while (this.position < this.input.length) {
      const checkpoint = this.position;
      this.skipWhitespace();
      const marker = this.input[this.position];
      if (marker !== "_" && marker !== "^") {
        this.position = checkpoint;
        break;
      }

      this.position += 1;
      const script = this.parseRequiredGroup();
      if (marker === "_") subscript = script;
      if (marker === "^") superscript = script;
    }

    if (subscript && superscript) return <msubsup key={this.key("msubsup")}>{base}{subscript}{superscript}</msubsup>;
    if (subscript) return <msub key={this.key("msub")}>{base}{subscript}</msub>;
    if (superscript) return <msup key={this.key("msup")}>{base}{superscript}</msup>;
    return base;
  }

  private parseRequiredGroup(): ReactNode {
    this.skipWhitespace();
    if (this.input[this.position] === "{") {
      this.position += 1;
      return <mrow key={this.key("group")}>{this.parseSequence("}")}</mrow>;
    }

    const atom = this.parseAtom();
    return atom === null ? <mrow key={this.key("empty")} /> : this.attachScripts(atom);
  }

  private readRawGroup(): string {
    this.skipWhitespace();
    if (this.input[this.position] !== "{") return "";

    this.position += 1;
    let depth = 1;
    let value = "";
    while (this.position < this.input.length && depth > 0) {
      const character = this.input[this.position];
      this.position += 1;
      if (character === "{") depth += 1;
      else if (character === "}") depth -= 1;
      if (depth > 0) value += character;
    }
    return value;
  }

  private parseAtom(): ReactNode | null {
    if (this.position >= this.input.length) return null;

    const character = this.input[this.position];

    if (/\s/.test(character)) {
      this.skipWhitespace();
      return <mspace key={this.key("space")} width="0.25em" />;
    }

    if (character === "{") {
      this.position += 1;
      return <mrow key={this.key("group")}>{this.parseSequence("}")}</mrow>;
    }

    if (character === "\\") return this.parseCommand();

    if (/\d/.test(character)) {
      const start = this.position;
      while (/[\d.]/.test(this.input[this.position] ?? "")) this.position += 1;
      return <mn key={this.key("number")}>{this.input.slice(start, this.position)}</mn>;
    }

    if (/[A-Za-z]/.test(character)) {
      const start = this.position;
      while (/[A-Za-z]/.test(this.input[this.position] ?? "")) this.position += 1;
      const word = this.input.slice(start, this.position);
      if (MATH_FUNCTIONS.has(word)) return <mi key={this.key("function")} mathvariant="normal">{word}</mi>;
      this.position = start + 1;
      return <mi key={this.key("variable")}>{character}</mi>;
    }

    this.position += 1;
    if ("+-=<>×÷·,;:()[]|".includes(character)) return <mo key={this.key("operator")}>{character}</mo>;
    return <mtext key={this.key("text")}>{character}</mtext>;
  }

  private parseCommand(): ReactNode | null {
    this.position += 1;
    const start = this.position;
    if (/[A-Za-z]/.test(this.input[this.position] ?? "")) {
      while (/[A-Za-z]/.test(this.input[this.position] ?? "")) this.position += 1;
    } else {
      this.position += 1;
    }
    const command = this.input.slice(start, this.position);

    if (["left", "right"].includes(command)) return this.parseAtom();
    if (["frac", "dfrac", "tfrac"].includes(command)) {
      const numerator = this.parseRequiredGroup();
      const denominator = this.parseRequiredGroup();
      return <mfrac key={this.key("fraction")}>{numerator}{denominator}</mfrac>;
    }
    if (command === "sqrt") return <msqrt key={this.key("sqrt")}>{this.parseRequiredGroup()}</msqrt>;
    if (["text", "textrm", "operatorname"].includes(command)) {
      return <mtext key={this.key("text-command")}>{this.readRawGroup()}</mtext>;
    }
    if (["mathrm", "mathbf", "mathit"].includes(command)) {
      return <mrow key={this.key("styled-group")}>{this.parseRequiredGroup()}</mrow>;
    }
    if (command === "overline") {
      return <mover key={this.key("overline")} accent="true">{this.parseRequiredGroup()}<mo>¯</mo></mover>;
    }
    if (["vec", "hat"].includes(command)) {
      return <mover key={this.key("accent")} accent="true">{this.parseRequiredGroup()}<mo>{command === "vec" ? "→" : "^"}</mo></mover>;
    }
    if (command in SPACING_COMMANDS) return <mspace key={this.key("command-space")} width={SPACING_COMMANDS[command]} />;
    if (command === "!") return null;

    const symbol = MATH_SYMBOLS[command];
    if (symbol?.kind === "mi") return <mi key={this.key("symbol")}>{symbol.value}</mi>;
    if (symbol?.kind === "mo") return <mo key={this.key("symbol")}>{symbol.value}</mo>;

    return <mi key={this.key("unknown-command")} mathvariant="normal">{command}</mi>;
  }

  private skipWhitespace() {
    while (/\s/.test(this.input[this.position] ?? "")) this.position += 1;
  }
}

function LatexMath({ source, display = false }: { source: string; display?: boolean }) {
  const cleaned = source.trim().replace(/^\\displaystyle\s*/, "");
  const nodes = new LatexParser(cleaned).parse();
  return (
    <span className={display ? "math-expression math-block" : "math-expression math-inline"}>
      <math display={display ? "block" : "inline"} aria-label={cleaned}>
        <mrow>{nodes}</mrow>
      </math>
    </span>
  );
}

function inlineContent(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\$\$[^$]+?\$\$|\\\([^\n]+?\\\)|\$[^$\n]+?\$|\*\*[^*]+?\*\*|`[^`]+?`|\*[^*\n]+?\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index}`;

    if (token.startsWith("$$")) nodes.push(<LatexMath key={key} source={token.slice(2, -2)} display />);
    else if (token.startsWith("\\(")) nodes.push(<LatexMath key={key} source={token.slice(2, -2)} />);
    else if (token.startsWith("$")) nodes.push(<LatexMath key={key} source={token.slice(1, -1)} />);
    else if (token.startsWith("**")) nodes.push(<strong key={key}>{inlineContent(token.slice(2, -2), `${key}-strong`)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else nodes.push(<em key={key}>{inlineContent(token.slice(1, -1), `${key}-em`)}</em>);

    lastIndex = pattern.lastIndex;
    index += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function isSpecialBlockStart(line: string) {
  const trimmed = line.trim();
  return !trimmed
    || trimmed.startsWith("```")
    || trimmed.startsWith("$$")
    || /^#{1,6}\s+/.test(trimmed)
    || /^[-*+]\s+/.test(trimmed)
    || /^\d+[.)]\s+/.test(trimmed)
    || trimmed.startsWith(">");
}

function renderBlocks(content: string) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let lineIndex = 0;
  let blockIndex = 0;

  while (lineIndex < lines.length) {
    const rawLine = lines[lineIndex];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      lineIndex += 1;
      continue;
    }

    const key = `message-block-${blockIndex}`;

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      lineIndex += 1;
      while (lineIndex < lines.length && !lines[lineIndex].trim().startsWith("```")) {
        codeLines.push(lines[lineIndex]);
        lineIndex += 1;
      }
      if (lineIndex < lines.length) lineIndex += 1;
      blocks.push(<pre key={key} data-language={language || undefined}><code>{codeLines.join("\n")}</code></pre>);
      blockIndex += 1;
      continue;
    }

    if (trimmed.startsWith("$$")) {
      const mathLines: string[] = [];
      let current = trimmed.slice(2);
      let closed = current.endsWith("$$");
      if (closed) current = current.slice(0, -2);
      if (current) mathLines.push(current);
      lineIndex += 1;
      while (!closed && lineIndex < lines.length) {
        current = lines[lineIndex].trim();
        closed = current.endsWith("$$");
        if (closed) current = current.slice(0, -2);
        mathLines.push(current);
        lineIndex += 1;
      }
      blocks.push(<LatexMath key={key} source={mathLines.join(" ")} display />);
      blockIndex += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length);
      const children = inlineContent(heading[2], `${key}-heading`);
      if (level === 1) blocks.push(<h1 key={key}>{children}</h1>);
      else if (level === 2) blocks.push(<h2 key={key}>{children}</h2>);
      else if (level === 3) blocks.push(<h3 key={key}>{children}</h3>);
      else blocks.push(<h4 key={key}>{children}</h4>);
      lineIndex += 1;
      blockIndex += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (lineIndex < lines.length && /^[-*+]\s+/.test(lines[lineIndex].trim())) {
        const item = lines[lineIndex].trim().replace(/^[-*+]\s+/, "");
        items.push(<li key={`${key}-item-${items.length}`}>{inlineContent(item, `${key}-item-${items.length}`)}</li>);
        lineIndex += 1;
      }
      blocks.push(<ul key={key}>{items}</ul>);
      blockIndex += 1;
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (lineIndex < lines.length && /^\d+[.)]\s+/.test(lines[lineIndex].trim())) {
        const item = lines[lineIndex].trim().replace(/^\d+[.)]\s+/, "");
        items.push(<li key={`${key}-item-${items.length}`}>{inlineContent(item, `${key}-item-${items.length}`)}</li>);
        lineIndex += 1;
      }
      blocks.push(<ol key={key}>{items}</ol>);
      blockIndex += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (lineIndex < lines.length && lines[lineIndex].trim().startsWith(">")) {
        quoteLines.push(lines[lineIndex].trim().replace(/^>\s?/, ""));
        lineIndex += 1;
      }
      blocks.push(<blockquote key={key}>{inlineContent(quoteLines.join(" "), `${key}-quote`)}</blockquote>);
      blockIndex += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    lineIndex += 1;
    while (lineIndex < lines.length && !isSpecialBlockStart(lines[lineIndex])) {
      paragraphLines.push(lines[lineIndex].trim());
      lineIndex += 1;
    }
    blocks.push(<p key={key}>{inlineContent(paragraphLines.join(" "), `${key}-paragraph`)}</p>);
    blockIndex += 1;
  }

  return blocks;
}

export function MessageContent({ content }: MessageContentProps) {
  return <div className="message-content">{renderBlocks(content)}</div>;
}
