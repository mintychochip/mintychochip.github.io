export interface ChartTheme {
  background: string;
  foreground: string;
  grid: string;
  axis: string;
  tokenColors: Record<'input_tokens' | 'output_tokens' | 'total_tokens', string>;
  costColors: Record<'estimated_cost_usd', string>;
}

const light: ChartTheme = {
  background: 'transparent',
  foreground: '#1f2937',
  grid: '#d1d5db',
  axis: '#6b7280',
  tokenColors: {
    input_tokens: '#2563eb',
    output_tokens: '#16a34a',
    total_tokens: '#7c3aed',
  },
  costColors: {
    estimated_cost_usd: '#ea580c',
  },
};

const dark: ChartTheme = {
  background: '#111827',
  foreground: '#f3f4f6',
  grid: '#374151',
  axis: '#9ca3af',
  tokenColors: {
    input_tokens: '#60a5fa',
    output_tokens: '#4ade80',
    total_tokens: '#a78bfa',
  },
  costColors: {
    estimated_cost_usd: '#fb923c',
  },
};

export function getChartTheme(mode: 'light' | 'dark'): ChartTheme {
  return mode === 'dark' ? dark : light;
}
