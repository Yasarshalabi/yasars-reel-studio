// English interface for the review editor. The editor's own words are written in Arabic in the components; when the
// creator's profile language is English, this layer swaps each interface string for its English entry in en.json as
// it reaches the page. Only exact interface strings (and their templates, with the values inside kept as they are)
// are replaced, so a creator's words, captions and the video preview are never touched.
import dictionary from "./en.json" with { type: "json" };

type Pattern = { re: RegExp; slots: number[]; english: string; weight: number };

const ARABIC = /[؀-ۿ]/;
const SKIP_TAGS = new Set(["INPUT", "TEXTAREA", "SCRIPT", "STYLE", "CANVAS", "SVG"]);
const ATTRIBUTES = ["title", "aria-label", "placeholder", "alt"] as const;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildTranslator(entries: Record<string, string>) {
  const exact = new Map<string, string>();
  const patterns: Pattern[] = [];
  for (const [arabic, english] of Object.entries(entries)) {
    if (!/\{\d+\}/.test(arabic)) { exact.set(arabic, english); continue; }
    const slots: number[] = [];
    const source = arabic.split(/(\{\d+\})/).map((part) => {
      const slot = /^\{(\d+)\}$/.exec(part);
      if (!slot) return escape(part);
      slots.push(Number(slot[1]));
      return "([\\s\\S]+?)";
    }).join("");
    patterns.push({ re: new RegExp(`^${source}$`), slots, english, weight: arabic.replace(/\{\d+\}/g, "").length });
  }
  // The most specific template first, so "{0} كلمة · {1} جملة" wins over "{0} كلمة".
  patterns.sort((a, b) => b.weight - a.weight);

  const translate = (text: string): string | null => {
    if (!ARABIC.test(text)) return null;
    const lead = /^\s*/.exec(text)![0], trail = /\s*$/.exec(text)![0];
    const core = text.slice(lead.length, text.length - trail.length);
    const direct = exact.get(core);
    if (direct !== undefined) return lead + direct + trail;
    for (const pattern of patterns) {
      const match = pattern.re.exec(core);
      if (!match) continue;
      const values = new Map<number, string>();
      pattern.slots.forEach((slot, index) => {
        const value = match[index + 1];
        values.set(slot, exact.get(value.trim()) ?? value); // a value that is itself an interface word is translated too
      });
      return lead + pattern.english.replace(/\{(\d+)\}/g, (_, n) => values.get(Number(n)) ?? "") + trail;
    }
    return null;
  };
  return { translate, size: exact.size + patterns.length };
}

const skipped = (node: Node | null): boolean => {
  for (let at: Node | null = node; at; at = at.parentNode) {
    if (!(at instanceof Element)) continue;
    if (SKIP_TAGS.has(at.tagName.toUpperCase()) || at.hasAttribute("data-no-translate") || (at as HTMLElement).isContentEditable) return true;
  }
  return false;
};

/** Translates the interface under `root` now and on every later change. Returns a function that stops it. */
export function installEnglishInterface(root: HTMLElement, entries: Record<string, string> = dictionary as Record<string, string>) {
  const { translate } = buildTranslator(entries);
  const textNode = (node: Text) => {
    if (!node.nodeValue || skipped(node.parentNode)) return;
    const english = translate(node.nodeValue);
    if (english !== null && english !== node.nodeValue) node.nodeValue = english;
  };
  const element = (el: Element) => {
    if (skipped(el)) return;
    // Panels written right to left read left to right in English; Arabic text inside them still shapes correctly.
    if (el.getAttribute("dir") === "rtl" && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") el.setAttribute("dir", "ltr");
    for (const name of ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (!value) continue;
      const english = translate(value);
      if (english !== null && english !== value) el.setAttribute(name, english);
    }
    if (el.tagName === "OPTION" && el.textContent) {
      const english = translate(el.textContent);
      if (english !== null) el.textContent = english;
    }
  };
  const walk = (start: Node) => {
    if (start.nodeType === Node.TEXT_NODE) { textNode(start as Text); return; }
    if (!(start instanceof Element)) return;
    element(start);
    const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) textNode(node as Text); else element(node as Element);
    }
  };
  walk(root);
  // Dialogs and popovers can be portalled anywhere under <body>, so watch the whole subtree.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") textNode(record.target as Text);
      else if (record.type === "attributes") element(record.target as Element);
      else record.addedNodes.forEach(walk);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES, "dir"] });
  return () => observer.disconnect();
}

export const interfaceLanguage = (): "ar" | "en" => (document.documentElement.dataset.ui === "en" ? "en" : "ar");
