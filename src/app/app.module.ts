import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {SafeHtmlPipe} from './safe-html.pipe';
import {HighlightModule, HIGHLIGHT_OPTIONS} from "ngx-highlightjs";
import {HttpClientModule} from "@angular/common/http";
import {HomeComponent} from './home/home.component';
import {AppRoutingModule} from "./app-routing.module";
import {PlagiatComponent} from './plagiat/plagiat.component';
import {FormsModule} from "@angular/forms";

@NgModule({
  declarations: [
    AppComponent,
    SafeHtmlPipe,
    HomeComponent,
    PlagiatComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    HighlightModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        coreLibraryLoader: () => import('highlight.js/lib/core'),
        languages: {
          typescript: () => import('highlight.js/lib/languages/typescript'),
          javascript: () => import('highlight.js/lib/languages/javascript'),
          php: () => import('highlight.js/lib/languages/php'),
        },
      }
    }
  ],
  bootstrap:
    [AppComponent]
})

export class AppModule {
}
