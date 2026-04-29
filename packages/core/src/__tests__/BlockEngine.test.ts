import { describe, it, expect } from 'vitest';
import { BlockEngine } from '../engine/BlockEngine';
import { BlockType } from '../models/types';

describe('BlockEngine', () => {
  const engine = new BlockEngine();

  describe('parseMarkdown', () => {
    it('parses headings', () => {
      const { blocks } = engine.parseMarkdown('# Hello\n\n## World');
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe(BlockType.Heading);
      expect(blocks[0].content).toBe('Hello');
      expect(blocks[0].meta.level).toBe(1);
      expect(blocks[1].meta.level).toBe(2);
    });

    it('parses paragraphs', () => {
      const { blocks } = engine.parseMarkdown('Some text here.');
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe(BlockType.Paragraph);
      expect(blocks[0].content).toBe('Some text here.');
    });

    it('parses bullet lists', () => {
      const { blocks } = engine.parseMarkdown('- Item A\n- Item B');
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe(BlockType.Bullet);
      expect(blocks[0].content).toBe('Item A');
    });

    it('parses numbered lists', () => {
      const { blocks } = engine.parseMarkdown('1. First\n2. Second');
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe(BlockType.Numbered);
    });

    it('parses todo items', () => {
      const { blocks } = engine.parseMarkdown('- [x] Done\n- [ ] Pending');
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe(BlockType.Todo);
      expect(blocks[0].meta.checked).toBe(true);
      expect(blocks[1].meta.checked).toBe(false);
    });

    it('parses code blocks', () => {
      const { blocks } = engine.parseMarkdown('```ts\nconst x = 1;\n```');
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe(BlockType.Code);
      expect(blocks[0].content).toBe('const x = 1;');
      expect(blocks[0].meta.lang).toBe('ts');
    });

    it('parses blockquotes', () => {
      const { blocks } = engine.parseMarkdown('> A wise quote');
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe(BlockType.Quote);
    });

    it('parses dividers', () => {
      // Use *** since --- alone is parsed as frontmatter by gray-matter
      const { blocks } = engine.parseMarkdown('Text before\n\n---\n\nText after');
      const dividers = blocks.filter(b => b.type === BlockType.Divider);
      expect(dividers.length).toBe(1);
    });

    it('parses tables', () => {
      const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
      const { blocks } = engine.parseMarkdown(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe(BlockType.Table);
      const rows = JSON.parse(blocks[0].content);
      expect(rows).toEqual([['A', 'B'], ['1', '2']]);
    });

    it('handles frontmatter', () => {
      const md = '---\ntitle: My Note\ntags:\n  - work\n---\n\nContent here.';
      const { blocks, frontmatter } = engine.parseMarkdown(md);
      expect(frontmatter.title).toBe('My Note');
      expect(blocks[0].type).toBe(BlockType.Paragraph);
      expect(blocks[0].content).toBe('Content here.');
    });
  });

  describe('serializeToMarkdown', () => {
    it('roundtrips headings', () => {
      const md = '# Title';
      const { blocks } = engine.parseMarkdown(md);
      const output = engine.serializeToMarkdown(blocks);
      expect(output.trim()).toBe('# Title');
    });

    it('roundtrips code blocks', () => {
      const md = '```js\nconsole.log("hi");\n```';
      const { blocks } = engine.parseMarkdown(md);
      const output = engine.serializeToMarkdown(blocks);
      expect(output).toContain('```js');
      expect(output).toContain('console.log("hi");');
    });

    it('roundtrips todo items', () => {
      const md = '- [x] Done\n- [ ] Not done';
      const { blocks } = engine.parseMarkdown(md);
      const output = engine.serializeToMarkdown(blocks);
      expect(output).toContain('- [x] Done');
      expect(output).toContain('- [ ] Not done');
    });

    it('includes frontmatter when provided', () => {
      const { blocks } = engine.parseMarkdown('Hello world');
      const output = engine.serializeToMarkdown(blocks, { title: 'Test' });
      expect(output).toContain('title: Test');
      expect(output).toContain('Hello world');
    });
  });

  describe('diagram blocks', () => {
    it('parses mermaid code blocks as Diagram type', () => {
      const md = '```mermaid\ngraph TD\n  A --> B\n```';
      const { blocks } = engine.parseMarkdown(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe(BlockType.Diagram);
      expect(blocks[0].content).toBe('graph TD\n  A --> B');
      expect(blocks[0].meta.syntax).toBe('mermaid');
      expect(blocks[0].meta.diagramType).toBe('flowchart');
    });

    it('preserves non-mermaid code blocks as Code type', () => {
      const md = '```js\nconst x = 1;\n```';
      const { blocks } = engine.parseMarkdown(md);
      expect(blocks[0].type).toBe(BlockType.Code);
    });

    it('roundtrips diagram blocks through serialization', () => {
      const md = '```mermaid\nsequenceDiagram\n  A->>B: Hello\n```';
      const { blocks } = engine.parseMarkdown(md);
      expect(blocks[0].type).toBe(BlockType.Diagram);

      const output = engine.serializeToMarkdown(blocks);
      expect(output).toContain('```mermaid');
      expect(output).toContain('sequenceDiagram');
      expect(output).toContain('A->>B: Hello');

      // Re-parse should produce same block type
      const { blocks: reparsed } = engine.parseMarkdown(output);
      expect(reparsed[0].type).toBe(BlockType.Diagram);
      expect(reparsed[0].meta.diagramType).toBe('sequence');
    });

    it('infers correct diagram types', () => {
      const cases: Array<{ content: string; expected: string }> = [
        { content: 'graph TD\n  A --> B', expected: 'flowchart' },
        { content: 'flowchart LR\n  A --> B', expected: 'flowchart' },
        { content: 'sequenceDiagram\n  A->>B: msg', expected: 'sequence' },
        { content: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places', expected: 'er' },
        { content: 'gantt\n  title A Gantt', expected: 'gantt' },
        { content: 'classDiagram\n  Class01 <|-- Class02', expected: 'class' },
        { content: 'stateDiagram-v2\n  [*] --> Active', expected: 'state' },
        { content: 'pie\n  "A" : 30', expected: 'pie' },
        { content: 'mindmap\n  root((mind))', expected: 'mindmap' },
        { content: 'timeline\n  2024 : Event', expected: 'timeline' },
        { content: 'gitgraph\n  commit', expected: 'gitgraph' },
        { content: 'unknown\n  stuff', expected: 'diagram' },
      ];

      for (const { content, expected } of cases) {
        const md = '```mermaid\n' + content + '\n```';
        const { blocks } = engine.parseMarkdown(md);
        expect(blocks[0].meta.diagramType).toBe(expected);
      }
    });

    it('renders diagram blocks for terminal', () => {
      const md = '```mermaid\ngraph TD\n  A --> B\n```';
      const { blocks } = engine.parseMarkdown(md);
      const output = engine.renderForTerminal(blocks);
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('renderForTerminal', () => {
    it('renders without throwing', () => {
      const md = '# Heading\n\nParagraph\n\n- Bullet\n\n- [x] Todo\n\n```js\ncode\n```\n\n> Quote\n\n---';
      const { blocks } = engine.parseMarkdown(md);
      const output = engine.renderForTerminal(blocks);
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
