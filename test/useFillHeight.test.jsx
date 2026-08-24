// =============================================================================
// useFillHeight — the window height left below an element, floored.
// =============================================================================
import { describe, it, expect, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useFillHeight } from '../hooks/useFillHeight.js';

function Probe({ enabled = true, min = 0, top = 0 }) {
  const ref = useRef(null);
  const height = useFillHeight(ref, { enabled, min });
  return (
    <main style={{ paddingBottom: '32px' }}>
      <div
        ref={(el) => {
          if (el) el.getBoundingClientRect = () => ({ top, bottom: top, height: 0 });
          ref.current = el;
        }}
        data-testid="probe"
        data-height={height === null ? 'null' : height}
      />
    </main>
  );
}

const originalHeight = window.innerHeight;
afterEach(() => {
  window.innerHeight = originalHeight;
});

describe('useFillHeight', () => {
  it('measures window − element top − <main> bottom padding', () => {
    window.innerHeight = 1000;
    const { getByTestId } = render(<Probe top={300} />);
    expect(getByTestId('probe').dataset.height).toBe('668');
  });

  it('floors the answer at min', () => {
    window.innerHeight = 500;
    const { getByTestId } = render(<Probe top={300} min={720} />);
    expect(getByTestId('probe').dataset.height).toBe('720');
  });

  it('is null while disabled', () => {
    window.innerHeight = 1000;
    const { getByTestId } = render(<Probe enabled={false} />);
    expect(getByTestId('probe').dataset.height).toBe('null');
  });

  it('re-measures when the window resizes', () => {
    window.innerHeight = 1000;
    const { getByTestId } = render(<Probe top={100} />);
    expect(getByTestId('probe').dataset.height).toBe('868');
    act(() => {
      window.innerHeight = 700;
      window.dispatchEvent(new Event('resize'));
    });
    expect(getByTestId('probe').dataset.height).toBe('568');
  });
});
