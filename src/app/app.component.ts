import { Component, Sanitizer } from '@angular/core';
import { DocScannerConfig } from 'src/lib/ngx-document-scanner';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Capture } from './models/Capture';
import jsPDF from 'jspdf';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { async } from 'rxjs/internal/scheduler/async';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit {

  deviceSelected: string;
  availableDevices: MediaDeviceInfo[];
  devicesList: MediaDeviceInfo[];
  deviceCurrent: MediaDeviceInfo;
  hasDevices: boolean;
  hasPermission: boolean;
  emptyDevice: MediaDeviceInfo;


  // // CAMERA
  WIDTH = 640;
  HEIGHT = 480;

  @ViewChild("video")
  public video: ElementRef;

  @ViewChild("canvas")
  public canvas: ElementRef;

  captureModel: Capture
  captures: Capture[];
  error: string;
  isCaptured: boolean;

  // //CROP
  overZone = false;
  image: File;
  processing: boolean;
  test: boolean;
  config: DocScannerConfig;

  isCameraOpen: boolean
  isGalleryOpen: boolean
  doneCrop: boolean;

  EXIT: string
  ROTATE: string
  DONE_CROP: string
  BACK: string
  FILTER: string
  UPLOAD: string
  urlOriginal: string
  captureEditing: Capture

  constructor(private sanitizer_: DomSanitizer) {
    this.availableDevices = []
    this.isCaptured = false;
    this.emptyDevice = {
      deviceId: '',
      groupId: '',
      kind: null,
      label: '',
      toJSON: null
    }
    this.deviceCurrent = this.emptyDevice

    this.captures = [];
    this.config = {
      editorBackgroundColor: '#fefefe',
      buttonThemeColor: 'primary',
      cropToolColor: '#0D94EA',
      cropToolShape: 'rect',
      cropToolDimensions: {
        width: 16,
        height: 16
      },
      exportImageIcon: 'save',
      editorDimensions: {
        width: '99vw',
        height: 'auto' //'82vh'
      },
      extraCss: {
        position: 'flex',
        top: 0,
        left: 0,

      }
    };

    this.isCameraOpen = false
    this.isGalleryOpen = false
    this.doneCrop = false

    this.EXIT = 'exit'
    this.ROTATE = 'rotate'
    this.DONE_CROP = 'done_crop'

    this.BACK = 'back'
    this.FILTER = 'filter'
    this.UPLOAD = 'upload'
    this.urlOriginal = ''
    this.captureEditing = null

  }

  onInit() {
  }

  async ngAfterViewInit() {
    await this.getPermissions()
    this.onCamerasFound()
  }

  openCamera() {
    this.isCameraOpen = true
    this.isGalleryOpen = false
  }
  openGallery() {
    this.isGalleryOpen = true
    this.isCameraOpen = false
  }

  onHasPermission(has: boolean) {
    this.hasPermission = has;
  }

  async getPermissions() {
    await navigator.mediaDevices.getUserMedia({ video: true })
      .then(success => this.onHasPermission(true))
      .catch(err => this.onHasPermission(false))
  }

  onCamerasFound() {
    if (this.hasPermission && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          devices.forEach((device) => {
            if (String(device.kind) === 'videoinput') {
              this.availableDevices.push(device);
            }
          })
          this.hasDevices = Boolean(devices && devices.length);
        })
        .catch((err) => {
          console.error(`${err.name}: ${err.message}`);
        });
    }

  }

  async onDeviceSelectChange(selected: string) {
    const selectedStr = selected || '';
    if (this.deviceSelected === selectedStr) { return; }
    this.deviceSelected = selectedStr;
    const device = this.availableDevices.find(x => x.deviceId === selected);
    this.deviceCurrent = device || this.emptyDevice;
    if (selected != '') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: this.deviceCurrent.deviceId } })
        if (stream) {
          this.video.nativeElement.srcObject = stream;
          this.video.nativeElement.play();
          this.error = null;
        } else {
          this.video.nativeElement.srcObject = null;
          this.video.nativeElement.stop();
          this.error = "You have no output video device";
        }
      } catch (e) {
        this.error = e;
      }
    } else {
      this.video.nativeElement.srcObject = null;
      this.error = null;
    }

  }

 async dropFile(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files.item(0)) {
      const file = event.dataTransfer.files.item(0);
      if (this.isImage(file)) {
        let imageBase64 = await this.blobToBase64(URL.createObjectURL(file))
        this.urlOriginal = String(imageBase64);
        this.loadFile(file);
      } else {
        this.overZone = false;
      }
    }
  }

  capture() {
    this.drawImageToCanvas(this.video.nativeElement);
    let imageBase64 = this.canvas.nativeElement.toDataURL("image/png")
    // this.urlOriginal =  URL.createObjectURL(this.convertBase64ToBlob(imageBase64))
    this.urlOriginal = imageBase64;
    let date = new Date().toLocaleTimeString()
    let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`
    let file = this.dataURLtoFile(imageBase64, `${filename}.png`)
    this.loadFile(file)
    this.isCaptured = true;
    this.isCameraOpen = false;

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

  loadFile(event) {
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

  drawImageToCanvas(image) {
    this.canvas.nativeElement
      .getContext("2d")
      .drawImage(image, 0, 0, this.WIDTH, this.HEIGHT);
  }


  editResult(result: Blob) {
    // this.setStyles()
    let date = new Date().toLocaleTimeString()
    let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`


    if (this.captureEditing == null) {
      this.captureModel = {
        id: filename,
        url: URL.createObjectURL(result),
        safeUrl: this.sanitizer_.bypassSecurityTrustUrl(URL.createObjectURL(result)),
        // urlOriginal:  this.sanitizer_.bypassSecurityTrustUrl(this.urlOriginal)
        imageBase64: this.urlOriginal
      }

      this.captures.push(this.captureModel);
    } else {
      this.captures.forEach(capture => {
        if (capture.id == this.captureEditing.id) {
          capture.url = URL.createObjectURL(result);
          capture.safeUrl = this.sanitizer_.bypassSecurityTrustUrl(URL.createObjectURL(result));
        }
      })
    }

    console.log("🚀 ~ file: app.component.ts ~ line 266 ~ AppComponent ~ editResult ~ this.captureModel", this.captureModel)
    const backBtn = <HTMLButtonElement>document.querySelector('button[name="back"]')
    backBtn.click()
    const exitBtn = <HTMLButtonElement>document.querySelector('button[name="exit"]')
    exitBtn.click()
    this.exitEditor()
  }

  editImage(capture: Capture) {
    this.captureEditing = capture
    var file = this.dataURLtoFile(capture.imageBase64, `${capture.id}.png`)
    this.loadFile(file)
    this.isCaptured = true;
    this.isCameraOpen = false;
  }

  exitEditor(message?) {
    console.log(message);
    this.image = null;
    this.isCaptured = false;
    this.isCameraOpen = false;
    this.isGalleryOpen = false;
    this.deviceCurrent = this.emptyDevice
    this.deviceSelected = this.deviceCurrent.deviceId
    this.urlOriginal = ''
    this.captureEditing = null
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
        const imgWidth = 640//this.WIDTH;
        const imgHeight = 480 //this.HEIGHT;
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
          let date = new Date().toLocaleTimeString()
          let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`
          pdf.save(`${filename}.pdf`);
        }
      }

    }

    this.captures = [];


  }

  actionClick(nameButton: string) {
    const button = <HTMLButtonElement>document.querySelector(`button[name="${nameButton}"]`)
    button.click()

    nameButton == this.DONE_CROP && (this.doneCrop = true);
    nameButton == this.ROTATE && (this.doneCrop = false);
    nameButton == this.BACK && (this.doneCrop = false);
    nameButton == this.UPLOAD && (this.doneCrop = false);

  }

  convertBase64ToBlob(base64Image: string) {
    // Split into two parts
    const parts = base64Image.split(';base64,');

    // Hold the content type
    const imageType = parts[0].split(':')[1];

    // Decode Base64 string
    const decodedData = window.atob(parts[1]);

    // Create UNIT8ARRAY of size same as row data length
    const uInt8Array = new Uint8Array(decodedData.length);

    // Insert all character code into uInt8Array
    for (let i = 0; i < decodedData.length; ++i) {
      uInt8Array[i] = decodedData.charCodeAt(i);
    }

    // Return BLOB image after conversion
    return new Blob([uInt8Array], { type: imageType });
  }

 async blobToBase64(url) {
    return new Promise(async (resolve, _) => {
      // do a request to the blob uri
      const response = await fetch(url);

      // response has a method called .blob() to get the blob file
      const blob = await response.blob();

      // instantiate a file reader
      const fileReader = new FileReader();

      // read the file
      fileReader.readAsDataURL(blob);

      fileReader.onloadend = function () {
        resolve(fileReader.result); // Here is the base64 string
      }
    });
  };

}
