import { Component, Input, OnInit, signal, type WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChatMessage,
  HumanReview,
  HumanReviewPayload,
  HumanReviewVerdict,
  HumanSourceCheckStatus,
} from '../../../../core/models/message.model';
import { ApiService } from '../../../../core/services/api.service';

type SourceKey = 'court' | 'matsne' | 'echr' | 'eu' | 'german' | 'const_court';

interface SourceRow {
  key: SourceKey;
  label: string;
  requested: boolean;
  recommended?: boolean;
  usedCount: number;
  candidateCount?: number;
  filteredCount?: number;
  routed: boolean;
  runStatus: string | null;
  error?: string | null;
}

interface ReviewTagOption {
  key: string;
  label: string;
  description: string;
}

interface SummaryItem {
  key: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-human-review-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mt-3 border-t border-gray-100 dark:border-gray-800 pt-2">
      <button
        type="button"
        (click)="toggleOpen()"
        class="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium
               text-gray-500 hover:bg-gray-100 hover:text-gray-700
               dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <span>{{ reviewTitle }}</span>
        @if (isRetrievalPreview) {
          <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            retrieval
          </span>
        }
        @if (savedReview()) {
          <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            შენახულია {{ savedReview()?.overall_score }}/10
          </span>
        }
        <span class="text-gray-300 dark:text-gray-600">{{ open() ? '▲' : '▼' }}</span>
      </button>

