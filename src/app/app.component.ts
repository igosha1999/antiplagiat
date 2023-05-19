import {Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import JSZip from 'jszip';
import {HighlightAutoResult, HighlightJS} from "ngx-highlightjs";
import {Subscription} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css']
})
export class AppComponent {
}
