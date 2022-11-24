import { Component, Sanitizer } from '@angular/core';
import { DocScannerConfig } from 'src/lib/ngx-document-scanner';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Capture } from './models/Capture';
import jsPDF from 'jspdf';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CdkDragDrop, CdkDragEnter, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit {
  //#region VARIABLES
  @ViewChild("video")
  public video: ElementRef;

  @ViewChild("canvas")
  public canvas: ElementRef;

  @ViewChild('dropListContainer')
  public dropListContainer: ElementRef;

  isEnabledButton: boolean
  isCameraOpen: boolean
  isGalleryOpen: boolean
  isEnabledCancel: boolean
  isEditing: boolean = false

  captures: Capture[];

  hasDevices: boolean;
  emptyDevice: MediaDeviceInfo;
  deviceCurrent: MediaDeviceInfo;

  isCaptured: boolean;

  WIDTH: number;
  HEIGHT: number;

  hasPermission: boolean;
  error: string;

  deviceSelected: string;
  deviceSelectedTemp: string;
  availableDevices: MediaDeviceInfo[];

  urlOriginal: string
  imageFull: string
  overZone = false;
  image: File;
  processing: boolean;

  config: DocScannerConfig;

  captureEditing: Capture
  captureModel: Capture

  doneCrop: boolean;

  EXIT: string
  ROTATE: string
  DONE_CROP: string
  BACK: string
  FILTER: string
  UPLOAD: string

  capturesTemp: Capture[]

  dropListReceiverElement?: HTMLElement;
  dragDropInfo?: {
    dragIndex: number;
    dropIndex: number;
  };

  buttonFilterId: string
  isDownloadAll: boolean

  RESOLUTION_WIDTH: 4096
  RESOLUTION_HEIGHT: 2160

  IS_FIREFOX: boolean
  IS_SAFARI: boolean
  //#endregion

  constructor(private sanitizer_: DomSanitizer) {
    this.IS_FIREFOX = navigator.userAgent.indexOf("Firefox") != -1
    this.IS_SAFARI = navigator.userAgent.indexOf("Safari") != -1
    this.isEnabledButton = false
    this.isCameraOpen = false
    this.isGalleryOpen = false
    this.isEnabledCancel = true
    this.captures = [];

    this.emptyDevice = {
      deviceId: '',
      groupId: '',
      kind: null,
      label: '',
      toJSON: null
    }
    this.deviceCurrent = this.emptyDevice
    this.isCaptured = false;


    this.WIDTH = 0//640;
    this.HEIGHT = 0// 480;

    this.availableDevices = []

    this.config = {
      editorBackgroundColor: '#fefefe',
      buttonThemeColor: 'primary',
      cropToolColor: '#0D94EA',
      cropToolShape: 'rect',
      cropToolDimensions: {
        width: 20,
        height: 20
      },
      cropToolLineWeight: 5,
      exportImageIcon: 'save',
      editorDimensions: {
        width: '99vw',
        height: 'auto'// '82vh'
      },
      extraCss: {
        position: 'flex',
        top: 0,
        left: 0,

      }
    };

    this.urlOriginal = ''
    this.captureEditing = null

    this.doneCrop = false

    this.EXIT = 'exit'
    this.ROTATE = 'rotate'
    this.DONE_CROP = 'done_crop'

    this.BACK = 'back'
    this.FILTER = 'filter'
    this.UPLOAD = 'upload'

    this.capturesTemp = []

    this.deviceSelected = ''
    this.deviceSelectedTemp = ''
    this.buttonFilterId = 'filter_0'
    this.isDownloadAll = false
  }

  onInit() {
    window.addEventListener("beforeunload", function (e) {
      var confirmationMessage = "\o/";
      e.returnValue = confirmationMessage;
      return confirmationMessage;
    });
  }

  async ngAfterViewInit() {
    await this.getPermissions()
    this.onCamerasFound()
  }

  openCamera() {
    this.isEnabledButton = true
    this.isCameraOpen = true
    this.isGalleryOpen = false
    this.isEnabledCancel = false
  }

  openGallery() {
    this.isEnabledButton = true
    this.isGalleryOpen = true
    this.isCameraOpen = false
    this.isEnabledCancel = false
  }

  async onCancel() {
    this.isGalleryOpen = false
    this.isCameraOpen = false
    this.isEnabledCancel = true
    this.isEditing = false
    this.isEnabledButton = false
    this.captureEditing = null
    this.deviceSelectedTemp = ''
    this.deviceSelected = ''
    this.deviceCurrent = this.emptyDevice
    this.deviceSelected = this.deviceCurrent.deviceId
    await this.onDeviceSelectChange('')
  }

  async getPermissions() {
    await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: this.RESOLUTION_WIDTH },
        height: { ideal: this.RESOLUTION_HEIGHT }
      }
    })
      .then(success => this.onHasPermission(true))
      .catch(err => this.onHasPermission(false))
  }

  onHasPermission(has: boolean) {
    this.hasPermission = has;
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
    try {
      this.video.nativeElement.srcObject = null;
      this.video.nativeElement.stop();
      this.error = null;
    } catch (error) {
      this.error = error
    }

    const selectedStr = selected || '';
    this.deviceSelected = selectedStr;
    const device = this.availableDevices.find(x => x.deviceId === selectedStr);
    this.deviceCurrent = device || this.emptyDevice;
    if (selectedStr != '') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: this.deviceCurrent.deviceId,
            width: { ideal: this.RESOLUTION_WIDTH },
            height: { ideal: this.RESOLUTION_HEIGHT }
          }
        })

        if (stream) {
          let stream_settings = stream.getVideoTracks()[0].getSettings();
          this.WIDTH = stream_settings.width
          this.HEIGHT = stream_settings.height

          this.video.nativeElement.srcObject = stream;
          this.video.nativeElement.stop();
          this.video.nativeElement.play();
          this.error = null;
        }
      } catch (e) {
        this.error = e;
      }
    }

  }

  capture() {
    this.drawImageToCanvas(this.video.nativeElement);

  //TIMEOUT PENDIENTE
    
    setTimeout(() => {
      let imageBase64 = this.canvas.nativeElement.toDataURL('image/png')
      const blob = this.b64toBlob(imageBase64)

      this.urlOriginal = URL.createObjectURL(blob)
      let date = new Date().getTime()
      let filename: string = String(date)
      var file = this.dataURLtoFile(imageBase64, `${filename}.png`)
      this.imageFull = imageBase64
      this.loadFile(file)
      this.isCaptured = true;
      this.isEditing = true;
    }, 5000);



  }


  drawImageToCanvas(image) {
    this.canvas.nativeElement
      .getContext("2d")
      .drawImage(image, 0, 0);
  }

  dataURLtoFile(dataUrl, filename) {
    var arr = dataUrl.split(','),
    mime ="image/png", // arr[0].match(/:(.*?);/)[1],
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

  editResult(result: Blob) {

    let date = new Date().toLocaleTimeString()
    let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`
    const img = new Image()
    // let imgFull = this.imageFull
    let captureEditing = this.captureEditing

    img.onload = (event: any) => {
      console.log("🚀 ~ editResult ~ event", event.currentTarget.naturalWidth,)
      if (captureEditing == null) {
        this.captureModel = {
          id: filename,
          urlCrop: URL.createObjectURL(result),
          safeUrl: this.sanitizer_.bypassSecurityTrustUrl(URL.createObjectURL(result)),
          imageFull: "",//imgFull,
          position: this.captures.length + 1,
          widthCrop: event.currentTarget.naturalWidth,//this.IS_SAFARI ? event.currentTarget.naturalWidth : event.path[0].naturalWidth,
          heightCrop: event.currentTarget.naturalHeight// this.IS_SAFARI ? event.currentTarget.naturalHeight : event.path[0].naturalHeight
        }

        this.captures.push(this.captureModel);
      } else {
        this.captures.forEach(capture => {
          if (capture.id == captureEditing.id) {
            capture.urlCrop = URL.createObjectURL(result);
            capture.safeUrl = this.sanitizer_.bypassSecurityTrustUrl(URL.createObjectURL(result));
            capture.widthCrop = this.IS_SAFARI ? event.currentTarget.naturalWidth : event.path[0].naturalWidth;
            capture.heightCrop = this.IS_SAFARI ? event.currentTarget.naturalHeight : event.path[0].naturalHeight;

          }
        })
      }

    }
    img.src = URL.createObjectURL(result)

    const backBtn = <HTMLButtonElement>document.querySelector('button[name="back"]')
    backBtn.click()
    const exitBtn = <HTMLButtonElement>document.querySelector('button[name="exit"]')
    exitBtn.click()
    this.exitEditor()
  }

  editImage(capture: Capture) {
    this.captureEditing = capture
    var file = this.dataURLtoFile(capture.imageFull, `${capture.id}.png`)
    this.loadFile(file)
    this.isCaptured = true;
    this.isEditing = true;
  }

  deleteImage(capture: Capture) {
    this.captures = this.captures.filter(x => x.id != capture.id)
    this.captures.map((capture, index) => capture.position = index + 1)

    if (this.captures.length <= 0 && this.captureEditing != null) {
      this.exitEditor()
    }
  }

  downloadImage(capture: Capture) {
    const link = <HTMLAnchorElement>document.createElement('a');
    link.href = String(capture.urlCrop)
    link.setAttribute('download', `${capture.id}.jpeg`);
    link.click();
  }

  deleteAllImages() {
    this.captures = []
    if (this.captureEditing != null)
      this.exitEditor()

    this.clearCache()
  }

  downloadAllImages() {
    for (let i = 0; i < this.captures.length; i++) {
      setTimeout(() => {
        const link = <HTMLAnchorElement>document.createElement('a');
        link.href = String(this.captures[i].urlCrop)
        link.setAttribute('download', `${this.captures[i].position}-image-${this.captures[i].id}.jpeg`);
        document.body.appendChild(link)
        link.click();
        document.body.removeChild(link)
      }, i * 500);
    }
  }

  async exitEditor(message?) {
    this.image = null;
    this.isCaptured = false;
    this.urlOriginal = ''
    this.imageFull = ''
    this.captureEditing = null
    this.isEditing = false;

    this.buttonFilterId = 'filter_0'

    this.deviceSelectedTemp = this.deviceSelected
    await this.onDeviceSelectChange('')

    if (this.deviceSelectedTemp != '') {
      await this.onDeviceSelectChange(this.deviceSelectedTemp)
    }

  }

  onError(err: Error) {
    console.error(err);
  }

  editorState(processing) {
    this.processing = null;
    this.processing = processing;
  }

  actionClick(nameButton: string) {
    const button = <HTMLButtonElement>document.querySelector(`button[name="${nameButton}"]`)
    button.click()

    nameButton == this.DONE_CROP && (this.doneCrop = true);
    nameButton == this.ROTATE && (this.doneCrop = false);
    nameButton == this.BACK && (this.doneCrop = false);
    nameButton == this.UPLOAD && (this.doneCrop = false);

    this.onFilterClick(nameButton)
  }

  onFilterClick(nameButton: String) {
    if (nameButton == 'filter') {
      const buttons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('button[mat-list-item]')
      buttons.forEach((btn, index) => {
        btn.setAttribute('id', `filter_${index}`)
        btn.classList.add('general-button')
        btn.innerHTML = `
        <div class="mat-list-item-content" style="flex-direction: row; box-sizing: border-box; display: flex;">
        <div mat-ripple="" class="mat-ripple mat-list-item-ripple"></div>
        <div class="mat-list-text"></div>
        <span fxflex="100" style="text-align: start; margin: 5px; flex: 1 1 100%; box-sizing: border-box; max-width: 100%;">
         `+ this.setText(index) + `
        </span>
        <span fxflex="100" style="flex: 1 1 100%; box-sizing: border-box; max-width: 100%;"></span>
        `+ this.setDone(`filter_${index}`) + `
        </div>
        `
        btn.addEventListener('click', (e: any) => {
          if (e.path.length == 13)
            this.buttonFilterId = e.path[2].id
          else
            this.buttonFilterId = e.path[1].id
        })
      })

    }
  }

  setText(index): string {
    if (index == 0)
      return ' Original'
    if (index == 1)
      return ' B&W'
    if (index == 2)
      return ' B&W 2'
    if (index == 3)
      return ' B&W 3'
    if (index == 4)
      return 'Magic Color'
  }

  setDone(btnId): string {
    return this.buttonFilterId == btnId ? '<i class="fa fa-check"></i>' : ''
  }

  downloadPdf() {
    this.capturesTemp = this.captures
    let pdf = new jsPDF('l', 'pc', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageRatio = pageWidth / pageHeight;
    for (let i = 0; i < this.capturesTemp.length; i++) {
      let img = new Image();
      setTimeout(() => {
        img.src = String(this.capturesTemp[i].urlCrop);
      }, i * 1000);

      img.onload = async () => {
        const imgWidth = this.capturesTemp[i].widthCrop;
        const imgHeight = this.capturesTemp[i].heightCrop;
        const imgRatio = imgWidth / imgHeight;
        if (i > 0) { await pdf.addPage(); }
        pdf.setPage(i + 1);
        if (imgRatio >= 1) {
          const wc = imgWidth / pageWidth;
          if (imgRatio >= pageRatio) {
            await pdf.addImage(img, 'JPEG', 0, (pageHeight - imgHeight / wc) / 2, pageWidth, imgHeight / wc, null, 'NONE');
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

        if (i == this.capturesTemp.length - 1) {
          let date = new Date().toLocaleTimeString()
          let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`
          pdf.save(`${filename}.pdf`);
        }

      }
    }

    this.clearCache()
  }

  clearCache() {
    caches.keys().then((keyList) => {
      Promise.all(keyList.map((key) => caches.delete(key)))
    })
  }

  async selectFile(event) {
    this.isEditing = true
    if (event.target.files.item(0)) {
      const file = event.target.files.item(0);
      if (this.isImage(file)) {
        let imageBase64 = await this.blobToBase64(URL.createObjectURL(file))
        this.imageFull = String(imageBase64);
        this.loadFile(file);
      } else {
        this.overZone = false;
      }
    }
  }

  b64toBlob(dataURI) {
    
    var byteString = atob(dataURI.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/png' });
}

  // convertBase64ToBlob(base64Image: string) {
  //   const parts = base64Image.split(';base64,');
  //   const imageType = parts[0].split(':')[1];
  //   const decodedData = window.atob(parts[1]);
  //   const uInt8Array = new Uint8Array(decodedData.length);

  //   for (let i = 0; i < decodedData.length; ++i) {
  //     uInt8Array[i] = decodedData.charCodeAt(i);
  //   }

  //   return new Blob([uInt8Array], { type: imageType });
  // }

  async blobToBase64(url) {
    return new Promise(async (resolve, _) => {
      const response = await fetch(url);
      const blob = await response.blob();
      const fileReader = new FileReader();

      fileReader.readAsDataURL(blob);
      fileReader.onloadend = function () {
        resolve(fileReader.result);
      }
    });
  }

  //REORDER IMAGES

  dragEntered(event: CdkDragEnter<number>) {
    const drag = event.item;
    const dropList = event.container;
    const dragIndex = drag.data;
    const dropIndex = dropList.data;

    this.dragDropInfo = { dragIndex, dropIndex };
    // console.log('dragEntered', { dragIndex, dropIndex });

    const phContainer = dropList.element.nativeElement;
    const phElement = phContainer.querySelector('.cdk-drag-placeholder');

    if (phElement) {
      phContainer.removeChild(phElement);
      phContainer.parentElement?.insertBefore(phElement, phContainer);

      moveItemInArray(this.captures, dragIndex, dropIndex);
      this.captures.map((capture, index) => capture.position = index + 1)

    }
  }

  dragMoved(event: CdkDragMove<number>) {
    if (!this.dropListContainer || !this.dragDropInfo) return;

    const placeholderElement =
      this.dropListContainer.nativeElement.querySelector(
        '.cdk-drag-placeholder'
      );

    const receiverElement =
      this.dragDropInfo.dragIndex > this.dragDropInfo.dropIndex
        ? placeholderElement?.nextElementSibling
        : placeholderElement?.previousElementSibling;

    if (!receiverElement) {
      return;
    }

    receiverElement.style.display = 'none';
    this.dropListReceiverElement = receiverElement;
  }

  dragDropped(event: CdkDragDrop<number>) {
    if (!this.dropListReceiverElement) {
      return;
    }

    this.dropListReceiverElement.style.removeProperty('display');
    this.dropListReceiverElement = undefined;
    this.dragDropInfo = undefined;
  }

}
