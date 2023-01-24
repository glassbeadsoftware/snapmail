import {css, html, LitElement, PropertyValues} from "lit";
import {Grid, GridActiveItemChangedEvent, GridColumn, GridItemModel} from "@vaadin/grid";
import { state, property } from "lit/decorators.js";
import {FileManifest, Mail, MailItem} from "../bindings/snapmail.types";
import {SnapmailPerspective, UsernameMap} from "../viewModel/snapmail.perspective";
import {base64ToArrayBuffer} from "../utils";
import {redStopEmoji, hourGlassEmoji, stylesTemplate, greenCheckEmoji} from "../constants";
import {AttGridItem, systemFolders} from "../mail";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {SnapmailZvm} from "../viewModel/snapmail.zvm";


/**
 *
 */
export class SnapmailAttView extends ZomeElement<SnapmailPerspective, SnapmailZvm> {
  constructor() {
    super(SnapmailZvm.DEFAULT_ZOME_NAME);
  }

  @property({type: Object})
  inMailItem: MailItem;

  _items:any = []
  _selectedItems:any = [];
  //_activeItem:any = null;

  get attachmentGridElem() : Grid {
    return this.shadowRoot!.getElementById("attachmentGrid") as Grid;
  }


  /** -- Methods -- */

  /** */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    this.attachmentGridElem.cellClassNameGenerator = (column, rowData:any) => {
      //console.log({rowData})
      let classes = '';
      if (!rowData.item.hasFile) {
        classes += ' pending';
      } else {
        //classes += ' newmail';
      }
      return classes;
    };

    this.attachmentGridElem.shadowRoot!.appendChild(stylesTemplate.content.cloneNode(true));
  }


  /** */
  async willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('inMailItem')) {
      const missingCount = await this.fillAttachmentGrid(this.inMailItem.mail);
      if (missingCount > 0) {
        this._zvm.getMissingAttachments(this.inMailItem.author, this.inMailItem.ah);
      }
    }
  }



  /** Return manifest with added content field */
  async fetchFile(contentHash: string): Promise<FileManifest | null> {
    let manifest;
    try {
      manifest = await this._zvm.findManifest(contentHash);
    } catch(e) {
      return null;
    }
    const chunks = [];
    let i = 0;
    for (const chunkAddress of manifest.chunks) {
      i++;
      try {
        const chunk = await this._zvm.getChunk(chunkAddress);
        chunks.push(chunk);
      } catch (e) {
        return null;
      }
    }
    /** concat chunks */
    let content = '';
    for (const chunk of chunks) {
      content += chunk;
    }
    manifest.content = content;
    return manifest;
  }


  /** */
  async fillAttachmentGrid(mail: Mail): Promise<number> {
    /** Convert each attachment to gridItem */
    const items = [];
    let missingCount = 0;
    for (const attachmentInfo of mail.attachments) {
      //console.log({attachmentInfo});

      /** Check if attachment is available in local source-chain */
      let hasDownloadedAttachment = false;
      try {
        const _fileManifest = await this._zvm.getManifest(attachmentInfo.manifest_eh);
        hasDownloadedAttachment = true;
      } catch (e:any) {
        // TODO error message?
        missingCount += 1;
      }
      /** Convert to GridItem */
      const item: AttGridItem = {
        fileId: attachmentInfo.data_hash,
        filename: attachmentInfo.filename,
        filesize: Math.ceil(attachmentInfo.orig_filesize / 1024),
        filetype: attachmentInfo.filetype,
        status: hasDownloadedAttachment? ' ' : redStopEmoji,
        hasFile: hasDownloadedAttachment,
      };
      items.push(item)
    }

    /** Reset grid */
    //console.log({items})
    this._items = items;
    this._selectedItems = [];
    //this._activeItem = null;

    /** Done */
    console.log({missingCount})
    return missingCount;
  }


  /** */
  async onActiveChanged(item: AttGridItem) {
      console.log({item})
      //this._activeItem = null;
      this._selectedItems = [];

      if (!item || !item.hasFile) {
        return;
      }

      if (!this._selectedItems.includes(item)) {
        item.status = hourGlassEmoji;
        this._selectedItems.push(item);
        item.disabled = true;
      }

      /** Get File on source chain */
      const manifest = await this.fetchFile(item.fileId)

      if (!manifest) {
        return;
      }
      //console.log({ manifest })
      item.status = greenCheckEmoji;
      //this.attachmentGridElem.deselectItem(item);

      /** DEBUG - check if content is valid base64 */
        // if (!base64regex.test(manifest.content)) {
        //   const invalid_hash = sha256(manifest.content);
        //   console.error("File '" + manifest.filename + "' is invalid base64. hash is: " + invalid_hash);
        // }

      let filetype = manifest.filetype;
      const fields = manifest.filetype.split(':');
      if (fields.length > 1) {
        const types = fields[1].split(';');
        filetype = types[0];
      }
      const byteArray = base64ToArrayBuffer(manifest.content!)
      const blob = new Blob([byteArray], { type: filetype});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename || 'download';
      a.addEventListener('click', () => {}, false);
      a.click();
      //this._activeItem = null;
      this._selectedItems = [];
    }


  /** */
  render() {
    return html`
        <!-- ATTACHMENT GRID -->
        <vaadin-grid theme="no-row-borders" id="attachmentGrid"
                     style="border-style:dotted; height:auto;"
                     .items="${this.inMailItem? this.inMailItem.mail.attachments : []}"
                     .selectedItems="${this._selectedItems}"
                     @active-item-changed="${(e: any) => {this.onActiveChanged(e.detail.value)}}">
            <vaadin-grid-column path="status" header=" " width="40px" flex-grow="0"></vaadin-grid-column>
            <vaadin-grid-column auto-width path="filename" header="Attachments"></vaadin-grid-column>
            <vaadin-grid-column auto-width path="filesize" text-align="end" header="KiB"></vaadin-grid-column>
            <vaadin-grid-column path="filetype" hidden></vaadin-grid-column>
            <vaadin-grid-column path="fileId" hidden></vaadin-grid-column>
        </vaadin-grid>
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
      'vaadin-grid':Grid,
      'vaadin-grid-column':GridColumn,
    }
  }
}
