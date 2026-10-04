/** Draft cross-reference article — edit copy here; modal renders from this file. */

export type ArticleBlock =
  | { type: 'p'; html: string }
  | { type: 'h2'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'ul'; items: { lead: string; rest: string }[] }
  | { type: 'figure'; which: 'discord' | 'telemetry' | 'devday' };

export const TOKEN_GAP_ARTICLE: ArticleBlock[] = [
  {
    type: 'p',
    html:
      '<strong>TL;DR:</strong> Umans AI’s <a href="https://blog.umans.ai/blog/the-token-gap/" target="_blank" rel="noopener noreferrer"><em>The Token Gap</em></a> opens with a developer who ran ~11B tokens in one day on their platform. That’s my account (<code>mintychochip</code>). Their post is the infrastructure story; this is what was happening on my machine that weekend.',
  },
  { type: 'h2', text: 'How I found out I was the opening anecdote' },
  {
    type: 'p',
    html:
      'A friend sent me the Umans article. I skimmed the DevDay wall bit, nodded, kept scrolling — then hit the line about <em>one user</em> and nearly eleven billion tokens in twenty-four hours.',
  },
  {
    type: 'p',
    html:
      'I pulled up my own dashboard. Same shape. Same weekend. Same stupidly high cache line.',
  },
  {
    type: 'p',
    html:
      'So yeah: if you read that essay and wondered who burns that much in a day — <strong>hi. It was me.</strong>',
  },
  {
    type: 'quote',
    text:
      'Eight months later, this June, we watched a single user on Umans AI run nearly eleven billion tokens in a single day.',
  },
  { type: 'figure', which: 'devday' },
  {
    type: 'p',
    html:
      'The telemetry they screenshot in section one is my production usage from June 28–29, 2026. They wrote about GPU supply, token demand, and KV cache economics from the provider side. I’m writing the other half: autonomous agents, repo-scale context, and the Discord message where I realized the counter wasn’t a bug.',
  },
  { type: 'h2', text: 'Discord, before it was a case study' },
  {
    type: 'p',
    html:
      'Saturday June 28 I was already at ~10B tokens and ~50k requests. I thought that was the peak. I posted in Discord because it felt unreal:',
  },
  { type: 'figure', which: 'discord' },
  {
    type: 'p',
    html:
      'Sunday kept going. Pipelines didn’t wind down — refactors, tests, more agent loops. By the time the day rolled over I was at <strong>10,950.8M input tokens</strong> and <strong>53,248</strong> API calls. I typed “BUST” because what else do you type.',
  },
  { type: 'h2', text: 'What Umans published' },
  {
    type: 'p',
    html:
      'Weeks later their team published <em>The Token Gap</em> — demand growing faster than compute can follow — and used my curve as the “this is real usage now” example:',
  },
  { type: 'figure', which: 'telemetry' },
  {
    type: 'p',
    html:
      'I’m not quoted by name in their piece (and that’s fine). This page is the cross-reference: their analysis ↔ my lived run.',
  },
  { type: 'h2', text: 'What I was actually doing' },
  {
    type: 'p',
    html:
      'Nobody hand-types eleven billion tokens. This wasn’t a chat thread. It was <strong>closed-loop agentic coding</strong> — tools, terminals, tests, repeat.',
  },
  {
    type: 'ul',
    items: [
      {
        lead: 'Huge static context every turn.',
        rest:
          'Whole-repo context, diagnostics, search hits — hundreds of thousands of tokens per step to change a handful of lines.',
      },
      {
        lead: 'Agents that keep going.',
        rest:
          'Run tests, read failures, patch, run again — dozens of iterations per task without me approving each step.',
      },
      {
        lead: 'Parallelism.',
        rest: 'Multiple repos and workstreams at once → tens of thousands of requests in a single day.',
      },
    ],
  },
  {
    type: 'p',
    html:
      'I track this kind of usage in my own tooling (see <a href="#projects">projects</a> on this site). The Umans chart is the vendor view; my <a href="#usage">token usage section</a> is the ongoing live version.',
  },
  { type: 'h2', text: 'Why the 99% cache line matters' },
  {
    type: 'p',
    html:
      'The number everyone repeats is 10.95B. The number that made the day <em>possible</em> is <strong>99% cache hit rate</strong>.',
  },
  {
    type: 'p',
    html:
      'Agent loops re-send almost the same prefix every turn — system prompt, tools, repo snapshot — with tiny diffs. Without prefix / KV caching, the same day is either unaffordable or physically impossible on shared inference.',
  },
  {
    type: 'p',
    html:
      'Umans is right that agentic scale is increasingly a <em>cache and prefill routing</em> problem. I felt that on the bill and on the latency graph, not in a whitepaper.',
  },
  { type: 'h2', text: 'Where I land on “the gap”' },
  {
    type: 'p',
    html:
      'Their thesis: token appetite is outrunning how fast we can add compute. My weekend was a datapoint, not a flex — one engineer compressing a “lifetime on the DevDay wall” milestone into a single day changes how you think about capacity planning.',
  },
  {
    type: 'p',
    html:
      'Read their article for the macro picture. Read this if you want the footnote that says <em>that user was me</em>.',
  },
  {
    type: 'p',
    html: 'Questions or “how did you actually wire the agents?” — <a href="#contact">contact</a> works.',
  },
];
