/*
 * Resume data — sourced from a JSON Resume file (https://jsonresume.org).
 *
 * `resume.json` is currently a schema-matching PLACEHOLDER. Ben will drop his
 * real JSON Resume export in its place; because we type against the standard
 * schema below, swapping the file in requires no code changes.
 *
 * The interfaces cover only the subset of the JSON Resume schema this site
 * renders. Unused fields in the source file are simply ignored.
 */
import resumeData from './resume.json';

export interface ResumeProfile {
  network: string;
  username?: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  label?: string;
  email?: string;
  summary?: string;
  location?: {
    city?: string;
    region?: string;
    countryCode?: string;
  };
  profiles?: ResumeProfile[];
}

export interface WorkItem {
  /** Company / organisation name. */
  name: string;
  position: string;
  url?: string;
  /** ISO date, e.g. "2021-03". */
  startDate: string;
  /** ISO date; omit or empty string means "present". */
  endDate?: string;
  location?: string;
  summary?: string;
  highlights?: string[];
}

export interface EducationItem {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
}

export interface SkillGroup {
  /** Group label, e.g. "Languages". */
  name: string;
  level?: string;
  keywords?: string[];
}

export interface Resume {
  basics: ResumeBasics;
  work: WorkItem[];
  education: EducationItem[];
  skills: SkillGroup[];
}

export const resume = resumeData as Resume;
