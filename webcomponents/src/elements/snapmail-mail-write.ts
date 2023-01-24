import {css, html, LitElement} from "lit";
import { state, property } from "lit/decorators.js";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {TextArea} from "@vaadin/text-area";
import {TextField} from "@vaadin/text-field";
import {VerticalLayout} from "@vaadin/vertical-layout";
import {Upload} from "@vaadin/upload";
import {UploadFile} from "@vaadin/upload/src/vaadin-upload";



export class SnapmailMailWrite extends ScopedElementsMixin(LitElement) {

  @property()
  subject: string;

  @property()
  content: string;



  /** -- Getters -- */

  getSubject(): string {return this.outMailSubjectElem.value}
  getContent(): string {return this.outMailContentElem.value}

  get outMailSubjectElem() : TextField {
    return this.shadowRoot!.getElementById("outMailSubjectArea") as TextField;
  }

  get outMailContentElem() : TextArea {
    return this.shadowRoot!.getElementById("outMailContentArea") as TextArea;
  }

  get uploadElem() : Upload {
    return this.shadowRoot!.getElementById("myUpload") as Upload;
  }


  get files(): UploadFile[] {return this.uploadElem.files}


  /** -- Methods -- */

  /** */
  reset() {
    this.outMailSubjectElem.value = '';
    this.outMailContentElem.value = '';
    /** clear each attachment */
    this.uploadElem.files = [];
  }


  /** */
  private onUpload(e:any) {
    console.log('upload-before event: ', e);
    const file = e.detail.file;
    //const xhr = event.detail.xhr;
    //console.log({file});

    e.preventDefault(); // Prevent the upload request

    /** Read file just so we can change vaadin's upload-file css */
    const reader = new FileReader();
    reader.addEventListener('loadend', (event:any) => {
      console.log('FileReader loadend event: ', event);
      /** Hide all unnecessary UI */
      const uploadFiles = this.uploadElem.shadowRoot!.querySelectorAll("vaadin-upload-file");
      console.log({uploadFiles});
      uploadFiles.forEach((uploadFile) => {
        const progressBar = uploadFile.shadowRoot!.querySelector("vaadin-progress-bar");
        progressBar!.style.display = 'none';
        const status = uploadFile.shadowRoot!.querySelector('[part="status"]') as HTMLElement;
        status!.style.display = 'none';
        const start = uploadFile.shadowRoot!.querySelector('[part="start-button"]') as HTMLElement;
        start!.style.display = 'none';
      });
    });
    reader.readAsArrayBuffer(file);
  }

  /** */
  render() {
    return html`
        <vaadin-vertical-layout style="height:100%;">
          <vaadin-text-field id="outMailSubjectArea"
                             style="width: 100%;"
                             .value="${this.subject}"
                             placeholder="Write subject here..."
          ></vaadin-text-field>
          <vaadin-text-area id="outMailContentArea"
                            style="width: 100%; height: 100%;padding-bottom:0;"
                            .value="${this.content}"
                            placeholder="Write here..."
          ></vaadin-text-area>
          <vaadin-upload id="myUpload" nodrop
                         style="width:280px; margin-top:0;"
                         max-file-size="8000000" 
                         max-files="10"
                         @file-reject="${(e:any) => {window.alert(e.detail.file.name + ' error: ' + e.detail.error);}}"
                         @upload-before="${this.onUpload}"
          >
            <span slot="drop-label">Maximum file size: 8 MB</span>
          </vaadin-upload>            
        </vaadin-vertical-layout>
    `;
  }

  /** */
  static get styles() {
    return [
      css`
    `];
  }


  /** */
  static get scopedElements() {
    return {
      'vaadin-vertical-layout': VerticalLayout,
      'vaadin-text-field':TextField,
      'vaadin-text-area':TextArea,
      'vaadin-upload': Upload,
    }
  }
}
