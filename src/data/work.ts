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
    title: 'Panopticorp (Neotropolis)',
    tagline: 'Fictional Evil surveillance corporation immersive installation for a cyberpunk event.',
    role: 'Solo build',
    year: '2026',
    tags: ['Microcontrollers', 'Typescript', '3d Printing','Electronics'],
    highlights: [
      'Developed as an interactive art piece for Neotropolis, a cyberpunk themed event',
      'Included an in-theme art car',
      'Sound/Motion Reactive LED lighting',
      'Hosted local webserver and website on-premise, with interactive elements and storytelling'
    ],
    link: 'https://panopticorp.online/',
    repo: 'https://github.com/bweibel/neotropolis-panopticorp',
  },
  {
    title: 'Beverage Tracker',
    tagline: 'Web App Tracker for Beer/Wine festivals',
    role: 'Lead developer',
    year: '2026',
    tags: ['Javascript', 'PWA', 'CSS'],
    highlights: [
      'Mobile Friendly tracker for beverages.',
      'Allows users to mark as tasted, favorited, or wishlisted.',
      'Real time filtering, using styles, breweries, or search',
      'Allows easy updating of hundreds of entries for event runners.',
    ],
    link: 'https://winterwarmerfest.com/beer-list',
    repo: 'https://github.com/bweibel/bweib-beer-list',
  },
  {
    title: 'TI-99 CyberDeck',
    tagline: 'Functional Cyberdeck prop, built into the shell of a TI-99',
    role: 'Solo build',
    year: '2025',
    tags: ['Hardware', 'Linux', '3d Printing'],
    highlights: [
      'Rasberry Pi 4 powered cyberdeck prop',
      'Runs a full Linux distro (Debian)',
      'Reactive lighting driven by additional microcontrollers',
      'SDR unit for radio frequency monitoring'
    ],
  },
];
