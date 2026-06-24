import { Component, Input, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChatMessage, EvalResult } from "../../../../core/models/message.model";
import { MarkdownService } from "../../../../core/services/markdown.service";
import { CaseModalService } from "../../../../core/services/case-modal.service";
import { CitationListComponent } from "../citation-list/citation-list.component";
import { ConfidenceBadgeComponent } from "../confidence-badge/confidence-badge.component";
import { HumanReviewPanelComponent } from "../human-review-panel/human-review-panel.component";
import { MessageActionsComponent } from "../message-actions/message-actions.component";

@Component({
    selector: "app-message-item",
    standalone: true,
    imports: [
        CommonModule,
        CitationListComponent,
        ConfidenceBadgeComponent,
        HumanReviewPanelComponent,
        MessageActionsComponent,
    ],
    template: `
        <!-- ── USER message ────────────────────────────────────────────────────── -->
        @if (isUser) {
            <div
                class="max-w-3xl mx-auto px-4 py-2"
                [class.msg-enter]="message.isNew"
            >
                <div class="flex justify-end items-end gap-1.5 group">
                    <!-- Copy button — visible on hover -->
                    <button
                        (click)="copyUser()"
                        title="კოპირება"
                        class="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                               flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px]
                               text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0 mb-0.5"
                    >
                        @if (userCopied()) {
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        } @else {
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                        }
                    </button>

                    <div class="max-w-[75%] sm:max-w-[65%]">
                        <div
                            class="chat-text bg-gray-100 dark:bg-[#2d2d2d] text-gray-800 dark:text-gray-100
                        rounded-2xl rounded-br-sm px-4 py-3 leading-relaxed
                        whitespace-pre-wrap break-words shadow-sm"
                        >
                            {{ message.content }}
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- ── ASSISTANT message ───────────────────────────────────────────────── -->
        @if (isAssistant) {
            <div
                class="max-w-3xl mx-auto px-4 py-4 msg-wrapper"
                [class.msg-enter]="message.isNew"
            >
                <div class="flex gap-3 items-start">
                    <!-- Avatar -->
                    <div
                        class="w-8 h-8 rounded-full bg-accent flex items-center justify-center
                      shrink-0 mt-0.5 shadow-sm shadow-accent/20"
                    >
                        <span
                            class="text-white text-[10px] font-bold tracking-tight"
                            >AI</span
                        >
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0 pt-0.5">
                        <!-- ── Loading phase label ────────────────────────────────────── -->
                        @if (isLoading) {
                            <div class="flex items-center gap-2 py-1">
                                <span class="flex gap-1">
                                    @for (d of [0, 1, 2]; track d) {
                                        <span
                                            class="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce-dot"
                                            [style.animation-delay]="
                                                d * 0.2 + 's'
                                            "
                                        ></span>
                                    }
                                </span>
                                <span
                                    class="text-xs text-gray-400 dark:text-gray-500 animate-fade-in"
                                >
                                    {{ phaseLabel }}
                                </span>
                                @if (liveElapsedLabel) {
                                    <span class="text-xs text-gray-300 dark:text-gray-600">·</span>
                                    <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">
                                        {{ liveElapsedLabel }}
                                    </span>
                                }
                            </div>
                        }

                        <!-- ── Content (streaming or done) ───────────────────────────── -->
                        @if (hasContent) {
                            <div
                                class="md-content chat-text text-gray-800 dark:text-gray-100 break-words"
                                [innerHTML]="renderedContent"
                                (click)="handleContentClick($event)"
                            ></div>

                            @if (isStreaming) {
                                <span class="streaming-cursor"></span>
                                @if (liveElapsedLabel) {
                                    <div class="mt-1 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                                        {{ phaseLabel }} · {{ liveElapsedLabel }}
                                    </div>
                                }
                            }
                        }

                        <!-- ── Error notice ────────────────────────────────────────────── -->
                        @if (isError) {
                            <div class="mt-2 space-y-1.5 animate-fade-in">
                                <div class="flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    @if (message.isPartial) {
                                        <span>პასუხი ნაწილობრივ გენერირდა — კავშირი გაწყდა.</span>
                                    } @else {
                                        <span>შეცდომა — სცადეთ თავიდან.</span>
                                    }
                                </div>
                                @if (message.canRetry) {
                                    <!-- TODO: wire (click) to a retry output/service call -->
                                    <button
                                        class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400
                                               hover:text-accent dark:hover:text-accent transition-colors"
                                        title="სცადეთ თავიდან"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" stroke-width="2.5">
                                            <polyline points="1 4 1 10 7 10"/>
                                            <path d="M3.51 15a9 9 0 1 0 .49-4.44"/>
                                        </svg>
                                        გენერაციის გაგრძელება
                                    </button>
                                }
                            </div>
                        }

                        <!-- ── Meta row: confidence + actions (done state only) ───────── -->
                        @if (isDone && hasContent) {
                            <div
                                class="flex items-center justify-between mt-2.5 gap-2 flex-wrap"
                            >
                                <div class="flex items-center gap-2 flex-wrap">
                                    @if (confidence) {
                                        <app-confidence-badge
                                            [level]="confidence"
                                            [explanation]="confidenceNote"
                                        />
                                    }
                                    @if (responseTimeLabel) {
                                        <span class="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                                            {{ responseTimeLabel }}
                                        </span>
                                    }
                                    @if (costLabel) {
                                        <span
                                            class="text-[11px] tabular-nums text-gray-400 dark:text-gray-500"
                                            [title]="costTooltip"
                                        >
                                            {{ costLabel }}
                                        </span>
                                    }
                                </div>

                                <app-message-actions
                                    [text]="message.content"
                                    [citationCount]="citationCount"
                                    [citationsOpen]="citationsVisible()"
                                    (citationsToggle)="toggleCitations()"
                                />
                            </div>

                            <app-human-review-panel [message]="message" />
                        }

                        <!-- ── Citations ───────────────────────────────────────────────── -->
                        @if (citationsVisible() && citationCount > 0) {
                            <div class="animate-slide-up">
                                <app-citation-list
                                    [domesticCitations]="message.citations"
                                    [lawCitations]="message.law_citations ?? []"
                                    [echrCitations]="message.echr_citations ?? []"
                                    [matsneCitations]="message.matsne_citations ?? []"
                                    [euCitations]="message.eu_citations ?? []"
                                    [germanCitations]="message.german_citations ?? []"
                                    [constCourtCitations]="message.const_court_citations ?? []"
                                />
                            </div>
                        }

                        <!-- ── LLM-as-Judge evaluation ─────────────────────────────────── -->
                        @if (isEvalPending) {
                            <div class="mt-2 flex items-center gap-1.5 text-[11px] text-gray-300 dark:text-gray-600 animate-pulse">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                                </svg>
                                <span>AI შეფასება მიმდინარეობს…</span>
                            </div>
                        }
                        @if (isDone && eval?.verdict === 'eval_failed') {
                            <div class="mt-2 flex items-center gap-1.5 text-[11px] text-gray-300 dark:text-gray-600">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <span>შეფასება ვერ მოხერხდა</span>
                            </div>
                        }
                        @if (isDone && eval && eval.verdict !== 'eval_failed') {
                            <div class="mt-3 border-t border-gray-100 dark:border-gray-800 pt-2">

                                <!-- Collapsed header (always visible) -->
                                <button
                                    class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500
                                           hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full text-left"
                                    (click)="toggleEval()"
                                >
                                    <span class="font-medium" [class]="evalColor">
                                        {{ evalEmoji }} {{ evalLabel }}
                                    </span>
                                    <span class="text-gray-300 dark:text-gray-600">·</span>
                                    <span>AI შეფასება: {{ eval.overall?.toFixed(1) }}/10</span>
                                    <svg class="ml-auto w-3 h-3 transition-transform"
                                         [class.rotate-180]="evalVisible()"
                                         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                        <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                </button>

                                <!-- Expanded detail -->
                                @if (evalVisible()) {
                                    <div class="mt-2 space-y-2 animate-fade-in">

                                        <!-- Score bars -->
                                        @if (eval.scores) {
                                            <div class="grid grid-cols-1 gap-1 text-xs">
                                                @for (item of evalScoreItems; track item.key) {
                                                    <div class="flex items-center gap-2">
                                                        <span class="w-40 text-gray-400 dark:text-gray-500 shrink-0">{{ item.label }}</span>
                                                        <div class="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                                            <div class="h-1.5 rounded-full transition-all"
                                                                 [style.width.%]="(item.value / 10) * 100"
                                                                 [class]="item.value >= 8 ? 'bg-green-400' : item.value >= 6 ? 'bg-yellow-400' : 'bg-red-400'">
                                                            </div>
                                                        </div>
                                                        <span class="w-8 text-right text-gray-500 dark:text-gray-400 shrink-0">{{ item.value }}/10</span>
                                                    </div>
                                                }
                                            </div>
                                        }

                                        <!-- Summary -->
                                        @if (eval.summary) {
                                            <p class="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                                {{ eval.summary }}
                                            </p>
                                        }

                                        <!-- Issues -->
                                        @if (eval.issues.length) {
                                            <div class="text-xs text-orange-500 dark:text-orange-400 space-y-0.5">
                                                @for (issue of eval.issues; track issue) {
                                                    <div class="flex gap-1"><span>⚠</span><span>{{ issue }}</span></div>
                                                }
                                            </div>
                                        }

                                        <div class="text-[10px] text-gray-300 dark:text-gray-700">
                                            შეაფასა: {{ eval.model }}
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        }
    `,
})
export class MessageItemComponent {
    @Input({ required: true }) message!: ChatMessage;
    /** Passed from chat-thread only for the currently-loading message. */
    @Input() streamPhase: string | null = null;
    @Input() elapsedSeconds: number | null = null;

