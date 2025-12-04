import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {GraphComponent} from './graph/graph';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,GraphComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'graphFront';
}
