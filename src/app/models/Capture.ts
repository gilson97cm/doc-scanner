import { SafeHtml, SafeUrl } from "@angular/platform-browser";

export class Capture {
    id: string;
    url: BlobPart;
    safeUrl: SafeUrl;
    // urlOriginal: SafeUrl;
    imageBase64: string
}