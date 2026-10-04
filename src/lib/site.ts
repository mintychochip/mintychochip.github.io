export const site = {
  name: 'mintychochip',
  intro: 'Software engineer.',
  githubUser: 'mintychochip',
  github: 'https://github.com/mintychochip',
  email: 'justincarllo@gmail.com',
  resumeUrl: '/resume.pdf',
  resumeFile: 'mintychochip-resume.pdf',
  nav: [
    { label: 'github', href: '#github' },
    { label: 'usage', href: '#usage' },
    { label: 'projects', href: '#projects' },
    { label: 'resume', href: '#resume' },
    { label: 'contact', href: '#contact' },
  ],
  /** Repos whose card should open a live site instead of GitHub. */
  projectUrls: { ModularJobs: 'https://jobs.mintychochip.dev' } as Record<string, string>,
};
