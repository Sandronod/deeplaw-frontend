export type MessageRole      = 'user' | 'assistant' | 'system';
export type ConfidenceLevel  = 'high' | 'medium' | 'low' | 'none';
export type AnswerMode       = 'find' | 'summarize' | 'compare' | 'explain' | 'advise' | 'chat';
export type MessageStatus    = 'loading' | 'streaming' | 'done' | 'error';
export type StreamPhase      =
  | 'preparing'
  | 'triage'
  | 'query_normalizing'
  | 'case_retrieval'
  | 'law_lookup'
  | 'echr_lookup'
  | 'comparative_lookup'
  | 'reranking'
  | 'authority_check'
  | 'context_building'
  | 'writing'
  | 'validating'
  | 'finalizing';

// ── Citation types ────────────────────────────────────────────────────────────

export interface Citation {
  case_id: number;
  case_num: string | null;
  case_date: string | null;
  court: string | null;
  chamber: string | null;
  category: string | null;
  dispute_subject: string | null;
  result: string | null;
  relevance_score: number | null;
  semantic_relevance_score?: number | null;
  semantic_relevance_confidence?: string | null;
  ranking_explanation?: string | null;
  answer_role?: 'primary' | 'supporting' | string | null;
  answer_role_label?: string | null;
  answer_rank?: number | null;
  case_type: string | null;
  url: string | null;
}

export interface LawCitation {
  type: 'law';
  law_id: number;
  article_id: number;
  title: string;
  article_num: string;
  article_title: string;
  excerpt: string;
  similarity: number;
  url: string;
}

export interface MatsneCitation {
  type: 'matsne';
  matsne_id: number;
  title: string;
  article_num?: number | null;
  doc_type: string | null;
  issuer: string | null;
  is_active: boolean;
  effective_from_year: number | null;
  effective_to_year: number | null;
  excerpt: string;
  similarity: number;
  url: string;
}

export interface EuCitation {
  type: 'eu';
  cellar_id: string;
  doc_type: string;
  source: 'legislation' | 'case_law';
  court: string | null;
  case_num: string | null;
  title: string | null;
  doc_date: string | null;
  excerpt: string;
  similarity: number;
  url: string | null;
}

export interface GermanCitation {
  type: 'german';
  case_id: number;
  external_id: string | null;
  court_name: string | null;
  level_of_appeal: string | null;
  jurisdiction: string | null;
  date_year: number | null;
  excerpt: string;
  similarity: number;
}

export interface ConstCourtCitation {
  type: 'const_court';
  legal_id: number;
  case_number: string | null;
  case_name: string | null;
  decision_type: string | null;
  decision_date: string | null;
  college: string | null;
  respondent: string | null;
  result: string | null;
  excerpt: string;
  similarity: number;
  url: string;
}

/** Reserved for future ECHR integration */
export interface EchrCitation {
  type: 'echr';
  application_no: string;
  case_name: string;
  judgment_date: string | null;
  articles_violated: string[];
  excerpt: string;
  url: string;
}

// ── LLM-as-Judge evaluation ───────────────────────────────────────────────────

export type EvalVerdict = 'excellent' | 'good' | 'acceptable' | 'poor' | 'eval_failed';

export interface EvalScores {
  legal_accuracy:    number;
  citation_validity: number;
  structure:         number;
  completeness:      number;
  no_hallucination:  number;
}

export interface EvalResult {
  scores:       EvalScores | null;
  overall:      number | null;
  verdict:      EvalVerdict;
  issues:       string[];
  strengths:    string[];
  summary:      string | null;
  error?:       string;
  evaluated_at: string;
  model:        string;
}

// Human legal review, stored in the application database.
export type HumanReviewVerdict =
  | 'correct'
  | 'mostly_correct'
  | 'partially_correct'
  | 'incorrect'
  | 'unsafe';

export type HumanSourceCheckStatus =
  | 'not_assessed'
  | 'used_correctly'
  | 'partially_correct'
  | 'wrong_or_irrelevant'
  | 'requested_but_missing'
  | 'should_have_used'
  | 'not_needed';

export interface HumanSourceCheck {
  requested: boolean;
  used_count: number;
  status: HumanSourceCheckStatus;
}

