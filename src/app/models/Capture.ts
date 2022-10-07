import { SafeHtml, SafeUrl } from "@angular/platform-browser";

export class Capture {
    id: string;
    urlCrop: BlobPart;
    safeUrl: SafeUrl;
    imageFull: string
}