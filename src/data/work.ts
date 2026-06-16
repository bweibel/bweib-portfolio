/*
 * Selected work / case studies shown in the Portfolio section.
 *
 * These are placeholder entries — replace the title/summary/highlights with real
 * projects. Keep the array ordered newest-first; the section renders them in
 * order. Drop the `link`/`repo` fields when a project has nothing to link to.
 */

export interface CaseStudy {
  /** Project name / headline. */
  title: string;
  /** One-line description of what it is. */
  tagline: string;
  /** Your role on the project (e.g. "Solo build", "Lead developer"). */
  role: string;
  /** Year or range shown in the mono meta line (e.g. "2025"). */
  year: string;
  /** Tech / tools, shown as tags. */
  tags: string[];
  /** A few outcome-focused bullets: what you built and the impact. */
  highlights: string[];
  /** Optional live link. Omitted when absent. */
  link?: string;
  /** Optional source repository. Omitted when absent. */
  repo?: string;
}

export const caseStudies: CaseStudy[] = [
  {
    title: 'Project One',
    tagline: 'Short description of the project and the problem it solved.',
    role: 'Solo build',
    year: '2025',
    tags: ['Astro', 'TypeScript', 'CSS'],
    highlights: [
      'What you built and the key technical decision behind it.',
      'A measurable outcome or result, if you have one.',
    ],
    link: 'https://example.com',
    repo: 'https://github.com/bweibel/example',
  },
  {
    title: 'Project Two',
    tagline: 'Short description of the project and the problem it solved.',
    role: 'Lead developer',
    year: '2024',
    tags: ['Microcontrollers', 'Electronics', 'C'],
    highlights: [
      'What you built and the key technical decision behind it.',
      'A measurable outcome or result, if you have one.',
    ],
  },
  {
    title: 'Project Three',
    tagline: 'Short description of the project and the problem it solved.',
    role: 'Solo build',
    year: '2023',
    tags: ['Self-hosting', 'Linux', 'Networking'],
    highlights: [
      'What you built and the key technical decision behind it.',
      'A measurable outcome or result, if you have one.',
    ],
  },
];
