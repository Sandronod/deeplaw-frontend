import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { MatsneSearchService } from '../../core/services/matsne-search.service';
import {
  MatsneDocumentDetail,
  MatsneSearchParams,
  MatsneSearchResponse,
  MatsneSearchResult,
  MatsneSearchScope,
  MatsneSearchSort,
} from '../../core/models/matsne-search.model';

@Component({
  selector: 'app-matsne-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header class="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div class="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <a routerLink="/" class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z"/>
                <path d="M8 7h7M8 11h7M8 15h4"/>
              </svg>
            </span>
            <span class="text-sm font-semibold tracking-tight">LexAI</span>
          </a>

          <nav class="flex items-center gap-2">
            <a routerLink="/" class="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100">
              მთავარი
            </a>
            @if (auth.isAuthenticated()) {
              <a routerLink="/chats" class="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100">
                ჩატი
              </a>
            }
          </nav>
        </div>
      </header>

      <main class="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6">
        <form (ngSubmit)="submitSearch()" class="border-b border-gray-200 pb-4 dark:border-gray-800">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label class="flex-1">
              <span class="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">ძებნა მაცნეში</span>
              <div class="relative">
                <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="7"/>
                  <path d="m20 20-3.5-3.5"/>
                </svg>
                <input
                  name="q"
                  [(ngModel)]="filters.q"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-700 dark:bg-gray-900"
                  placeholder="დასახელება, სარეგისტრაციო კოდი, მიმღები ორგანო..."
                />
              </div>
            </label>

            <label class="w-full lg:w-52">
              <span class="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">დალაგება</span>
              <select
                name="sort"
                [(ngModel)]="filters.sort"
                class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-gray-700 dark:bg-gray-900"
              >
                @for (option of sortOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>

            <button
              type="submit"
              [disabled]="loading()"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              @if (loading()) {
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" stroke-opacity="0.25"/>
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
              } @else {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="11" cy="11" r="7"/>
                  <path d="m20 20-3.5-3.5"/>
                </svg>
              }
              ძებნა
            </button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            @for (scope of scopeOptions; track scope.value) {
              <button
                type="button"
                (click)="setScope(scope.value)"
                class="h-9 rounded-lg border px-3 text-xs font-semibold transition"
                [ngClass]="filters.scope === scope.value
                  ? 'border-accent bg-accent text-white'
                  : 'border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'"
              >
                {{ scope.label }}
              </button>
            }
          </div>
        </form>

        <div class="grid min-h-[calc(100vh-170px)] gap-4 lg:grid-cols-[304px_minmax(0,1fr)]">
          <aside class="h-fit rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold">ფილტრები</h2>
              <button
                type="button"
                (click)="clearFilters()"
                class="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                გასუფთავება
              </button>
            </div>

            <div class="space-y-3">
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">სტატუსი</span>
                <select name="status" [(ngModel)]="filters.status" class="filter-input">
                  <option value="">ყველა</option>
                  <option value="active">მოქმედი</option>
                  <option value="repealed">ძალადაკარგული</option>
                  <option value="pending">ასამოქმედებელი</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">დოკუმენტის ტიპი</span>
                <input name="doc_type" [(ngModel)]="filters.doc_type" class="filter-input" placeholder="საქართველოს კანონი" />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">მიმღები ორგანო</span>
                <input name="issuer" [(ngModel)]="filters.issuer" class="filter-input" placeholder="საქართველოს პარლამენტი" />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">სარეგისტრაციო კოდი</span>
                <input name="registration_code" [(ngModel)]="filters.registration_code" class="filter-input" placeholder="010.190.040" />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">დოკუმენტის ნომერი</span>
                <input name="doc_number" [(ngModel)]="filters.doc_number" class="filter-input" placeholder="3591" />
              </label>

              <div class="grid grid-cols-2 gap-2">
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">მიღებიდან</span>
                  <input name="signing_from" [(ngModel)]="filters.signing_from" type="date" class="filter-input" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">მიღებამდე</span>
                  <input name="signing_to" [(ngModel)]="filters.signing_to" type="date" class="filter-input" />
                </label>
              </div>

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">მოქმედია თარიღზე</span>
                <input name="effective_at" [(ngModel)]="filters.effective_at" type="date" class="filter-input" />
              </label>

              <div class="grid grid-cols-2 gap-2">
                <label class="block">
                  <span class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">გვერდზე</span>
                  <select name="per_page" [(ngModel)]="filters.per_page" class="filter-input">
                    <option [ngValue]="10">10</option>
                    <option [ngValue]="20">20</option>
                    <option [ngValue]="50">50</option>
                  </select>
                </label>
                <div class="flex items-end">
                  <button
                    type="button"
                    (click)="search(1)"
                    class="h-10 w-full rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 transition hover:border-accent hover:text-accent dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    გამოყენება
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <section class="min-w-0">
            <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 class="text-lg font-semibold tracking-tight">მაცნეს საძიებო სისტემა</h1>
                @if (response()) {
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    ნაპოვნია {{ totalLabel() }} ჩანაწერი · გვერდი {{ response()!.meta.page }} / {{ lastPageLabel() }}
                  </p>
                } @else {
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">ოფიციალური დოკუმენტების ძებნა ლოკალურ ბაზაში</p>
                }
              </div>

              @if (filters.scope === 'content' || filters.scope === 'all') {
                <span class="inline-flex h-8 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  სრული ტექსტი უფრო მძიმე რეჟიმია
                </span>
              }
            </div>

            @if (error()) {
              <div class="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {{ error() }}
              </div>
            }

            @if (loading()) {
              <div class="space-y-3">
                @for (_ of loadingRows; track $index) {
                  <div class="h-28 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div class="skeleton h-4 w-2/3 rounded"></div>
                    <div class="mt-3 skeleton h-3 w-5/6 rounded"></div>
                    <div class="mt-2 skeleton h-3 w-3/5 rounded"></div>
                  </div>
                }
              </div>
            } @else if (response()?.results?.length) {
              <div class="space-y-3">
                @for (row of response()!.results; track row.matsne_id) {
                  <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/60 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
                    <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div class="min-w-0">
                        <div class="mb-2 flex flex-wrap items-center gap-2">
                          <span class="inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold" [ngClass]="statusClass(row)">
                            {{ statusLabel(row) }}
                          </span>
                          @if (row.doc_type) {
                            <span class="text-xs text-gray-500 dark:text-gray-400">{{ row.doc_type }}</span>
                          }
                          @if (row.registration_code) {
                            <span class="rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ row.registration_code }}</span>
                          }
                        </div>

                        <h2 class="text-base font-semibold leading-snug text-gray-950 dark:text-white">
                          {{ row.title || 'Matsne #' + row.matsne_id }}
                        </h2>

                        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>ID: {{ row.matsne_id }}</span>
                          @if (row.issuer) { <span>{{ row.issuer }}</span> }
                          @if (row.publish_date || row.signing_date) { <span>{{ row.publish_date || row.signing_date }}</span> }
                          @if (row.domain) { <span>{{ row.domain }}</span> }
                        </div>
                      </div>

                      <div class="flex shrink-0 items-center gap-2">
                        <span class="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {{ row.rank_score }}
                        </span>
                        <button
                          type="button"
                          (click)="openDocument(row)"
                          class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:border-accent hover:text-accent dark:border-gray-700 dark:text-gray-200"
                        >
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z"/>
                            <path d="M8 7h7M8 11h7M8 15h4"/>
                          </svg>
                          გახსნა
                        </button>
                      </div>
                    </div>

                    @if (row.excerpt) {
                      <p class="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {{ row.excerpt }}
                      </p>
                    }

                    <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      @if (row.doc_number) { <span>№ {{ row.doc_number }}</span> }
                      @if (row.effective_from) { <span>ძალაშია: {{ row.effective_from }}</span> }
                      @if (row.effective_to) { <span>ძალადაკარგულია: {{ row.effective_to }}</span> }
                      @if (row.metadata_fetched) { <span>official metadata</span> }
                    </div>
                  </article>
                }
              </div>

              <div class="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  (click)="search(response()!.meta.page - 1)"
                  [disabled]="response()!.meta.page <= 1 || loading()"
                  class="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                >
                  უკან
                </button>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ pageRangeLabel() }}
                </span>
                <button
                  type="button"
                  (click)="search(response()!.meta.page + 1)"
                  [disabled]="response()!.meta.page >= response()!.meta.last_page || loading()"
                  class="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                >
                  წინ
                </button>
              </div>
            } @else {
              <div class="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-center dark:border-gray-800 dark:bg-gray-900">
                <div class="max-w-sm px-6">
                  <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="7"/>
                      <path d="m20 20-3.5-3.5"/>
                    </svg>
                  </div>
                  <h2 class="text-sm font-semibold">შედეგი ვერ მოიძებნა</h2>
                  <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    სცადე სხვა სიტყვა, მოკლე ფრაზა ან მხოლოდ სარეგისტრაციო კოდის ნაწილი.
                  </p>
                </div>
              </div>
            }
          </section>
        </div>
      </main>

      @if (selectedDocument() || documentLoading()) {
        <div class="fixed inset-0 z-50 flex bg-black/55 p-0 backdrop-blur-sm lg:p-4" (click)="closeDocument()">
          <section
            class="ml-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950 lg:rounded-lg"
            (click)="$event.stopPropagation()"
          >
            <header class="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5">
              <div class="min-w-0">
                @if (selectedDocument()) {
                  <div class="mb-1.5 flex flex-wrap items-center gap-2">
                    <span class="inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold" [ngClass]="statusClass(selectedDocument()!)">
                      {{ statusLabel(selectedDocument()!) }}
                    </span>
                    @if (selectedDocument()!.doc_type) {
                      <span class="text-xs text-gray-500 dark:text-gray-400">{{ selectedDocument()!.doc_type }}</span>
                    }
                    @if (selectedDocument()!.registration_code) {
                      <span class="rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ selectedDocument()!.registration_code }}</span>
                    }
                  </div>
                  <h2 class="text-base font-semibold leading-snug text-gray-950 dark:text-white sm:text-lg">
                    {{ selectedDocument()!.title || 'Matsne #' + selectedDocument()!.matsne_id }}
                  </h2>
                  <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>ID: {{ selectedDocument()!.matsne_id }}</span>
                    @if (selectedDocument()!.issuer) { <span>{{ selectedDocument()!.issuer }}</span> }
                    @if (selectedDocument()!.publish_date || selectedDocument()!.signing_date) {
                      <span>{{ selectedDocument()!.publish_date || selectedDocument()!.signing_date }}</span>
                    }
                    @if (selectedDocument()!.content_length) {
                      <span>{{ selectedDocument()!.content_length.toLocaleString() }} სიმბოლო</span>
                    }
                  </div>
                } @else {
                  <div class="skeleton h-5 w-72 rounded"></div>
                  <div class="mt-3 skeleton h-3 w-96 max-w-full rounded"></div>
                }
              </div>

              <button
                type="button"
                (click)="closeDocument()"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-900 dark:hover:text-white"
                aria-label="დახურვა"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </header>

            @if (documentLoading()) {
              <div class="flex-1 space-y-4 overflow-hidden p-5">
                <div class="skeleton h-4 w-full rounded"></div>
                <div class="skeleton h-4 w-11/12 rounded"></div>
                <div class="skeleton h-4 w-10/12 rounded"></div>
                <div class="skeleton h-4 w-full rounded"></div>
                <div class="skeleton h-4 w-8/12 rounded"></div>
              </div>
            } @else if (documentError()) {
              <div class="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <h3 class="text-sm font-semibold text-red-600 dark:text-red-300">დოკუმენტი ვერ გაიხსნა</h3>
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ documentError() }}</p>
                </div>
              </div>
            } @else if (selectedDocument()) {
              <div class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
                <aside class="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50 lg:border-b-0 lg:border-r">
                  <dl class="space-y-3 text-xs">
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">მიღების თარიღი</dt>
                      <dd class="mt-0.5 font-medium text-gray-800 dark:text-gray-100">{{ selectedDocument()!.signing_date || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">გამოქვეყნების თარიღი</dt>
                      <dd class="mt-0.5 font-medium text-gray-800 dark:text-gray-100">{{ selectedDocument()!.publish_date || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">ძალაში შესვლა</dt>
                      <dd class="mt-0.5 font-medium text-gray-800 dark:text-gray-100">{{ selectedDocument()!.effective_from || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">ძალის დაკარგვა</dt>
                      <dd class="mt-0.5 font-medium text-gray-800 dark:text-gray-100">{{ selectedDocument()!.effective_to || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">დოკუმენტის ნომერი</dt>
                      <dd class="mt-0.5 font-medium text-gray-800 dark:text-gray-100">{{ selectedDocument()!.doc_number || '-' }}</dd>
                    </div>
                    @if (selectedDocument()!.publication_source) {
                      <div>
                        <dt class="text-gray-500 dark:text-gray-400">გამოქვეყნების წყარო</dt>
                        <dd class="mt-0.5 font-medium leading-5 text-gray-800 dark:text-gray-100">{{ selectedDocument()!.publication_source }}</dd>
                      </div>
                    }
                  </dl>
                </aside>

                <div class="min-h-0 overflow-y-auto px-4 py-5 sm:px-7">
                  @if (selectedDocument()!.content_html) {
                    <div class="matsne-document-html" [innerHTML]="selectedDocument()!.content_html"></div>
                  } @else if (selectedDocument()!.content) {
                    <div class="whitespace-pre-wrap text-[15px] leading-8 text-gray-800 dark:text-gray-100">
                      {{ selectedDocument()!.content }}
                    </div>
                  } @else {
                    <div class="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      ტექსტი ამ ჩანაწერისთვის ჯერ არ არის შენახული.
                    </div>
                  }
                </div>
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .filter-input {
      height: 2.5rem;
      width: 100%;
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #fff;
      padding: 0 0.75rem;
      font-size: 0.8125rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .filter-input:focus {
      border-color: #10a37f;
      box-shadow: 0 0 0 2px rgb(16 163 127 / 0.18);
    }
    :host-context(.dark) .filter-input {
      border-color: #374151;
      background: #111827;
      color: #f9fafb;
    }
    .matsne-document-html {
      overflow-x: auto;
      color: #1f2937;
      font-size: 15px;
      line-height: 1.8;
    }
    :host-context(.dark) .matsne-document-html {
      color: #f3f4f6;
    }
    :host ::ng-deep .matsne-document-html :where(p) {
      margin: 0 0 0.9rem;
    }
    :host ::ng-deep .matsne-document-html :where(h1, h2, h3, h4, h5, h6) {
      margin: 1.25rem 0 0.75rem;
      font-weight: 700;
      line-height: 1.35;
    }
    :host ::ng-deep .matsne-document-html :where(table) {
      width: max-content;
      min-width: 100%;
      border-collapse: collapse;
      margin: 1rem 0 1.25rem;
      font-size: 13px;
      line-height: 1.45;
    }
    :host ::ng-deep .matsne-document-html :where(th, td) {
      border: 1px solid #d1d5db;
      padding: 0.35rem 0.45rem;
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
    }
    :host ::ng-deep .matsne-document-html :where(th) {
      background: #f3f4f6;
      font-weight: 700;
    }
    :host ::ng-deep .matsne-document-html :where(td p, th p) {
      margin: 0;
    }
    :host-context(.dark) ::ng-deep .matsne-document-html :where(th, td) {
      border-color: #374151;
    }
    :host-context(.dark) ::ng-deep .matsne-document-html :where(th) {
      background: #1f2937;
    }
  `],
})
export class MatsneSearchPageComponent implements OnInit {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly response = signal<MatsneSearchResponse | null>(null);
  readonly selectedDocument = signal<MatsneDocumentDetail | null>(null);
  readonly documentLoading = signal(false);
  readonly documentError = signal<string | null>(null);
  readonly loadingRows = Array.from({ length: 5 });

  filters: MatsneSearchParams = {
    q: '',
    scope: 'metadata',
    status: '',
    sort: 'relevance',
    page: 1,
    per_page: 20,
  };

  readonly scopeOptions: Array<{ value: MatsneSearchScope; label: string }> = [
    { value: 'metadata', label: 'მეტადატა' },
    { value: 'title', label: 'სათაური' },
    { value: 'number', label: 'კოდი/ნომერი' },
    { value: 'content', label: 'ტექსტი' },
    { value: 'all', label: 'ყველა' },
  ];

  readonly sortOptions: Array<{ value: MatsneSearchSort; label: string }> = [
    { value: 'relevance', label: 'რელევანტურობა' },
    { value: 'latest', label: 'გამოქვეყნება: ახალი' },
    { value: 'oldest', label: 'გამოქვეყნება: ძველი' },
    { value: 'signing_latest', label: 'მიღება: ახალი' },
    { value: 'signing_oldest', label: 'მიღება: ძველი' },
    { value: 'hierarchy', label: 'იერარქია' },
    { value: 'title', label: 'სათაური' },
  ];

  constructor(
    private route: ActivatedRoute,
    private searchService: MatsneSearchService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.filters.q = q;
    }

    this.search(1);
  }

  submitSearch(): void {
    this.search(1);
  }

  setScope(scope: MatsneSearchScope): void {
    this.filters.scope = scope;
    this.search(1);
  }

  clearFilters(): void {
    const q = this.filters.q;
    const scope = this.filters.scope;
    const perPage = this.filters.per_page;

    this.filters = {
      q,
      scope,
      status: '',
      sort: 'relevance',
      page: 1,
      per_page: perPage,
    };

    this.search(1);
  }

  search(page: number): void {
    this.filters.page = Math.max(1, page);
    this.loading.set(true);
    this.error.set(null);

    this.searchService.search(this.filters)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => this.response.set(response),
        error: () => this.error.set('ძებნა ვერ შესრულდა. გადაამოწმე backend და სცადე თავიდან.'),
      });
  }

  openDocument(row: MatsneSearchResult): void {
    this.documentLoading.set(true);
    this.documentError.set(null);
    this.selectedDocument.set(null);

    this.searchService.getDocument(row.matsne_id)
      .pipe(finalize(() => this.documentLoading.set(false)))
      .subscribe({
        next: document => this.selectedDocument.set(document),
        error: () => this.documentError.set('სრული ტექსტი ვერ ჩაიტვირთა.'),
      });
  }

  closeDocument(): void {
    this.selectedDocument.set(null);
    this.documentError.set(null);
    this.documentLoading.set(false);
  }

  totalLabel(): string {
    const meta = this.response()?.meta;
    if (!meta) return '0';

    return `${meta.total.toLocaleString()}${meta.total_is_exact ? '' : '+'}`;
  }

  lastPageLabel(): number {
    return Math.max(1, this.response()?.meta.last_page ?? 1);
  }

  pageRangeLabel(): string {
    const meta = this.response()?.meta;
    if (!meta) return '';

    const start = (meta.page - 1) * meta.per_page + 1;
    const end = Math.min(meta.total, meta.page * meta.per_page);

    return `${start.toLocaleString()}-${end.toLocaleString()}`;
  }

  statusLabel(row: Pick<MatsneSearchResult, 'official_status'>): string {
    if (row.official_status === 'pending') return 'ასამოქმედებელი';
    if (row.official_status === 'repealed') return 'ძალადაკარგული';

    return 'მოქმედი';
  }

  statusClass(row: Pick<MatsneSearchResult, 'official_status'>): string {
    if (row.official_status === 'pending') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200';
    }

    if (row.official_status === 'repealed') {
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }

    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
  }
}