    citationsVisible = signal(false);
    evalVisible      = signal(false);
    userCopied       = signal(false);

    // Markdown memoization — avoids re-parsing on every CD tick during streaming
    private _cachedContent = "";
    private _cachedRendered = "";

    private caseModal = inject(CaseModalService);

    constructor(private md: MarkdownService) {}

    get isUser(): boolean {
        return this.message.role === "user";
    }
    get isAssistant(): boolean {
        return this.message.role === "assistant";
    }

    get isLoading(): boolean {
        return this.message.status === "loading";
    }
    get isStreaming(): boolean {
        return this.message.status === "streaming";
    }
    get isDone(): boolean {
        return (
            this.message.status === "done" || this.message.status === undefined
        );
    }
    get isError(): boolean {
        return this.message.status === "error";
    }

    get hasContent(): boolean {
        return this.message.content.trim().length > 0;
    }

    get phaseLabel(): string {
        switch (this.streamPhase) {
            case 'preparing':          return 'ვაანალიზებ კითხვას…';
            case 'triage':             return 'ვარჩევ სამართლებრივ საკითხებს…';
            case 'query_normalizing':  return 'ვაზუსტებ საძიებო სიტყვებს…';
            case 'case_retrieval':     return 'ვეძებ სასამართლო გადაწყვეტილებებს…';
            case 'law_lookup':         return 'ვამოწმებ კანონმდებლობას…';
            case 'echr_lookup':        return 'ვამოწმებ ECHR პრაქტიკას…';
            case 'comparative_lookup': return 'ვამოწმებ შედარებით წყაროებს…';
            case 'reranking':          return 'ვარჩევ შესაბამის წყაროებს…';
            case 'authority_check':    return 'ვამოწმებ წყაროების ავტორიტეტს…';
            case 'context_building':   return 'ვამზადებ სამართლებრივ კონტექსტს…';
            case 'writing':            return 'ვამზადებ პასუხს…';
            case 'validating':         return 'ვამოწმებ პასუხის სიზუსტეს…';
            case 'finalizing':         return 'ვასრულებ პასუხს…';
            default:                   return 'ვაანალიზებ კითხვას…';
        }
    }

