import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MatsneDocumentDetail, MatsneSearchParams, MatsneSearchResponse } from '../models/matsne-search.model';

@Injectable({ providedIn: 'root' })
export class MatsneSearchService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(params: MatsneSearchParams): Observable<MatsneSearchResponse> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      httpParams = httpParams.set(key, String(value));
    });

    return this.http.get<MatsneSearchResponse>(`${this.base}/matsne/search`, {
      params: httpParams,
    });
  }

  getDocument(matsneId: number): Observable<MatsneDocumentDetail> {
    return this.http.get<MatsneDocumentDetail>(`${this.base}/matsne/documents/${matsneId}`);
  }
}
