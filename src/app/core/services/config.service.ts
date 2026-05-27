import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: { apiUrl: string } = { apiUrl: '/api' };

  load(): Promise<void> {
    return fetch('/assets/config.json')
      .then(r => r.json())
      .then(data => { this.config = data; })
      .catch(() => { /* fallback to default */ });
  }

  get apiUrl(): string {
    return this.config.apiUrl;
  }
}
