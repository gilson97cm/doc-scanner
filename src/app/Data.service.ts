import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private messageSource = new BehaviorSubject<string>("");
  changeVar = this.messageSource.asObservable();

  constructor() { }

  changeMyVar (message: string) {
    this.messageSource.next(message)
  }

}
