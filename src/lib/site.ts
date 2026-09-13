export interface SiteConfig {
  name: string;
  avatar: string;
  role: string;
  tagline: string;
  bio: string;
  nav: { label: string; href: string }[];
  projects: { name: string; description: string; url: string }[];
  projectUrls: Record<string, string>;
  contact: { github: string; email: string };
  resumeUrl: string;
  footer: string;
}

export const site: SiteConfig = {
  name: 'mintychochip',
  avatar: 'https://avatars.githubusercontent.com/u/98988617?v=4',
  role: 'Software engineer',
  tagline: 'Building calm, thoughtful software at the edge of the web.',
  bio: 'I design and build software that feels quiet on the outside and sharp underneath. I care about clean systems, readable code, and interfaces that respect attention.',
  nav: [
    { label: 'About', href: '#about' },
    { label: 'Resume', href: '#resume' },
    { label: 'Projects', href: '#projects' },
    { label: 'Contact', href: '#contact' },
  ],
  projects: [
    { name: 'Terminal editor', description: 'A zero-config terminal UI that does one thing well.', url: 'https://github.com' },
    { name: 'Waveform', description: 'A real-time waveform renderer with a calm, low-latency canvas pipeline.', url: 'https://github.com' },
    { name: 'Sun grid', description: 'A synthwave scene generator with retro suns and perspective grids.', url: 'https://github.com' },
  ],
  projectUrls: { ModularJobs: 'https://jobs.mintychochip.dev' },
  contact: { github: 'https://github.com/mintychochip', email: 'justincarllo@gmail.com' },
  resumeUrl: '/resume.pdf',
  footer: '© 2026 mintychochip',
};