      @if (open()) {
        <form
          (ngSubmit)="submit()"
          class="mt-3 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-3
                 dark:border-gray-800 dark:bg-gray-900/40"
        >
          <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
            <label class="review-field">
              <span>საერთო ქულა</span>
              <input type="number" min="1" max="10" required [(ngModel)]="overallScore" name="overallScore" />
            </label>
            <label class="review-field">
              <span>სამართლებრივი სიზუსტე</span>
              <input type="number" min="1" max="10" [(ngModel)]="legalAccuracyScore" name="legalAccuracyScore" />
            </label>
            <label class="review-field">
              <span>ნორმების დაფარვა</span>
              <input type="number" min="1" max="10" [(ngModel)]="normCoverageScore" name="normCoverageScore" />
            </label>
            <label class="review-field">
              <span>პრაქტიკის მოძებნა</span>
              <input type="number" min="1" max="10" [(ngModel)]="caseLawScore" name="caseLawScore" />
            </label>
            <label class="review-field">
              <span>წყაროების არჩევა</span>
              <input type="number" min="1" max="10" [(ngModel)]="sourceRoutingScore" name="sourceRoutingScore" />
            </label>
            <label class="review-field">
              <span>სიცხადე</span>
              <input type="number" min="1" max="10" [(ngModel)]="clarityScore" name="clarityScore" />
            </label>
          </div>

          <label class="review-field">
            <span>საბოლოო შეფასება</span>
            <select [(ngModel)]="verdict" name="verdict">
              <option value="correct">სწორია</option>
              <option value="mostly_correct">უმეტესად სწორია</option>
              <option value="partially_correct">ნაწილობრივ სწორია</option>
              <option value="incorrect">არასწორია</option>
              <option value="unsafe">სარისკოა</option>
            </select>
          </label>

          @if (diagnosticSummaryItems.length) {
            <section class="space-y-2">
              <h4 class="review-heading">{{ reviewSubtitle }}</h4>
              <div class="flex flex-wrap gap-1.5">
                @for (item of diagnosticSummaryItems; track item.key) {
                  <span class="review-summary-pill">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </span>
                }
              </div>
            </section>
          }

          <section class="space-y-2">
            <h4 class="review-heading">{{ normsHeading }}</h4>
            @if (usedNormLabels.length) {
              <div class="flex flex-wrap gap-1">
                @for (norm of usedNormLabels; track norm) {
                  <span class="review-chip">{{ norm }}</span>
                }
              </div>
            } @else {
              <p class="review-muted">ნორმები ცალკე citation-ებად არ ჩანს.</p>
            }

            <div class="grid gap-2 md:grid-cols-3">
              <label class="review-field">
                <span>სწორად გამოყენებული ნორმები</span>
                <textarea [(ngModel)]="correctNormsText" name="correctNormsText" rows="4" placeholder="თითო ხაზზე ერთი ნორმა"></textarea>
              </label>
              <label class="review-field">
                <span>არასწორად გამოყენებული ნორმები</span>
                <textarea [(ngModel)]="incorrectNormsText" name="incorrectNormsText" rows="4"></textarea>
              </label>
              <label class="review-field">
                <span>გამოტოვებული ნორმები</span>
                <textarea [(ngModel)]="missingNormsText" name="missingNormsText" rows="4"></textarea>
              </label>
            </div>
          </section>

          <section class="space-y-2">
            <h4 class="review-heading">{{ casesHeading }}</h4>
            @if (usedCaseLabels.length) {
              <div class="flex flex-wrap gap-1">
                @for (item of usedCaseLabels; track item) {
                  <span class="review-chip">{{ item }}</span>
                }
              </div>
            } @else {
              <p class="review-muted">სასამართლო/შედარებითი გადაწყვეტილებები არ ჩანს.</p>
            }

            <div class="grid gap-2 md:grid-cols-3">
              <label class="review-field">
                <span>სწორი გადაწყვეტილებები</span>
                <textarea [(ngModel)]="correctCasesText" name="correctCasesText" rows="4"></textarea>
              </label>
              <label class="review-field">
                <span>შეუსაბამო გადაწყვეტილებები</span>
                <textarea [(ngModel)]="irrelevantCasesText" name="irrelevantCasesText" rows="4"></textarea>
              </label>
              <label class="review-field">
                <span>რა უნდა მოეძებნა</span>
                <textarea [(ngModel)]="missingCasesText" name="missingCasesText" rows="4"></textarea>
              </label>
            </div>
          </section>

          <section class="space-y-2">
            <h4 class="review-heading">წყაროების შემოწმება</h4>
            <div class="space-y-1">
              @for (row of assessableSources; track row.key) {
                <div class="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs dark:bg-gray-950/50">
                  <div class="font-medium text-gray-700 dark:text-gray-200">{{ row.label }}</div>
                  <div class="text-gray-400">
                    <span>{{ sourceRunLabel(row) }}</span>
                    <span class="hidden">
                    {{ row.requested ? 'მონიშნული იყო' : 'მოიძებნა დამატებით' }} · {{ row.usedCount }} წყარო
                    </span>
                  </div>
                  <select
                    class="review-select"
                    [(ngModel)]="sourceStatuses[row.key]"
                    [name]="'source_' + row.key"
                  >
                    <option value="used_correctly">სწორია</option>
                    <option value="partially_correct">ნაწილობრივ</option>
                    <option value="wrong_or_irrelevant">არასწორი/შეუსაბამო</option>
                    <option value="requested_but_missing">მოთხოვნილი იყო, ვერ იპოვა</option>
                    <option value="not_needed">არ იყო საჭირო</option>
                  </select>
                </div>
              }
            </div>

            @if (optionalSourceRows.length) {
              <div class="rounded-md bg-white p-2 text-xs dark:bg-gray-950/50">
                <div class="mb-1 font-medium text-gray-600 dark:text-gray-300">
                  დამატებით რა წყარო უნდა ჩართულიყო?
                </div>
                <div class="flex flex-wrap gap-2">
                  @for (row of optionalSourceRows; track row.key) {
                    <label class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <input type="checkbox" [checked]="missingSourceKeys().includes(row.key)" (change)="toggleMissingSource(row.key, $event)" />
                      <span>{{ row.label }}</span>
                    </label>
                  }
                </div>
              </div>
            }
          </section>

          <section class="space-y-2">
            <h4 class="review-heading">სად გაჭირდა?</h4>
            <div class="grid gap-2 sm:grid-cols-2">
              @for (tag of failureTagOptions; track tag.key) {
                <label class="review-check" [attr.title]="tag.description">
                  <input type="checkbox" [checked]="selectedFailureTags().includes(tag.key)" (change)="toggleFailureTag(tag.key, $event)" />
                  <span>{{ tag.label }}</span>
                </label>
              }
            </div>
          </section>

          <section class="space-y-2">
            <h4 class="review-heading">AI context-ის ხარისხი</h4>
            <div class="grid gap-2 sm:grid-cols-2">
              @for (tag of contextQualityOptions; track tag.key) {
                <label class="review-check" [attr.title]="tag.description">
                  <input type="checkbox" [checked]="selectedContextQualityTags().includes(tag.key)" (change)="toggleContextQualityTag(tag.key, $event)" />
                  <span>{{ tag.label }}</span>
                </label>
              }
            </div>
          </section>

          <section class="space-y-2">
            <h4 class="review-heading">გაუმჯობესების მიმართულება</h4>
            <div class="flex flex-wrap gap-2 text-xs">
              @for (action of actionOptions; track action.key) {
                <label class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-gray-600 dark:bg-gray-950/50 dark:text-gray-300">
                  <input type="checkbox" [checked]="selectedActions().includes(action.key)" (change)="toggleAction(action.key, $event)" />
                  <span>{{ action.label }}</span>
                  <span
                    class="action-help"
                    tabindex="0"
                    [attr.aria-label]="action.description"
                    [attr.title]="action.description"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="10" x2="12" y2="16"/>
                      <line x1="12" y1="7" x2="12.01" y2="7"/>
                    </svg>
                    <span class="action-tooltip">{{ action.description }}</span>
                  </span>
                </label>
              }
            </div>
          </section>

          <label class="review-field">
            <span>შენიშვნა</span>
            <textarea [(ngModel)]="notes" name="notes" rows="4" placeholder="რატომ არის პასუხი სწორი/არასწორი, სად შეცდა, რა უნდა გასწორდეს"></textarea>
          </label>

          @if (error()) {
            <p class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-300">
              {{ error() }}
            </p>
          }

          <div class="flex items-center justify-end gap-2">
            @if (savedReview()) {
              <span class="text-xs text-emerald-600 dark:text-emerald-300">შეფასება შენახულია</span>
            }
            <button
              type="submit"
              [disabled]="saving()"
              class="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white
                     hover:bg-accent-hover disabled:opacity-60"
            >
              {{ saving() ? 'ინახება...' : 'შენახვა' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .review-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #4b5563;
    }
    .review-field > span,
    .review-heading {
      font-weight: 600;
      color: #374151;
    }
    .review-field input,
    .review-field select,
    .review-field textarea,
    .review-select {
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid #d1d5db;
      background: #fff;
      padding: 0.4rem 0.5rem;
      color: #111827;
      outline: none;
    }
    .review-field textarea {
      resize: vertical;
      min-height: 5.5rem;
    }
    .review-chip {
      border-radius: 999px;
      background: #eef2ff;
      padding: 0.2rem 0.5rem;
      font-size: 0.6875rem;
      color: #3730a3;
    }
    .review-muted {
      font-size: 0.75rem;
      color: #9ca3af;
    }
    .review-summary-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #fff;
      padding: 0.2rem 0.5rem;
      font-size: 0.6875rem;
      color: #6b7280;
    }
    .review-summary-pill strong {
      color: #374151;
      font-weight: 700;
    }
    .review-check {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border-radius: 0.375rem;
      background: #fff;
      padding: 0.45rem 0.55rem;
      font-size: 0.75rem;
      color: #4b5563;
    }
    .review-check input {
      width: 0.9rem;
      height: 0.9rem;
      accent-color: #2563eb;
      flex: 0 0 auto;
    }
    .action-help {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      cursor: help;
    }
    .action-tooltip {
      display: none;
      position: absolute;
      left: 50%;
      bottom: calc(100% + 0.5rem);
      z-index: 30;
      width: 16rem;
      transform: translateX(-50%);
      border-radius: 0.5rem;
      background: #111827;
      padding: 0.55rem 0.65rem;
      color: #f9fafb;
      font-size: 0.6875rem;
      line-height: 1.35;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
    }
    .action-help:hover .action-tooltip,
    .action-help:focus .action-tooltip {
      display: block;
    }
    @media (prefers-color-scheme: dark) {
      .review-field,
      .review-field > span,
      .review-heading {
        color: #d1d5db;
      }
      .review-field input,
      .review-field select,
      .review-field textarea,
      .review-select {
        border-color: #374151;
        background: #030712;
        color: #f9fafb;
      }
      .review-chip {
        background: rgba(79, 70, 229, 0.2);
        color: #c7d2fe;
      }
      .review-summary-pill,
      .review-check {
        border-color: #374151;
        background: #030712;
        color: #d1d5db;
      }
      .review-summary-pill strong {
        color: #f9fafb;
      }
      .action-tooltip {
        background: #f9fafb;
        color: #111827;
      }
    }
  `],
})
export class HumanReviewPanelComponent implements OnInit {
  @Input({ required: true }) message!: ChatMessage;

  open = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  savedReview = signal<HumanReview | null>(null);
  missingSourceKeys = signal<SourceKey[]>([]);
  selectedActions = signal<string[]>([]);
  selectedFailureTags = signal<string[]>([]);
  selectedContextQualityTags = signal<string[]>([]);

  overallScore = 8;
  legalAccuracyScore: number | null = null;
  normCoverageScore: number | null = null;
  caseLawScore: number | null = null;
  sourceRoutingScore: number | null = null;
  clarityScore: number | null = null;
  verdict: HumanReviewVerdict = 'mostly_correct';

  correctNormsText = '';
  incorrectNormsText = '';
  missingNormsText = '';
  correctCasesText = '';
  irrelevantCasesText = '';
  missingCasesText = '';
  notes = '';
  sourceStatuses: Record<string, HumanSourceCheckStatus> = {};

  readonly sourceOrder: { key: SourceKey; label: string }[] = [
    { key: 'court', label: 'სასამართლო პრაქტიკა' },
    { key: 'matsne', label: 'Matsne / კანონმდებლობა' },
    { key: 'echr', label: 'ECHR' },
    { key: 'eu', label: 'EU' },
    { key: 'german', label: 'გერმანული წყაროები' },
    { key: 'const_court', label: 'საკონსტიტუციო სასამართლო' },
  ];

  readonly failureTagOptions: ReviewTagOption[] = [
    {
      key: 'failure:query_normalization',
      label: 'საძიებო ფრაზა აცდა',
      description: 'მომხმარებლის კითხვა/კაზუსი არასწორ საძიებო ტერმინებად დაიშალა.',
    },
    {
      key: 'failure:source_router',
      label: 'წყარო არასწორად აირჩია',
      description: 'საჭირო წყარო არ ჩაირთო ან ზედმეტი წყარო ჩაირთო.',
    },
    {
      key: 'failure:matsne_missing_required_norm',
      label: 'აუცილებელი ნორმა გამოტოვა',
      description: 'კონკრეტული კანონი ან მუხლი უნდა ყოფილიყო context-ში, მაგრამ არ იყო.',
    },
    {
      key: 'failure:matsne_noise',
      label: 'Matsne ზედმეტად ფართოა',
      description: 'მოიტანა ბევრი სუსტი ან სხვა დომენის ნორმა.',
    },
    {
      key: 'failure:case_not_found',
      label: 'საჭირო საქმე ვერ იპოვა',
      description: 'არსებობს შესაფერისი გადაწყვეტილება, მაგრამ retrieval-ში არ მოხვდა.',
    },
    {
      key: 'failure:case_irrelevant',
      label: 'საქმეები თემას აცდა',
      description: 'მოძიებული გადაწყვეტილებები ფაქტობრივად ან სამართლებრივად არ ერგება კითხვას.',
    },
    {
      key: 'failure:case_context_weak',
      label: 'საქმის ტექსტი სუსტია',
      description: 'საქმე სწორია ან ახლოა, მაგრამ excerpt/context არ ხსნის reasoning-ს ან holding-ს.',
    },
    {
      key: 'failure:case_number_parse',
      label: 'საქმის ნომერი ვერ დაიჭირა',
      description: 'კითხვაში მოცემული ნომერი/ფორმატი ძებნამ სრულად ვერ ამოიცნო.',
    },
    {
      key: 'failure:prompt_ignored_sources',
      label: 'პასუხმა წყაროები ვერ გამოიყენა',
      description: 'context კარგი იყო, მაგრამ საბოლოო პასუხმა წყაროები არასწორად გამოიყენა.',
    },
    {
      key: 'failure:data_gap',
      label: 'მონაცემი გვაკლია',
      description: 'ბაზაში შესაბამისი ნორმა, საქმე ან სრული ტექსტი არ გვაქვს.',
    },
    {
      key: 'failure:slow_search',
      label: 'ძებნა ნელია',
      description: 'retrieval ან context build პრაქტიკული ტესტირებისთვის ზედმეტად დიდხანს გაგრძელდა.',
    },
  ];

  readonly contextQualityOptions: ReviewTagOption[] = [
    {
      key: 'context:enough_to_answer',
      label: 'საკმარისია პასუხისთვის',
      description: 'AI-სთან გასაგზავნი კონტექსტი საკმარისად ზუსტი და გასაგებია.',
    },
    {
      key: 'context:no_sources',
      label: 'წყაროები 0',
      description: 'context-ში რეალური ნორმა ან გადაწყვეტილება არ შევიდა.',
    },
    {
      key: 'context:too_broad',
      label: 'ზედმეტად ბევრია',
      description: 'context-ში ბევრი ზედმეტი წყაროა და პასუხს აბნევს.',
    },
    {
      key: 'context:wrong_domain',
      label: 'დომენი აცდა',
      description: 'წყაროები სხვა სამართლებრივ დომენზე ან სხვა დავის ტიპზეა.',
    },
    {
      key: 'context:missing_norm_text',
      label: 'ნორმის ტექსტი სუსტია',
      description: 'ნორმა ჩანს, მაგრამ AI-სთვის გაგზავნილი ტექსტი არ არის საკმარისი.',
    },
    {
      key: 'context:missing_case_reasoning',
      label: 'საქმის reasoning აკლია',
      description: 'გადაწყვეტილების excerpt/full-text preview არ აჩვენებს არსებით სამართლებრივ მსჯელობას.',
    },
    {
      key: 'context:needs_full_decision',
      label: 'სრული გადაწყვეტილება სჭირდება',
      description: 'მხოლოდ chunk/excerpt არ კმარა და საბოლოო პასუხისთვის მეტი ტექსტი უნდა წავიდეს.',
    },
  ];

  readonly actionOptions = [
    {
      key: 'add_norm_mapping',
      label: 'ნორმების რუკა',
      description: 'მონიშნე, როცა AI-მ ვერ იცნო რომ ამ ტიპის საკითხს კონკრეტული კანონი/მუხლი სჭირდება. ეს დაგვეხმარება, მომავალში მსგავს კითხვაზე სისტემა ავტომატურად წავიდეს სწორ ნორმაზე და აღარ გამოტოვოს აუცილებელი მუხლი.',
    },
    {
      key: 'improve_query_normalization',
      label: 'საძიებო სიტყვები',
      description: 'AI-მ კითხვა სწორად ვერ გადააკეთა საძიებო ფრაზებად. მონიშნე, როცა უკეთესი სინონიმები, ტერმინები ან მუხლის სახელები უნდა დაემატოს.',
    },
    {
      key: 'improve_source_router',
      label: 'წყაროს არჩევა',
      description: 'სისტემამ ვერ გადაწყვიტა სად უნდა ეძებნა: სასამართლოში, Matsne-ში, ECHR-ში, გერმანულში ან სხვა ბაზაში.',
    },
    {
      key: 'fix_prompt_guard',
      label: 'პასუხის ინსტრუქცია',
      description: 'მონიშნე, როცა მოდელმა იცის წყაროები, მაგრამ პასუხში არასწორი ჩარჩო აირჩია, აურია საკითხები ან ზედმეტად კატეგორიულად თქვა.',
    },
    {
      key: 'add_gold_test_case',
      label: 'ტესტ-კაზუსი',
      description: 'ეს კითხვა კარგი მაგალითია და უნდა შევინახოთ როგორც სტანდარტული ტესტი, რომ მომავალში იგივე შეცდომა ავტომატურად დავიჭიროთ.',
    },
    {
      key: 'data_missing',
      label: 'მონაცემი აკლია',
      description: 'სისტემამ ვერ იპოვა იმიტომ, რომ ბაზაში არ გვაქვს შესაბამისი კანონი, მუხლი, გადაწყვეტილება ან ტექსტი.',
    },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const review = this.message.human_review ?? null;
    this.savedReview.set(review);

    if (review) {
      this.overallScore = review.overall_score;
      this.legalAccuracyScore = review.legal_accuracy_score ?? null;
      this.normCoverageScore = review.norm_coverage_score ?? null;
      this.caseLawScore = review.case_law_score ?? null;
      this.sourceRoutingScore = review.source_routing_score ?? null;
      this.clarityScore = review.clarity_score ?? null;
      this.verdict = review.verdict;
      this.correctNormsText = this.lines(review.correct_norms);
      this.incorrectNormsText = this.lines(review.incorrect_norms);
      this.missingNormsText = this.lines(review.missing_norms);
      this.correctCasesText = this.lines(review.correct_cases);
      this.irrelevantCasesText = this.lines(review.irrelevant_cases);
      this.missingCasesText = this.lines(review.missing_cases);
      this.notes = review.notes ?? '';
      this.hydrateDiagnosticSelections(review);

      for (const [key, value] of Object.entries(review.source_checks ?? {})) {
        this.sourceStatuses[key] = value.status;
      }
    }

    for (const row of this.assessableSources) {
      this.sourceStatuses[row.key] ??= row.usedCount > 0 ? 'used_correctly' : 'requested_but_missing';
    }
  }

  toggleOpen(): void {
    this.open.update(value => !value);
  }

  submit(): void {
    this.error.set(null);
    this.saving.set(true);

    const payload: HumanReviewPayload = {
      overall_score: this.boundScore(this.overallScore) ?? 1,
      legal_accuracy_score: this.boundScore(this.legalAccuracyScore),
      norm_coverage_score: this.boundScore(this.normCoverageScore),
      case_law_score: this.boundScore(this.caseLawScore),
      source_routing_score: this.boundScore(this.sourceRoutingScore),
      clarity_score: this.boundScore(this.clarityScore),
      verdict: this.verdict,
      correct_norms: this.parseLines(this.correctNormsText),
      incorrect_norms: this.parseLines(this.incorrectNormsText),
      missing_norms: this.parseLines(this.missingNormsText),
      correct_cases: this.parseLines(this.correctCasesText),
      irrelevant_cases: this.parseLines(this.irrelevantCasesText),
      missing_cases: this.parseLines(this.missingCasesText),
      source_checks: this.buildSourceChecks(),
      improvement_actions: this.buildImprovementActions(),
      notes: this.notes.trim() || null,
    };

    this.api.reviewMessage(this.message.id, payload).subscribe({
      next: review => {
        this.savedReview.set(review);
        this.message.human_review = review;
        this.saving.set(false);
      },
      error: () => {
        this.error.set('შეფასების შენახვა ვერ მოხერხდა.');
        this.saving.set(false);
      },
    });
  }

  get isRetrievalPreview(): boolean {
    return this.message.meta?.retrieval_preview === true;
  }

  get reviewTitle(): string {
    return this.isRetrievalPreview ? 'ძიების ადამიანური შეფასება' : 'ადამიანური შეფასება';
  }

  get reviewSubtitle(): string {
    return this.isRetrievalPreview ? 'ძიების მოკლე სურათი' : 'პასუხის მოკლე სურათი';
  }

  get normsHeading(): string {
    return this.isRetrievalPreview ? 'AI context-ში შესული ნორმები' : 'AI-ის მიერ მოტანილი ნორმები';
  }

  get casesHeading(): string {
    return this.isRetrievalPreview ? 'AI context-ში შესული გადაწყვეტილებები' : 'AI-ის მიერ მოტანილი გადაწყვეტილებები';
  }

  get diagnosticSummaryItems(): SummaryItem[] {
    const counts = (this.message.meta?.retrieval_debug?.summary?.['counts'] ?? {}) as Record<string, unknown>;
    const sourceCounts = this.usedSourceCounts();
    const items: SummaryItem[] = [];

    const matsne = this.numberFrom(counts['matsne_docs'], sourceCounts.matsne);
    const cases = this.numberFrom(counts['domestic_cases'], sourceCounts.court);
    const candidates = this.numberFrom(counts['candidate_domestic_cases'], null);
    const filtered = this.numberFrom(counts['filtered_domestic_cases'], null);
    const chunks = this.numberFrom(counts['used_chunks'], this.message.meta?.used_chunk_count ?? null);
    const pipelineMs = this.message.meta?.pipeline_ms;

    items.push({ key: 'norms', label: 'ნორმები', value: String(matsne) });
    items.push({ key: 'cases', label: 'საქმეები', value: String(cases) });

    if (candidates !== null) {
      items.push({ key: 'candidate_cases', label: 'კანდიდატი საქმეები', value: String(candidates) });
    }
    if (filtered !== null && filtered > 0) {
      items.push({ key: 'filtered_cases', label: 'გაფილტრული', value: String(filtered) });
    }
    if (chunks !== null && chunks > 0) {
      items.push({ key: 'chunks', label: 'chunk', value: String(chunks) });
    }
    if (typeof pipelineMs === 'number' && pipelineMs >= 0) {
      items.push({ key: 'time', label: 'დრო', value: this.formatDuration(pipelineMs) });
    }

    return items;
  }

  get assessableSources(): SourceRow[] {
    const requested = this.requestedSourceKeys();
    const used = this.usedSourceCounts();
    const keys = new Set<SourceKey>([...requested]);
    const status = this.message.meta?.source_status ?? {};

    for (const [key, count] of Object.entries(used) as [SourceKey, number][]) {
      if (count > 0) keys.add(key);
    }
    for (const [key, sourceStatus] of Object.entries(status) as [SourceKey, { recommended?: boolean }][]) {
      if (sourceStatus.recommended === true) keys.add(key);
    }

    return this.sourceOrder
      .filter(source => keys.has(source.key))
      .map(source => {
        const sourceStatus = status[source.key] ?? {};
        return {
          ...source,
          requested: requested.includes(source.key) || sourceStatus.requested === true,
          recommended: sourceStatus.recommended === true,
          usedCount: used[source.key] ?? 0,
          candidateCount: sourceStatus.candidate_count,
          filteredCount: sourceStatus.filtered_count,
          routed: sourceStatus.routed === true,
          runStatus: sourceStatus.status ?? null,
          error: sourceStatus.error ?? null,
        };
      });
  }

  get optionalSourceRows(): { key: SourceKey; label: string }[] {
    const assessable = new Set(this.assessableSources.map(row => row.key));
    return this.sourceOrder.filter(source => !assessable.has(source.key));
  }

  get usedNormLabels(): string[] {
    const matsne = (this.message.matsne_citations ?? []).map(item =>
      `${item.title}${item.article_num ? `, მუხლი ${item.article_num}` : ''}`
    );
    const law = (this.message.law_citations ?? []).map(item =>
      `${item.title}, მუხლი ${item.article_num}`
    );
    return [...matsne, ...law].slice(0, 12);
  }

  get usedCaseLabels(): string[] {
    return [
      ...(this.message.citations ?? []).map(item => item.case_num || `საქმე #${item.case_id}`),
      ...(this.message.echr_citations ?? []).map(item => item.case_name),
      ...(this.message.eu_citations ?? []).map(item => item.case_num || item.title || item.cellar_id),
      ...(this.message.german_citations ?? []).map(item => item.external_id || item.court_name || `German #${item.case_id}`),
      ...(this.message.const_court_citations ?? []).map(item => item.case_number || item.case_name || `საკ. #${item.legal_id}`),
    ].filter(Boolean).slice(0, 16) as string[];
  }

  toggleMissingSource(key: SourceKey, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.missingSourceKeys.update(keys => checked
      ? Array.from(new Set([...keys, key]))
      : keys.filter(item => item !== key)
    );
  }

  toggleAction(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedActions.update(keys => checked
      ? Array.from(new Set([...keys, key]))
      : keys.filter(item => item !== key)
    );
  }

  toggleFailureTag(key: string, event: Event): void {
    this.toggleSignalKey(this.selectedFailureTags, key, event);
  }

  toggleContextQualityTag(key: string, event: Event): void {
    this.toggleSignalKey(this.selectedContextQualityTags, key, event);
  }

  sourceRunLabel(row: SourceRow): string {
    const prefix = row.requested
      ? 'მონიშნული იყო'
      : row.routed
        ? 'სისტემამ ჩართო'
        : 'დამატებით მოიძებნა';

    switch (row.runStatus) {
      case 'found':
        return `${prefix} · მოძებნა ${row.usedCount} წყარო`;
      case 'filtered':
        return `${prefix} · კანდიდატები მოიძებნა (${row.filteredCount ?? row.candidateCount ?? 0}), AI context-ში არ გაიგზავნა`;
      case 'not_found':
        return `${prefix} · ძებნა შესრულდა, შედეგი 0`;
      case 'not_attempted':
        return `${prefix} · ძებნა ვერ გაეშვა`;
      case 'failed':
        return `${prefix} · ძებნის შეცდომა`;
      case 'not_routed':
        return `${prefix} · ძებნა არ ჩაირთო`;
      case 'not_requested':
        return `საჭირო ჩანდა · წყარო მონიშნული არ იყო`;
      default:
        return `${prefix} · ${row.usedCount} წყარო`;
    }
  }

  private buildSourceChecks(): HumanReviewPayload['source_checks'] {
    const checks: HumanReviewPayload['source_checks'] = {};

    for (const row of this.assessableSources) {
      checks[row.key] = {
        requested: row.requested,
        used_count: row.usedCount,
        status: this.sourceStatuses[row.key] ?? 'not_assessed',
        recommended: row.recommended === true,
        routed: row.routed,
        candidate_count: row.candidateCount ?? null,
        filtered_count: row.filteredCount ?? null,
        run_status: row.runStatus,
      };
    }

    for (const key of this.missingSourceKeys()) {
      checks[key] = {
        requested: false,
        used_count: this.usedSourceCounts()[key] ?? 0,
        status: 'should_have_used',
        run_status: 'reviewer_expected_source',
      };
    }

    checks['_diagnostics'] = {
      requested: false,
      used_count: this.totalUsedSourceCount(),
      status: 'not_assessed',
      review_mode: this.isRetrievalPreview ? 'retrieval_preview' : 'answer',
      failure_tags: this.selectedFailureTags(),
      context_quality: this.selectedContextQualityTags(),
      candidate_count: this.totalCandidateCount(),
      filtered_count: this.totalFilteredCount(),
      run_status: this.diagnosticRunStatus(),
    };

    return checks;
  }

  private buildImprovementActions(): string[] {
    return Array.from(new Set([
      ...this.selectedActions(),
      ...this.selectedFailureTags(),
      ...this.selectedContextQualityTags(),
    ]));
  }

  private hydrateDiagnosticSelections(review: HumanReview): void {
    const savedActions = review.improvement_actions ?? [];
    const diagnostics = review.source_checks?.['_diagnostics'];
    const diagnosticsFailureTags = Array.isArray(diagnostics?.failure_tags) ? diagnostics.failure_tags : [];
    const diagnosticsContextQuality = Array.isArray(diagnostics?.context_quality) ? diagnostics.context_quality : [];

    this.selectedActions.set(savedActions.filter(action =>
      !this.isFailureTag(action) && !this.isContextQualityTag(action)
    ));
    this.selectedFailureTags.set(this.unique([
      ...savedActions.filter(action => this.isFailureTag(action)),
      ...diagnosticsFailureTags,
    ]));
    this.selectedContextQualityTags.set(this.unique([
      ...savedActions.filter(action => this.isContextQualityTag(action)),
      ...diagnosticsContextQuality,
    ]));

    const missingSources = Object.entries(review.source_checks ?? {})
      .filter(([key, value]) => this.isSourceKey(key) && value.status === 'should_have_used')
      .map(([key]) => key as SourceKey);
    this.missingSourceKeys.set(this.unique(missingSources));
  }

  private requestedSourceKeys(): SourceKey[] {
    const fromMeta = this.message.meta?.requested_sources;
    const active = this.message.meta?.sources_active;
    const status = this.message.meta?.source_status ?? {};
    const statusKeys = Object.entries(status)
      .filter(([, value]) => value.requested === true || value.routed === true)
      .map(([key]) => key);
    const raw = [
      ...(fromMeta ?? []),
      ...(active ?? []),
      ...statusKeys,
    ];

    return raw
      .map(item => item === 'domestic' ? 'court' : item === 'law' ? 'matsne' : item)
      .filter((item): item is SourceKey => this.sourceOrder.some(source => source.key === item));
  }

  private usedSourceCounts(): Record<SourceKey, number> {
    const status = this.message.meta?.source_status ?? {};

    return {
      court: Math.max(this.message.citations?.length ?? 0, status['court']?.count ?? 0),
      matsne: Math.max((this.message.matsne_citations?.length ?? 0) + (this.message.law_citations?.length ?? 0), status['matsne']?.count ?? 0),
      echr: Math.max(this.message.echr_citations?.length ?? 0, status['echr']?.count ?? 0),
      eu: Math.max(this.message.eu_citations?.length ?? 0, status['eu']?.count ?? 0),
      german: Math.max(this.message.german_citations?.length ?? 0, status['german']?.count ?? 0),
      const_court: Math.max(this.message.const_court_citations?.length ?? 0, status['const_court']?.count ?? 0),
    };
  }

  private totalUsedSourceCount(): number {
    return Object.values(this.usedSourceCounts()).reduce((sum, count) => sum + count, 0);
  }

  private totalCandidateCount(): number | null {
    const total = this.assessableSources.reduce((sum, row) => sum + (row.candidateCount ?? 0), 0);
    return total > 0 ? total : null;
  }

  private totalFilteredCount(): number | null {
    const total = this.assessableSources.reduce((sum, row) => sum + (row.filteredCount ?? 0), 0);
    return total > 0 ? total : null;
  }

  private diagnosticRunStatus(): string {
    if (this.isRetrievalPreview) {
      return 'retrieval_preview_reviewed';
    }

    return 'answer_reviewed';
  }

  private numberFrom(value: unknown, fallback: number | null): number | null {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    return fallback;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }

    const seconds = Math.round(ms / 100) / 10;
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);
    return `${minutes}m ${rest}s`;
  }

  private toggleSignalKey(target: WritableSignal<string[]>, key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    target.update(keys => checked
      ? this.unique([...keys, key])
      : keys.filter(item => item !== key)
    );
  }

  private unique<T>(values: T[]): T[] {
    return Array.from(new Set(values));
  }

  private isSourceKey(value: string): value is SourceKey {
    return this.sourceOrder.some(source => source.key === value);
  }

  private isFailureTag(value: string): boolean {
    return value.startsWith('failure:');
  }

  private isContextQualityTag(value: string): boolean {
    return value.startsWith('context:');
  }

  private parseLines(value: string): string[] {
    return value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  private lines(value: string[] | undefined): string {
    return (value ?? []).join('\n');
  }

  private boundScore(value: number | null): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }

    return Math.min(10, Math.max(1, Number(value)));
  }
}
