import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// import { FlexLayoutModule } from '@angular/flex-layout';
// import { NgxDocumentScannerModule, OpenCVConfig } from 'src/lib/ngx-document-scanner';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ReactiveFormsModule } from '@angular/forms';

import { NgxDocumentScannerModule } from './modules/ngx-document-scanner/ngx-document-scanner.module';
import { OpenCVConfig } from './modules/ngx-document-scanner/PublicModels';
import { WebcamModule } from './modules/webcam/webcam.module';


const openCvConfig: OpenCVConfig = {
  openCVDirPath: './assets/opencv'
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    // FlexLayoutModule,
    MatProgressSpinnerModule,
    NgxDocumentScannerModule.forRoot(openCvConfig),
    BrowserAnimationsModule,
    CommonModule,
    DragDropModule,
    WebcamModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
