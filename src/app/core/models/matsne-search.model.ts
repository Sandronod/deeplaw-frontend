export type MatsneSearchScope = 'metadata' | 'title' | 'content' | 'number' | 'all';
export type MatsneSearchStatus = 'active' | 'repealed' | 'pending' | '';
export type MatsneSearchSort =
  | 'relevance'
  | 'latest'
  | 'oldest'
  | 'signing_latest'
  | 'signing_oldest'
  | 'title'
  | 'hierarchy';

export interface MatsneSearchParams {
  q?: string;
  scope?: MatsneSearchScope;
  status?: MatsneSearchStatus;
  doc_type?: string;
  issuer?: string;
  registration_code?: string;
  doc_number?: string;
  matsne_id?: string | number;
  domain?: string;
  language?: string;
  signing_from?: string;
  signing_to?: string;
  publish_from?: string;
  publish_to?: string;
  effective_at?: string;
  sort?: MatsneSearchSort;
  page?: number;
  per_page?: number;
}

export interface MatsneSearchMeta {
  query: string;
  scope: MatsneSearchScope;
  sort: MatsneSearchSort;
  page: number;
  per_page: number;
  total: number;
  last_page: number;
  total_is_exact: boolean;
  filters: Record<string, string | number | boolean>;
}

export interface MatsneSearchResult {
  matsne_id: number;
  title: string | null;
  doc_type: string | null;
  doc_number: string | null;
  registration_code: string | null;
  issuer: string | null;
  signing_date: string | null;
  publish_date: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  official_status: 'active' | 'repealed' | 'pending' | string;
  additional_status: string | null;
  official_topic: string | null;
  publication_source: string | null;
  available_languages: string[];
  domain: string | null;
  hierarchy_level: number | null;
  rank_score: number;
  metadata_fetched: boolean;
  url: string;
  excerpt: string;
}

export interface MatsneSearchResponse {
  meta: MatsneSearchMeta;
  results: MatsneSearchResult[];
}

export interface MatsneDocumentDetail extends Omit<MatsneSearchResult, 'rank_score' | 'excerpt'> {
  translation_links: Array<{
    label?: string;
    language?: string | null;
    mode?: string;
    url?: string;
    matsne_id?: number | null;
  }>;
  content: string;
  content_html?: string | null;
  content_source: 'document' | 'chunks' | 'missing' | string;
  content_mode?: 'html' | 'text' | string;
  content_format?: string;
  content_length: number;
  content_html_length?: number;
  raw_content_length?: number;
}
