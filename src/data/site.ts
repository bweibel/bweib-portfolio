/*
 * Site configuration — everything that isn't (or shouldn't be) driven by the
 * resume JSON. Values here take precedence for display. Sourced from info.md.
 */

export interface SocialLink {
  label: string;
  url: string;
  /** Brand icon rendered for the link (see SocialLinks). */
  icon: 'github' | 'linkedin';
}

export interface SiteConfig {
  /** Display name shown across the site. */
  name: string;
  /** Brand wordmark shown in the header. */
  logo: string;
  /** Professional role / title. */
  role: string;
  /** Optional short tagline; omitted when empty. */
  tagline?: string;
  /** About/Hero paragraph. */
  bio: string;
  /** Curated profile links, in display order. */
  socials: SocialLink[];
  /** SEO + canonical metadata. */
  url: string;
  seoTitle: string;
  seoDescription: string;
  /** Open Graph image path under /public (added later). */
  ogImage?: string;
}

export const site: SiteConfig = {
  name: 'Ben',
  logo: 'bweib',
  role: 'Web developer, maker, tinkerer, and collector of side projects.',
  bio: `I like building things. Sometimes that means websites and interactive experiences. Other times it's soldering together electronics, tinkering with microcontrollers, setting up servers, fixing old hardware, or chasing an idea down a rabbit hole just to see where it leads.`,
  socials: [
    { label: 'GitHub', url: 'https://github.com/bweibel', icon: 'github' },
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/ben-weibel-03994720/',
      icon: 'linkedin',
    },
  ],
  url: 'https://bweib.com',
  seoTitle: 'Ben Weibel - Full-Stack Developer',
  seoDescription: 'Portfolio of Ben, a full-stack developer. About, resume, and contact.',
};
