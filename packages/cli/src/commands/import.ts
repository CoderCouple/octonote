import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { saveNote } from '../utils/saveNote.js';

export function registerImportCommand(program: Command, container: Container): void {
  program
    .command('import <file>')
    .description('Import a markdown file as a note')
    .option('-f, --folder <folderId>', 'Place in folder')
    .action(async (file: string, opts: { folder?: string }) => {
      const { vaultManager, noteRepository } = container;
      const { note: partial, blocks } = vaultManager.importFromMarkdown(file);

      const title = partial.title || 'Untitled';
      const folderId = opts.folder || partial.folderId || null;
      const fmt = partial.storageFmt || 'json';

      const note = await noteRepository.createNote(title, { folderId, storageFmt: fmt });

      // Create blocks in DB
      for (const block of blocks) {
        await noteRepository.createBlock({
          noteId: note.id,
          type: block.type,
          content: block.content,
          meta: block.meta,
          position: block.position,
          parentId: block.parentId,
        });
      }

      // Handle tags from frontmatter
      if (partial.tags) {
        // Tags come from frontmatter as Tag[] but might be string[]
        for (const tag of partial.tags as any[]) {
          const name = typeof tag === 'string' ? tag : tag.name;
          await noteRepository.addTagToNote(note.id, name);
        }
      }

      // Full note with blocks for save
      const fullNote = (await noteRepository.getNote(note.id))!;
      await saveNote(container, fullNote, fullNote.blocks || []);

      console.log(`Imported "${chalk.bold(title)}" (${note.id})`);
    });
}