    get liveElapsedLabel(): string | null {
        if (this.elapsedSeconds === null) {
            return null;
        }

        return this.formatDuration(this.elapsedSeconds * 1000);
    }

    get responseTimeLabel(): string | null {
        const ms = this.message.meta?.pipeline_ms;
        if (typeof ms !== "number" || ms < 0) {
            return null;
        }

        return `დრო: ${this.formatDuration(ms)}`;
    }

    get isEvalPending(): boolean {
        const meta = this.message.meta;

        return this.isDone
            && !this.eval
            && this.message.isNew === true
            && meta?.eval_enabled === true
            && ['pending', 'running'].includes(String(meta?.eval_status ?? ''));
    }

    get costLabel(): string | null {
        const usage = this.message.meta?.openai_usage;
        if (!usage?.enabled || !usage.calls || typeof usage.total_usd !== "number") {
            return null;
        }

        const usdText = this.formatUsd(usage.total_usd);
        const tokenText = typeof usage.total_tokens === "number" && usage.total_tokens > 0
            ? ` · ${this.formatCompactNumber(usage.total_tokens)} tokens`
            : "";
        const modelText = this.costModelLabel;

        return `სულ: ≈ ${usdText}${tokenText}${modelText ? ` · ${modelText}` : ""}`;
    }

