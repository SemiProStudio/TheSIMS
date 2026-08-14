// =============================================================================
// Chart primitives — render-level checks: empty states never NaN, aria
// labels present, values land in the DOM
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonutChart, HBarChart, ColumnChart, TrendChart, Sparkline } from '../components/charts.jsx';

describe('DonutChart', () => {
  const data = [
    { label: 'Available', value: 12, color: 'var(--status-available)' },
    { label: 'Checked Out', value: 4, color: 'var(--status-checked-out)' },
  ];

  it('renders total in the center and a legend with values', () => {
    render(<DonutChart data={data} centerLabel="items" />);
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('exposes an aria-label image role', () => {
    render(<DonutChart data={data} ariaLabel="Status breakdown" />);
    expect(screen.getByRole('img', { name: 'Status breakdown' })).toBeInTheDocument();
  });

  it('zero-total data renders an em-dash center, no NaN anywhere', () => {
    const { container } = render(
      <DonutChart data={[{ label: 'None', value: 0, color: 'red' }]} />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('NaN');
  });
});

describe('HBarChart', () => {
  it('renders labels, values, and proportional widths', () => {
    const { container } = render(
      <HBarChart
        data={[
          { label: 'Cameras', value: 100 },
          { label: 'Audio', value: 50 },
        ]}
        formatValue={(v) => `$${v}`}
      />,
    );
    expect(screen.getByText('Cameras')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(container.innerHTML).toContain('width: 100%');
    expect(container.innerHTML).toContain('width: 50%');
  });

  it('all-zero data renders 0% widths, not NaN', () => {
    const { container } = render(<HBarChart data={[{ label: 'Empty', value: 0 }]} />);
    expect(container.innerHTML).toContain('width: 0%');
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('paired bars render the secondary value inline', () => {
    render(
      <HBarChart
        data={[{ label: 'Cameras', value: 700, secondaryValue: 1000 }]}
        formatValue={(v) => `$${v}`}
      />,
    );
    expect(screen.getByText(/\/ \$1000/)).toBeInTheDocument();
  });
});

describe('ColumnChart', () => {
  it('renders one column per bucket with tooltips', () => {
    const { container } = render(
      <ColumnChart
        data={[
          { label: 'Mon', value: 3 },
          { label: 'Tue', value: 0 },
        ]}
        ariaLabel="By day"
      />,
    );
    expect(screen.getByRole('img', { name: 'By day' })).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(2);
    expect(container.querySelector('title').textContent).toBe('Mon: 3');
    expect(container.innerHTML).not.toContain('NaN');
  });
});

describe('TrendChart', () => {
  it('renders line, area, and point tooltips for small series', () => {
    const { container } = render(
      <TrendChart
        data={[
          { label: 'Jul', value: 2 },
          { label: 'Aug', value: 5 },
        ]}
        ariaLabel="Trend"
      />,
    );
    expect(screen.getByRole('img', { name: 'Trend' })).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(2); // area + line
    expect(container.querySelectorAll('circle')).toHaveLength(2);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('empty series renders axes only, no NaN paths', () => {
    const { container } = render(<TrendChart data={[]} ariaLabel="Empty" />);
    expect(container.querySelectorAll('path')).toHaveLength(0);
    expect(container.innerHTML).not.toContain('NaN');
  });
});

describe('Sparkline', () => {
  it('renders a line for a multi-point series', () => {
    const { container } = render(<Sparkline data={[1, 3, 2]} ariaLabel="Weekly" />);
    expect(screen.getByRole('img', { name: 'Weekly' })).toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('a single point renders a dot instead of a degenerate path', () => {
    const { container } = render(<Sparkline data={[4]} />);
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });
});
