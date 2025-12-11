import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly baseUrl = 'http://localhost:8888/api';

  constructor(private http: HttpClient) {}

  post<TRequest, TResponse>(
    url: string,
    body: TRequest,
    options?: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
    }
  ): Observable<TResponse> {
    return this.http.post<TResponse>(`${this.baseUrl}${url}`, body, options);
  }

  get<TResponse>(
    url: string,
    options?: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
    }
  ): Observable<TResponse> {
    return this.http.get<TResponse>(`${this.baseUrl}${url}`, options);
  }
}
