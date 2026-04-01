import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBar } from '../tui/StatusBar.js';

describe('StatusBar', () => {
  it('shows mode and title', () => {
    const { lastFrame } = render(
      <StatusBar mode="normal" title="My Note" dirty={false} />
    );
    const output = lastFrame()!;
    expect(output).toContain('NORMAL');
    expect(output).toContain('My Note');
  });

  it('shows dirty flag', () => {
    const { lastFrame } = render(
      <StatusBar mode="insert" title="Editing" dirty={true} />
    );
    const output = lastFrame()!;
    expect(output).toContain('INSERT');
    expect(output).toContain('[+]');
  });

  it('shows shortcut hints', () => {
    const { lastFrame } = render(
      <StatusBar mode="normal" title="Test" dirty={false} />
    );
    const output = lastFrame()!;
    expect(output).toContain('save');
    expect(output).toContain('quit');
  });
});