    get costTooltip(): string {
        const usage = this.message.meta?.openai_usage;
        if (!usage?.enabled) {
            return "OpenAI ხარჯის დათვლა გამორთულია";
        }

        const usd = typeof usage.total_usd === "number" ? `$${usage.total_usd.toFixed(6)}` : "N/A";
        const input = usage.input_tokens ?? 0;
        const output = usage.output_tokens ?? 0;
        const modelBreakdown = this.costModelBreakdown;
        const operationBreakdown = this.costOperationBreakdown;

        return [
            `საბოლოო ჯამური OpenAI API ხარჯი: ${usd}`,
            `Input: ${input}, Output: ${output}`,
            modelBreakdown ? `მოდელები: ${modelBreakdown}` : "",
            operationBreakdown ? `ნაბიჯები: ${operationBreakdown}` : "",
            "ტარიფი მოდის backend config/env-დან.",
        ].filter(Boolean).join("\n");
    }

    get costModelLabel(): string | null {
        const usage = this.message.meta?.openai_usage;
        const operations = usage?.operations ?? [];
        const answerOperation = operations.find((operation) =>
            ['answer_stream', 'answer_generation'].includes(operation.operation)
        );
        const answerModel = answerOperation?.model ?? Object.keys(usage?.by_model ?? {})[0] ?? null;

        if (!answerModel) {
            return null;
        }

        const modelCount = Object.keys(usage?.by_model ?? {}).length;

        return modelCount > 1
            ? `პასუხი: ${answerModel} +${modelCount - 1}`
            : `პასუხი: ${answerModel}`;
    }

    get costModelBreakdown(): string | null {
        const byModel = this.message.meta?.openai_usage?.by_model;
        if (!byModel || Object.keys(byModel).length === 0) {
            return null;
        }

        return Object.entries(byModel)
            .map(([model, item]) => {
                const cost = typeof item.cost_usd === "number" ? this.formatUsd(item.cost_usd) : "N/A";
                return `${model} (${item.calls} call, ${this.formatCompactNumber(item.total_tokens)} tokens, ${cost})`;
            })
            .join("; ");
    }

    get costOperationBreakdown(): string | null {
        const operations = this.message.meta?.openai_usage?.operations ?? [];
        if (operations.length === 0) {
            return null;
        }

        return operations
            .map((operation) => {
                const cost = typeof operation.cost_usd === "number" ? this.formatUsd(operation.cost_usd) : "N/A";
                return `${this.operationLabel(operation.operation)}: ${operation.model}, ${this.formatCompactNumber(operation.total_tokens)} tokens, ${cost}`;
            })
            .join("; ");
    }

    get confidence() {
        return this.message.meta?.confidence ?? null;
    }
    get confidenceNote() {
        return this.message.meta?.confidence_note ?? null;
    }
    get citationCount(): number {
        return (
            (this.message.citations?.length ?? 0) +
            (this.message.echr_citations?.length ?? 0) +
            (this.message.matsne_citations?.length ?? 0) +
            (this.message.eu_citations?.length ?? 0) +
            (this.message.german_citations?.length ?? 0) +
            (this.message.const_court_citations?.length ?? 0)
        );
    }

