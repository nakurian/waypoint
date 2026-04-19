export interface PackYaml {
  name: string;
  version: string;
  extends?: 'ibs-core' | null;
  vertical: 'core' | 'cruise' | 'ota' | 'airline' | 'hotel';
  owner?: string | null;
  description: string;
  status?: 'experimental' | 'active' | 'deprecated';
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  aliases?: string[];
}

export interface Service {
  name: string;
  purpose: string;
  techStack?: string[];
}

export interface Pattern {
  name: string;
  when: string;
  why: string;
}

export interface Entity {
  name: string;
  description: string;
}

export interface Pack {
  meta: PackYaml;
  glossary: GlossaryTerm[];
  services: Service[];
  patterns: Pattern[];
  entities: Entity[];
}

export interface DomainBundle {
  /** Names of packs composed in order: ['ibs-core', 'cruise'] */
  sources: string[];
  glossary: GlossaryTerm[];
  services: Service[];
  patterns: Pattern[];
  entities: Entity[];
}
