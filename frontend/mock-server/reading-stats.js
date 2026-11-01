import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

const parser = unified().use(remarkParse).use(remarkGfm);

function readableText(node) {
  if (node.type === 'break') return ' ';
  if (node.type === 'html' || node.type === 'definition') return '';
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? '';
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') return node.value;
  const separator = ['paragraph', 'heading', 'link', 'linkReference', 'emphasis', 'strong', 'delete'].includes(node.type) ? '' : ' ';
  return (node.children ?? []).map(readableText).join(separator);
}

export function readingStats(markdown) {
  const words = readableText(parser.parse(markdown)).match(/\S+/gu)?.length ?? 0;
  return { words, readMinutes: Math.max(1, Math.ceil(words / 230)) };
}
