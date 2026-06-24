import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminUser, ApiService, CreateAdminUserPayload } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div class="mx-auto max-w-5xl px-4 py-6">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold">შიდა მომხმარებლები</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ახალი იურისტები და ტესტერები ემატება მხოლოდ მთავარი ადმინის ანგარიშიდან.
            </p>
          </div>
          <a routerLink="/chats" class="rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-white dark:border-gray-800 dark:hover:bg-gray-900">
            ჩატში დაბრუნება
          </a>
        </div>

        @if (!auth.isMainAdmin()) {
          <section class="rounded-lg border border-red-100 bg-white p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300">
            ამ გვერდზე წვდომა აქვს მხოლოდ მთავარ ადმინს.
          </section>
        } @else {
          <section class="grid gap-4 lg:grid-cols-[360px_1fr]">
            <form
              (ngSubmit)="createUser()"
              class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 class="text-sm font-semibold">ახალი მომხმარებელი</h2>

              <div class="grid grid-cols-2 gap-2">
                <label class="admin-field">
                  <span>სახელი</span>
                  <input [(ngModel)]="form.first_name" name="first_name" required />
                </label>
                <label class="admin-field">
                  <span>გვარი</span>
                  <input [(ngModel)]="form.last_name" name="last_name" required />
                </label>
              </div>

              <label class="admin-field">
                <span>ელ. ფოსტა</span>
                <input [(ngModel)]="form.email" name="email" type="email" required />
              </label>

              <label class="admin-field">
                <span>ტელეფონი</span>
                <input [(ngModel)]="form.phone" name="phone" />
              </label>

              <label class="admin-field">
                <span>პაროლი</span>
                <input [(ngModel)]="form.password" name="password" type="password" required minlength="8" />
              </label>

              <label class="admin-field">
                <span>გაიმეორე პაროლი</span>
                <input [(ngModel)]="form.password_confirmation" name="password_confirmation" type="password" required minlength="8" />
              </label>

              @if (error()) {
                <p class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-300">
                  {{ error() }}
                </p>
              }
              @if (success()) {
                <p class="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {{ success() }}
                </p>
              }

              <button
                type="submit"
                [disabled]="saving()"
                class="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white
                       hover:bg-accent-hover disabled:opacity-60"
              >
                {{ saving() ? 'ემატება...' : 'მომხმარებლის დამატება' }}
              </button>
            </form>

            <section class="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <h2 class="text-sm font-semibold">არსებული მომხმარებლები</h2>
              </div>

              @if (loading()) {
                <div class="p-4 text-sm text-gray-500">იტვირთება...</div>
              } @else {
                <div class="divide-y divide-gray-100 dark:divide-gray-800">
                  @for (user of users(); track user.id) {
                    <div class="grid gap-1 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <div class="font-medium">
                        {{ user.first_name }} {{ user.last_name }}
                        @if (user.is_main_admin) {
                          <span class="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">main admin</span>
                        }
                      </div>
                      <div class="text-gray-500 dark:text-gray-400">{{ user.email }}</div>
                      <div class="text-xs text-gray-400">{{ user.created_at | date:'short' }}</div>
                    </div>
                  } @empty {
                    <div class="p-4 text-sm text-gray-500">მომხმარებლები არ ჩანს.</div>
                  }
                </div>
              }
            </section>
          </section>
        }
      </div>
    </main>
  `,
  styles: [`
    .admin-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #4b5563;
    }
    .admin-field > span {
      font-weight: 600;
    }
    .admin-field input {
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid #d1d5db;
      background: #fff;
      padding: 0.55rem 0.65rem;
      color: #111827;
      outline: none;
    }
    @media (prefers-color-scheme: dark) {
      .admin-field {
        color: #d1d5db;
      }
      .admin-field input {
        border-color: #374151;
        background: #030712;
        color: #f9fafb;
      }
    }
  `],
})
export class AdminUsersPageComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);

  users = signal<AdminUser[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  form: CreateAdminUserPayload = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  };

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
      return;
    }

    if (this.auth.isMainAdmin()) {
      this.loadUsers();
    }
  }

  createUser(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.form.password !== this.form.password_confirmation) {
      this.error.set('პაროლები ერთმანეთს არ ემთხვევა.');
      return;
    }

    this.saving.set(true);
    this.api.createAdminUser(this.form)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: user => {
          this.users.update(users => [user, ...users]);
          this.success.set('მომხმარებელი დაემატა.');
          this.form = {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            password: '',
            password_confirmation: '',
          };
        },
        error: err => {
          const errors = err.error?.errors as Record<string, string[]> | undefined;
          const message = err.error?.message
            ?? (errors ? Object.values(errors)[0]?.[0] : null)
            ?? 'მომხმარებლის დამატება ვერ მოხერხდა.';
          this.error.set(message as string);
        },
      });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.api.getAdminUsers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: users => this.users.set(users),
        error: () => this.error.set('მომხმარებლების ჩატვირთვა ვერ მოხერხდა.'),
      });
  }
}
