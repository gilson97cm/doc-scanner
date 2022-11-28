import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';

import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { AngularDraggableModule } from 'angular2-draggable';
import { LimitsService } from './services/limits.service';
import { FilterMenuComponent } from './components/filter-menu/filter-menu.component';
import { OpenCVConfig } from './PublicModels';
import { ModuleWithProviders } from '@angular/core';
import { ImageEditorComponent } from './components/image-editor/image-editor.component';
import { NgxOpenCVService, OpenCvConfigToken, NgxOpenCVModule } from 'ngx-opencv';
import { DraggablePointComponent } from './components/draggable-point/draggable-point.component';
import { ShapeOutlineComponent } from './components/shape-outline/shape-outline.component';
import { MatIconModule } from '@angular/material/icon';


@NgModule({
  declarations: [
    ImageEditorComponent,
    DraggablePointComponent,
    ShapeOutlineComponent,
    FilterMenuComponent
  ],
  imports: [
    FlexLayoutModule,
    MatButtonModule,
    MatIconModule,
    MatBottomSheetModule,
    MatListModule,
    AngularDraggableModule,
    CommonModule,
    NgxOpenCVModule,

  ],
  exports: [
    FlexLayoutModule,
    MatButtonModule,
    MatIconModule,
    MatBottomSheetModule,
    MatListModule,
    AngularDraggableModule,
    ImageEditorComponent //NgxDocScannerComponent
  ],
  entryComponents: [
    FilterMenuComponent
  ],
  providers: [
    NgxOpenCVService,
    LimitsService
  ]
})
export class NgxDocumentScannerModule {
  static forRoot(config: OpenCVConfig): ModuleWithProviders<NgxDocumentScannerModule> {
    return {
      ngModule: NgxDocumentScannerModule,
      providers: [
        { provide: OpenCvConfigToken, useValue: config }
      ]
    }
  }
}