    copyUser(): void {
        navigator.clipboard.writeText(this.message.content).then(() => {
            this.userCopied.set(true);
            setTimeout(() => this.userCopied.set(false), 2000);
        });
    }

    toggleCitations(): void {
        this.citationsVisible.update((v) => !v);
    }

    toggleEval(): void {
        this.evalVisible.update((v) => !v);
    }

    get eval(): EvalResult | null {
        return this.message.eval ?? null;
    }

    get evalLabel(): string {
        switch (this.eval?.verdict) {
            case 'excellent':  return 'შესანიშნავი';
            case 'good':       return 'კარგი';
            case 'acceptable': return 'მისაღები';
            case 'poor':       return 'სუსტი';
            default:           return '';
        }
    }

    get evalEmoji(): string {
        switch (this.eval?.verdict) {
            case 'excellent':  return '✅';
            case 'good':       return '✅';
            case 'acceptable': return '⚠️';
            case 'poor':       return '❌';
            default:           return '📊';
        }
    }

    get evalColor(): string {
        switch (this.eval?.verdict) {
            case 'excellent':
            case 'good':       return 'text-green-500 dark:text-green-400';
            case 'acceptable': return 'text-yellow-500 dark:text-yellow-400';
            case 'poor':       return 'text-red-500 dark:text-red-400';
            default:           return 'text-gray-400';
        }
    }

    get evalScoreItems(): { key: string; label: string; value: number }[] {
        const s = this.eval?.scores;
        if (!s) return [];
        return [
            { key: 'legal_accuracy',    label: 'სამართლებრივი სიზუსტე', value: s.legal_accuracy },
            { key: 'citation_validity', label: 'Citation სისწორე',       value: s.citation_validity },
            { key: 'no_hallucination',  label: 'ჰალუცინაციის არქონა',    value: s.no_hallucination },
            { key: 'completeness',      label: 'სისრულე',                 value: s.completeness },
            { key: 'structure',         label: 'სტრუქტურა',              value: s.structure },
        ];
    }

    handleContentClick(event: MouseEvent): void {
        const anchor = (event.target as HTMLElement).closest('a[data-case-id]');
        if (!anchor) return;
        const caseId = anchor.getAttribute('data-case-id');
        if (caseId) {
            event.preventDefault();
            this.caseModal.open(+caseId);
        }
    }

    get renderedContent(): string {
        if (this.message.content !== this._cachedContent) {
            this._cachedContent = this.message.content;
            this._cachedRendered = this.md.parse(this.message.content);
        }
        return this._cachedRendered;
    }

    private formatDuration(ms: number): string {
        const seconds = Math.max(0, Math.round(ms / 1000));

        if (seconds < 60) {
            return `${seconds} წმ`;
        }

        const minutes = Math.floor(seconds / 60);
        const restSeconds = seconds % 60;

        return `${minutes} წთ ${restSeconds.toString().padStart(2, "0")} წმ`;
    }

    private operationLabel(operation: string): string {
        switch (operation) {
            case 'answer_stream':
            case 'answer_generation':
                return 'პასუხი';
            case 'query_extraction':
                return 'კითხვის დამუშავება';
            case 'issue_spotting':
                return 'საკითხების ამოღება';
            case 'rule_extraction':
                return 'ნორმების ამოღება';
            case 'reranking':
                return 'წყაროების გადალაგება';
            case 'embedding':
                return 'embedding';
            case 'eval_judge':
                return 'AI შეფასება';
            case 'hyde_generation':
                return 'HyDE ძებნა';
            default:
                return operation;
        }
    }

    private formatUsd(value: number): string {
        if (value > 0 && value < 0.0001) {
            return "<$0.0001";
        }

        if (value < 0.01) {
            return `$${value.toFixed(4)}`;
        }

        if (value < 1) {
            return `$${value.toFixed(3)}`;
        }

        return `$${value.toFixed(2)}`;
    }

    private formatCompactNumber(value: number): string {
        if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M`;
        }

        if (value >= 1_000) {
            return `${(value / 1_000).toFixed(1)}K`;
        }

        return `${value}`;
    }
}
