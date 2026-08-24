// =============================================================================
// ModalBase regressions (2026-08-24 audit, §2.B9 + C2)
// - Body scroll lock must survive nesting (Item modal → Smart Paste modal)
// - Title ids must be unique per instance, and the dialog must be labelled
//   by its ModalHeader title even when Modal's own `title` prop is omitted
//   (which is how ~16 of 18 call sites use it)
// =============================================================================

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { Modal, ModalHeader } from '../modals/ModalBase.jsx';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

const noop = () => {};

describe('body scroll lock', () => {
  it('keeps the parent locked when a nested modal closes', async () => {
    const outer = render(
      <Modal onClose={noop}>
        <ModalHeader title="Outer" onClose={noop} />
      </Modal>,
    );
    const inner = render(
      <Modal onClose={noop}>
        <ModalHeader title="Inner" onClose={noop} />
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    // Closing the nested modal used to restore scrolling behind the
    // still-open parent
    inner.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    outer.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('dialog labelling', () => {
  it('gives nested modals unique title ids', () => {
    render(
      <>
        <Modal onClose={noop}>
          <ModalHeader title="First" onClose={noop} />
        </Modal>
        <Modal onClose={noop}>
          <ModalHeader title="Second" onClose={noop} />
        </Modal>
      </>,
    );
    const headings = document.querySelectorAll('h3[id]');
    expect(headings).toHaveLength(2);
    expect(headings[0].id).not.toBe(headings[1].id);
    // The hardcoded duplicate is gone
    expect(document.querySelectorAll('#modal-title')).toHaveLength(0);
  });

  it('labels the dialog from its ModalHeader even without Modal `title`', async () => {
    render(
      <Modal onClose={noop}>
        <ModalHeader title="Check Out Item" onClose={noop} />
      </Modal>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    await waitFor(() => {
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(document.getElementById(labelledBy)).toHaveTextContent('Check Out Item');
    });
  });

  it('falls back to aria-label when only Modal `title` is provided', () => {
    render(
      <Modal onClose={noop} title="Bare Dialog">
        <p>content</p>
      </Modal>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-label')).toBe('Bare Dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBeNull();
  });
});
