import { Component } from '@angular/core';
import { DocScannerConfig } from 'src/lib/ngx-document-scanner';
import { OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Capture } from './models/Capture';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit {

  // CAMERA
  WIDTH = 640;
  HEIGHT = 480;

  @ViewChild("video")
  public video: ElementRef;

  @ViewChild("canvas")
  public canvas: ElementRef;

  // captures: any[] = [];
  captureModel: Capture
  captures: Capture[] = [];
  error: any;
  isCaptured: boolean;
  // isScanMode: boolean;

  //CROP
  overZone = false;
  image: File;
  processing: boolean;
  test: boolean;
  config: DocScannerConfig = {
    editorBackgroundColor: '#fafafa',
    buttonThemeColor: 'primary',
    cropToolColor: '#ff4081',
    cropToolShape: 'rect',
    cropToolDimensions: {
      width: 16,
      height: 16
    },
    // cropToolLineWeight:100,
    exportImageIcon: 'save',
    editorDimensions: {
      width: '99vw',
      height: '82vh'
    },
    extraCss: {
      position: 'absolute',
      top: 0,
      left: 0
    }
  };

  constructor(private _sanitizer: DomSanitizer) {
    // this.isScanMode = true;
  }

  async ngAfterViewInit() {
    await this.setupDevices();
  }

  //CAMERA
  async setupDevices() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (stream) {
          this.video.nativeElement.srcObject = stream;
          this.video.nativeElement.play();
          this.error = null;
        } else {
          this.error = "You have no output video device";
        }
      } catch (e) {
        this.error = e;
      }
    }
  }

  capture() {
    this.drawImageToCanvas(this.video.nativeElement);
    let imageUrl = this.canvas.nativeElement.toDataURL("image/png")
    let date = new Date().toLocaleTimeString()
    let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`
    var file = this.dataURLtoFile(imageUrl, `${filename}.png`)
    this.loadFile(file)
    this.isCaptured = true;
  }

  dataURLtoFile(dataUrl, filename) {
    var arr = dataUrl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  loadFile(event: any) {
    this.processing = true;
    this.overZone = false;
    let f: File;
    if (event instanceof File) {
      f = event;
    } else {
      const files = event.target.files;
      f = files[0];
    }
    if (this.isImage(f)) {
      this.image = f;
    }
  }

  isImage(file: File) {
    const types = [
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];
    return types.findIndex(type => {
      return type === file.type;
    }) !== -1;
  }

  drawImageToCanvas(image: any) {
    this.canvas.nativeElement
      .getContext("2d")
      .drawImage(image, 0, 0, this.WIDTH, this.HEIGHT);
  }

  exitEditor(message?) {
    console.log(message);
    this.image = null;
    this.isCaptured = false;
  }

  editResult(result: Blob) {
    let date = new Date().toLocaleTimeString()
    let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`

    this.captureModel = {
      id: filename,
      url: URL.createObjectURL(result)
    }

    this.captures.push(this.captureModel);
    let id = String(this.captureModel.id)
    let url = String(this.captureModel.url)

    const divImages = <HTMLDivElement>document.querySelector('#images')
    const img = <HTMLImageElement>document.createElement('img')
    img.id = id
    img.src = url
    img.style.height = '150px'
    img.style.width = '150px'
    img.style.margin = '5px'
    divImages.appendChild(img)

    this.exitEditor()
  }

  onError(err: Error) {
    console.error(err);
  }

  editorState(processing) {
    this.processing = null;
    this.processing = processing;

  }

  downloadPdf(urls = this.captures) {
    let pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageRatio = pageWidth / pageHeight;
    const divImages = <HTMLDivElement>document.querySelector('#images')
    for (let i = 0; i < this.captures.length; i++) {
      let img = new Image();
      img.src = String(this.captures[i].url);
      img.onload = function () {
        const imgWidth = 500//this.width;
        const imgHeight = 700//this.height;
        const imgRatio = imgWidth / imgHeight;
        if (i > 0) { pdf.addPage(); }
        pdf.setPage(i + 1);
        if (imgRatio >= 1) {
          const wc = imgWidth / pageWidth;
          if (imgRatio >= pageRatio) {
            pdf.addImage(img, 'JPEG', 0, (pageHeight - imgHeight / wc) / 2, pageWidth, imgHeight / wc, null, 'NONE');
          }
          else {
            const pi = pageRatio / imgRatio;
            pdf.addImage(img, 'JPEG', (pageWidth - pageWidth / pi) / 2, 0, pageWidth / pi, (imgHeight / pi) / wc, null, 'NONE');
          }
        }
        else {
          const wc = imgWidth / pageHeight;
          if (1 / imgRatio > pageRatio) {
            const ip = (1 / imgRatio) / pageRatio;
            const margin = (pageHeight - ((imgHeight / ip) / wc)) / 4;
            pdf.addImage(img, 'JPEG', (pageWidth - (imgHeight / ip) / wc) / 2, -(((imgHeight / ip) / wc) + margin), pageHeight / ip, (imgHeight / ip) / wc, null, 'NONE', -90);
          }
          else {

            pdf.addImage(img, 'JPEG', (pageWidth - imgHeight / wc) / 2, -(imgHeight / wc), pageHeight, imgHeight / wc, null, 'NONE', -90);
          }
        }
        if (i == urls.length - 1) {
          pdf.save('Photo.pdf');
        }
      }

      divImages.removeChild(document.getElementById(this.captures[i].id))
    }

    this.captures = [];


  }

  getBase64Image(img) {
    var canvas = document.createElement('canvas');
    console.log(img.width, 'x', img.height);
    canvas.width = 446;
    canvas.height = 631;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL('image/png', 1.0);
    return { img: dataURL, width: (canvas.width), height: (canvas.height) };
  }

}