export interface HumanReviewPayload {
  reviewer_name?: string | null;
  overall_score: number;
  legal_accuracy_score?: number | null;
  norm_coverage_score?: number | null;
  case_law_score?: number | null;
  source_routing_score?: number | null;
  clarity_score?: number | null;
  verdict: HumanReviewVerdict;
  correct_norms: string[];
  incorrect_norms: string[];
  missing_norms: string[];
  correct_cases: string[];
  irrelevant_cases: string[];
  missing_cases: string[];
  source_checks: Record<string, HumanSourceCheck>;
  improvement_actions: string[];
  notes?: string | null;
}

export interface HumanReview extends HumanReviewPayload {
  id: number;
  chat_id?: number;
  chat_message_id?: number;
  reviewer_id?: number;
  reviewer_name?: string | null;
  used_norms_snapshot?: unknown;
  used_cases_snapshot?: unknown;
  requested_sources_snapshot?: string[];
  used_sources_snapshot?: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export interface MessageMeta {
  retrieval_mode: string | null;
  answer_mode: AnswerMode | null;

  /** Overall confidence (domestic + law combined) */
  confidence: ConfidenceLevel | null;
  confidence_note: string | null;

  /** Per-source confidence breakdown */
  overall_confidence?: ConfidenceLevel | null;
  domestic_confidence?: ConfidenceLevel | null;
  law_confidence?: ConfidenceLevel | null;
  echr_confidence?: ConfidenceLevel | null;

  /** Citation counts */
  used_case_count: number;
  used_chunk_count: number;
  law_citation_count?: number;
  requested_sources?: string[];
  sources_active?: string[];
  source_status?: Record<string, {
    requested?: boolean;
    routed?: boolean;
    attempted?: boolean;
    count?: number;
    status?: string;
    error?: string;
  }>;

  pipeline_ms?: number | null;
  eval_enabled?: boolean;
  eval_status?: 'pending' | 'completed' | 'disabled' | 'skipped' | 'not_requested' | string | null;
  openai_usage?: OpenAIUsageSummary | null;
  answer_correction?: {
    enabled: boolean;
    attempted: boolean;
    corrected: boolean;
    status: string;
    [key: string]: unknown;
  } | null;
}

export interface OpenAIUsageOperation {
  operation: string;
  endpoint: string;
  model: string;
  pricing_model?: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_usd?: number;
  cached_input_usd?: number;
  output_usd?: number;
  cost_usd: number;
}

export interface OpenAIUsageSummary {
  enabled: boolean;
  estimated?: boolean;
  currency?: string;
  calls: number;
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  total_usd?: number;
  total_cents?: number;
  by_model?: Record<string, {
    calls: number;
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
    cost_cents?: number;
  }>;
  operations?: OpenAIUsageOperation[];
  pricing_source?: string;
  calculated_at?: string;
}

// ── Chat message ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  chat_id: number;
  role: MessageRole;
  content: string;
  citations: Citation[];
  law_citations?: LawCitation[];
  echr_citations?: EchrCitation[];
  matsne_citations?: MatsneCitation[];
  eu_citations?: EuCitation[];
  german_citations?: GermanCitation[];
  const_court_citations?: ConstCourtCitation[];
  eval?: EvalResult | null;
  human_review?: HumanReview | null;
  meta?: MessageMeta;
  created_at: string;
  // UI-only fields — not persisted
  status?: MessageStatus;
  isPartial?: boolean;   // true if streaming was interrupted by an error
  canRetry?: boolean;    // true if partial content exists and retry is possible
  isNew?: boolean;       // true for messages created this session (not loaded from history)
}

// ── SSE events ────────────────────────────────────────────────────────────────

export interface SseEvalData {
  message_id: number;
  eval: EvalResult;
  meta?: Partial<MessageMeta>;
}

export interface SseEvent {
  event: 'status' | 'token' | 'done' | 'eval' | 'error';
  data: SseStatusData | SseTokenData | SseDoneData | SseEvalData | SseErrorData;
}

export interface SseStatusData {
  phase: StreamPhase;
}

export interface SseTokenData {
  token: string;
}

export interface SseDoneData {
  message_id: number;
  content?: string;
  citations: Citation[];
  law_citations?: LawCitation[];
  echr_citations?: EchrCitation[];
  matsne_citations?: MatsneCitation[];
  eu_citations?: EuCitation[];
  german_citations?: GermanCitation[];
  const_court_citations?: ConstCourtCitation[];
  eval?: EvalResult | null;
  meta: MessageMeta;
}

export interface SseErrorData {
  message: string;
}
