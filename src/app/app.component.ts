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

  //#endregion






  constructor(private sanitizer_: DomSanitizer) {
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


    this.WIDTH = 640;
    this.HEIGHT = 480;

    this.availableDevices = []

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

  }

  onInit() {
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
    await this.onDeviceSelectChange('')
  }

  async getPermissions() {
    await navigator.mediaDevices.getUserMedia({ video: true })
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
      try {
        this.video.nativeElement.srcObject = null;
        this.error = null;
      } catch (error) {
        this.error = error

      }
    }

  }

  capture() {
    this.drawImageToCanvas(this.video.nativeElement);
    let imageBase64 = this.canvas.nativeElement.toDataURL("image/png")
    this.urlOriginal = URL.createObjectURL(this.convertBase64ToBlob(imageBase64))
    // this.urlOriginal = imageBase64;
    let date = new Date().getTime()
    let filename: string = String(date)
    this.captureModel = {
      id: filename,
      urlCrop: this.urlOriginal,// URL.createObjectURL(result),
      safeUrl: this.sanitizer_.bypassSecurityTrustUrl(this.urlOriginal),
      imageFull: imageBase64,
      position: this.captures.length + 1
    }
    this.captures.push(this.captureModel);

  }

  drawImageToCanvas(image) {
    this.canvas.nativeElement
      .getContext("2d")
      .drawImage(image, 0, 0, this.WIDTH, this.HEIGHT);
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

  editResult(result: Blob) {
    let date = new Date().toLocaleTimeString()
    let filename: string = `${date.split(':')[0]}${date.split(':')[1]}${date.split(':')[2]}`


    if (this.captureEditing == null) {
      this.captureModel = {
        id: filename,
        urlCrop: URL.createObjectURL(result),
        safeUrl: this.sanitizer_.bypassSecurityTrustUrl(URL.createObjectURL(result)),
        // urlOriginal:  this.sanitizer_.bypassSecurityTrustUrl(this.urlOriginal)
        imageFull: this.imageFull,
        position: this.capture.length + 1
      }

      this.captures.push(this.captureModel);
    } else {
      this.captures.forEach(capture => {
        if (capture.id == this.captureEditing.id) {
          capture.urlCrop = URL.createObjectURL(result);
          capture.safeUrl = this.sanitizer_.bypassSecurityTrustUrl(URL.createObjectURL(result));
        }
      })
    }


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
    const link = <HTMLAnchorElement> document.createElement('a');
    link.href = String(capture.urlCrop)
    link.setAttribute('download', `${capture.id}.jpeg`);
    link.click();
  }

  deleteAllImages() {
    this.captures = []
    if (this.captureEditing != null)
      this.exitEditor()
  }

  downloadAllImages() {
    this.captures.forEach(capture=>{
      const link = <HTMLAnchorElement> document.createElement('a');
      link.href = String(capture.urlCrop)
      link.setAttribute('download', `${capture.id}.jpeg`);
      link.click();
    })
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
    this.imageFull = ''
    this.captureEditing = null
    this.isEditing = false;
    this.isEnabledCancel = true;
    this.isEnabledButton = false
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

  }

  downloadPdf() {
    this.capturesTemp = this.captures
    let pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageRatio = pageWidth / pageHeight;
    for (let i = 0; i < this.capturesTemp.length; i++) {
      let img = new Image();
      setTimeout(() => {
        img.src = String(this.capturesTemp[i].urlCrop);
      }, 2000);
      img.onload = async () => {
        const imgWidth = 640//this.WIDTH;
        const imgHeight = 480 //this.HEIGHT;
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
    // setTimeout(() => {
    // this.captures = [];
    // }, 2000);
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

  convertBase64ToBlob(base64Image: string) {
    const parts = base64Image.split(';base64,');
    const imageType = parts[0].split(':')[1];
    const decodedData = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(decodedData.length);

    for (let i = 0; i < decodedData.length; ++i) {
      uInt8Array[i] = decodedData.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: imageType });
  }

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
