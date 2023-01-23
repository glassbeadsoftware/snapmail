import {css, html, PropertyValues} from "lit";
import {Grid, GridColumn} from "@vaadin/grid";
import {GridSortColumn} from "@vaadin/grid/vaadin-grid-sort-column";
import {HorizontalLayout} from "@vaadin/horizontal-layout";
import {TextField} from "@vaadin/text-field";
import {ComboBox} from "@vaadin/combo-box";
import { state, property } from "lit/decorators.js";
import {DEV_MODE, updateTray} from "../electron";
import {stylesTemplate} from "../constants";
import {MailItem} from "../bindings/snapmail.types";
import {
  determineMailCssClass,
  hasMailBeenOpened,
  into_gridItem,
  is_OutMail, isMailDeleted,
  systemFolders
} from "../mail";
import {MenuBar, MenuBarItem} from "@vaadin/menu-bar";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {MailGridItem, SnapmailPerspective} from "../viewModel/snapmail.perspective";
import {SnapmailZvm} from "../viewModel/snapmail.zvm";
import {Icon} from "@vaadin/vaadin-icon";
import '@vaadin/vaadin-icon';
import '@vaadin/vaadin-lumo-styles';
import {Select} from "@vaadin/select";


/** */
function filterMails(mailItems: any[] /*GridItems*/, searchValue: string) {
  const searchTerm = (searchValue || '').trim();
  const matchesTerm = (value: string) => {
    return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
  };
  const filteredItems = mailItems.filter((item) => {
    //console.log({item});
    return (
      !searchTerm
      || matchesTerm(item.username)
      || matchesTerm(item.subject)
      || matchesTerm(item.content)
    );
  });
  return filteredItems;
}


/**
 *
 */
export class SnapmailFilebox extends ZomeElement<SnapmailPerspective, SnapmailZvm> {
  constructor() {
    super(SnapmailZvm.DEFAULT_ZOME_NAME);
    if (DEV_MODE === 'dev') {
      this._menuItems.push({text: 'Refresh', disabled: false});
    }
  }

  // @property({type: Object})
  // mailItems:any;
  //_items:any = []
  @state() private _allMailItems: MailGridItem[] = [];
  @state() private _shownItems: MailGridItem[] = [];
  @state() private _selectedItems: MailGridItem[] = [];
  //_activeItem:any = null;


  private readonly _systemFoldersVec = [
    {label: systemFolders.ALL, value: systemFolders.ALL},
    {label: systemFolders.INBOX, value: systemFolders.INBOX},
    {label: systemFolders.SENT, value: systemFolders.SENT},
    {label: systemFolders.TRASH, value: systemFolders.TRASH},
  ];
  // private readonly _systemFoldersVec: SelectItem[] = [
  //   {label: "bob", value:"bob"},
  //   {label: "marley", value:"marley"},
  // ];


  private _currentFolder: string = this._systemFoldersVec[1].value;

  private _menuItems: MenuBarItem[] =
    [ { text: 'Move', disabled: true }
      , { text: 'Reply', disabled: true, children: [{ text: 'Reply to sender' }, { text: 'Reply to all' }, { text: 'Forward' }] }
      , { text: 'Trash', disabled: true }
      , { text: 'Print', disabled: true }
      //, { text: 'Find', disabled: true }
    ];


  get mailGridElem() : Grid {
    return this.shadowRoot!.getElementById("mailGrid") as Grid;
  }

  get mailSearchElem() : TextField {
    return this.shadowRoot!.getElementById("mailSearch") as TextField;
  }


  get folderElem() : Select {
    return this.shadowRoot!.getElementById("fileboxFolder") as Select;
  }


  /** -- Methods -- */

  resetSelection() {
    this._selectedItems = [];
    //this._activeItem = null;
    this.disableDeleteButton(true)
    this.disableReplyButton(true)
  }

  /** */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    /** Display bold if mail not acknowledged */
    this.mailGridElem.cellClassNameGenerator = (column, rowData: any) => {
      let classes = '';
      const idB64 = rowData.item.id;
      const mailItem: MailItem = this.perspective.mailMap.get(idB64)!;
      classes += determineMailCssClass(mailItem!);
      const is_old = hasMailBeenOpened(mailItem);
      //console.log('hasMailBeenOpened: ', is_old, idB64);
      if (!is_old) {
        classes += ' newmail';
      }
      return classes;
    };

    this.mailGridElem.shadowRoot!.appendChild(stylesTemplate.content.cloneNode(true));

    const fileboxLayout = this.shadowRoot!.getElementById('fileboxLayout') as HorizontalLayout;
    if (DEV_MODE === 'dev') {
      fileboxLayout.style.backgroundColor = "rgba(241,154,154,0.82)";
    }

    this.fillMailGrid();
  }


  /** */
  onMenuItemSelected(e: any) {
    this.dispatchEvent(new CustomEvent('menu-item-selected', { detail: e.detail.value.text, bubbles: true, composed: true }));
    /** Allow delete button */
    if (this._currentFolder !== systemFolders.TRASH) {
      this.disableDeleteButton(false)
      this.disableReplyButton(false)
    }
  }


  /** On item select: Display in inMailArea */
  onMailSelected(e:any) {
    const item = e.detail.value
    this.dispatchEvent(new CustomEvent('mail-item-selected', { detail: item, bubbles: true, composed: true }));
    this._selectedItems = item ? [item] : [];
}


  /** */
  disableDeleteButton(isDisabled: boolean): void {
    console.log("disableDeleteButton() called", isDisabled)
    if (this._menuItems[2].disabled === isDisabled) {
      return;
    }
    this._menuItems[2].disabled = isDisabled;
    this._menuItems[3].disabled = isDisabled;
    this.requestUpdate();
  }

  /** */
  disableReplyButton(isDisabled: boolean): void {
    if (this._menuItems[1].disabled == isDisabled) {
      return;
    }
    this._menuItems[1].disabled = isDisabled;
    this.requestUpdate();
  }


  /** On value change */
  onFolderChange(folderValue: string) {
    this.resetSelection();
    this.update_mailGrid(folderValue)
    this._currentFolder = folderValue;
  }


  /** */
  fillMailGrid() {
    console.log("  fillMailGrid()")
    /** Get currently selected hashs */
    const prevSelected = [];
    if (this.mailGridElem.selectedItems) {
      for (const item of this.mailGridElem.selectedItems) {
        const mailItem: MailGridItem = item as MailGridItem;
        prevSelected.push(mailItem.id);
      }
    }

    let trashCount = 0;
    let inboxCount = 0;
    let sentCount = 0;
    let newCount = 0;

    const selected = [];
    const items = [];

    const selectedBox: string = this.folderElem.value//.codePointAt(0);

    const mailItems: MailItem[] = Object.values(this.perspective.mailMap);
    for (const mailItem of mailItems) {
      //console.log({mailItem})
      const isDeleted = isMailDeleted(mailItem);
      const isOutMail = is_OutMail(mailItem);

      /** Counters */
      if (isOutMail) {
        sentCount = sentCount + 1;
      }
      if (isDeleted) {
        trashCount = trashCount + 1;
      }
      if (!isDeleted && !isOutMail) {
        inboxCount = inboxCount + 1;
      }
      if (determineMailCssClass(mailItem) === 'newmail') {
        newCount = newCount + 1;
      }

      /** Determine if we should add to grid depending on current folder */
      if (isDeleted && selectedBox !== systemFolders.TRASH) {
        continue;
      }
      if (isOutMail && selectedBox === systemFolders.INBOX) {
        continue;
      }
      if (!isOutMail && selectedBox === systemFolders.SENT) {
        continue;
      }
      const gridItem = into_gridItem(this.perspective.usernameMap, mailItem);
      // console.log('gridItem.id = ' + gridItem.id);
      items.push(gridItem);
      if (prevSelected.includes(gridItem.id)) {
        selected.push(gridItem);
      }
    }
    console.log('Counters: ' + newCount + ' / ' + inboxCount + ' / ' + sentCount + ' / ' + trashCount + ' / '+ mailItems.length);

    updateTray(newCount);

    // const systemFoldersVec = [
    //   systemFolders.ALL // + ' ('+ allCount +')'
    //   , newCount === 0 ? systemFolders.INBOX : systemFolders.INBOX + ' ('+ newCount + ')' //+ inboxCount +')'
    //   , systemFolders.SENT // + ' ('+ sentCount +')'
    //   , systemFolders.TRASH // + ' ('+ trashCount +')'
    // ];
    //
    // this.folderElem.items = systemFoldersVec;
    // for (const systemFolder of systemFoldersVec) {
    //   //console.log("systemFolder.codePointAt(0) = " + systemFolder.codePointAt(0));
    //   if (selectedBox == systemFolder) {
    //     this.folderElem.label = systemFolder;
    //     break;
    //   }
    // }

    console.log('mailCount = ' + items.length + ' (' + selected.length + ')');
    this._allMailItems = items;
    this._shownItems = filterMails(this._allMailItems, this.mailSearchElem.value);
    this._selectedItems = selected;
    this.mailGridElem.items = this._shownItems;
    this.mailGridElem.selectedItems = selected;
    this.mailGridElem.activeItem = selected[0];
  }


  /** */
  update_mailGrid(folderValue: string): void {
    const folderItems: MailGridItem[] = [];
    console.log('update_mailGrid', folderValue);

    switch(folderValue) {
      case systemFolders.ALL/*.codePointAt(0)*/:
        for (const mailItem of Object.values(this._allMailItems)) {
          //folderItems = Array.from(g_mail_map.values());
          folderItems.push(mailItem);
        }
        break;
      case systemFolders.INBOX/*.codePointAt(0)*/:
      case systemFolders.SENT/*.codePointAt(0)*/:
        console.log("this.perspective.mailMap", this.perspective.mailMap)
        for (const mailItem of Object.values(this._allMailItems)) {
          console.log('mailItem', mailItem.id);
          const mail = this.perspective.mailMap.get(mailItem.id);
          const is_out = is_OutMail(mail);
          if (isMailDeleted(mail)) {
            continue;
          }
          if (is_out && folderValue == systemFolders.SENT/*.codePointAt(0)*/) {
            folderItems.push(mailItem);
            continue;
          }
          if (!is_out && folderValue == systemFolders.INBOX/*.codePointAt(0)*/) {
            folderItems.push(mailItem);
          }
        }
        break;
      case systemFolders.TRASH/*.codePointAt(0)*/: {
        for (const mailItem of Object.values(this._allMailItems)) {
          if(isMailDeleted(this.perspective.mailMap.get(mailItem.id))) {
            folderItems.push(mailItem);
          }
        }
      }
        break;
      default:
        console.error('Unknown folder')
    }

    const span = this.shadowRoot!.getElementById('messageCount') as HTMLElement;
    console.assert(span);
    span.textContent = '' + folderItems.length;

    console.log('folderItems count: ' + folderItems.length);
    this._shownItems = filterMails(folderItems, this.mailSearchElem.value);
    console.log('update_mailGrid() _shownItems', this._shownItems);
    
    // /** - Re-activate activeItem */
    // const activeItem: MailGridItem = this.mailGridElem.activeItem as MailGridItem;
    // if (activeItem !== undefined && activeItem !== null) {
    //   console.log(activeIdB64);
    //   for(const item of Object.values(this.mailGridElem.items)) {
    //     const mailGridItem: MailGridItem = item as MailGridItem;
    //     //console.log('Item id = ', item.id);
    //     if(activeIdB64 === mailGridItem.id) {
    //       //console.log('activeItem match found');
    //       this.mailGridElem.activeItem = item;
    //       this.mailGridElem.selectedItems = [item];
    //       break;
    //     }
    //   }
    // }
  }


  /** */
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<snapmail-filebox>.willUpdate()", this._systemFoldersVec);

    /** Handle mails from perspective */
    if (changedProperties.has('perspective')) {
      this._allMailItems = [];
      for (const mailItem of this.perspective.mailMap.values()) {
        this._allMailItems.push(into_gridItem(this.perspective.usernameMap, mailItem));
      }
      if (!this.folderElem || !this.mailGridElem) {
        return;
      }
      try {
        /** Update mailGrid */
        this.update_mailGrid(this.folderElem.value);
        /** Update active Item */
        console.log('<snapmail-filebox>.willUpdate() activeItem = ', this.mailGridElem.activeItem);
        if(this.mailGridElem.activeItem) {
          let newActiveItem = null;
          for(const item of this.mailGridElem.items!) {
            const mailItem: MailGridItem = item as MailGridItem;
            if(mailItem.id === this.mailGridElem.activeItem.id) {
              newActiveItem = mailItem;
              break;
            }
          }
          this.mailGridElem.selectItem(newActiveItem);
        }
      } catch(e) {
        console.error("<snapmail-filebox>.willUpdate() failed", e)
      }
    }
  }



  /**
   */
  render() {
    console.log("*** <snapmail-filebox>.render()", this._shownItems);
    return html`
        <!-- FILEBOX MENU -->
        <vaadin-horizontal-layout theme="spacing-xs" id="fileboxLayout" style="width:100%;">
            <vaadin-select id="fileboxFolder" 
                           style="user-select: none; -khtml-user-select: none; -webkit-user-select: none"
                           .items="${this._systemFoldersVec}"
                           .value="${this._currentFolder}"
                           @change="${(e:any) => {this.onFolderChange(e.target.value)}}"
            ></vaadin-select>

            <vaadin-menu-bar id="fileboxMenu" open-on-hover 
                             style="margin-top:2px"
                             .items="${this._menuItems}"
                             @item-selected="${this.onMenuItemSelected}"
            ></vaadin-menu-bar>

            <span style="padding:12px 0px 0px 5px;margin-right: 10px;">messages: <span id="messageCount">0</span></span>
            <vaadin-text-field id="mailSearch" clear-button-visible 
                               placeholder="Search" 
                               @value-changed="${(e:any) => {this._shownItems = filterMails(this._allMailItems, e.detail.value)}}"
                               style="width: 25%; margin-left: auto;margin-right: 5px;">
                <vaadin-icon slot="prefix" icon="lumo:search"></vaadin-icon>
            </vaadin-text-field>
        </vaadin-horizontal-layout>

        <!-- FILEBOX AREA -->
        <vaadin-grid id="mailGrid" theme="compact" multiSort
                     style="min-height:50px; margin-top:0;height: auto;"
                     .items="${this._shownItems}"
                     @active-item-changed="${this.onMailSelected}"
                     >
            <!--  <vaadin-grid-selection-column width="2em" auto-select></vaadin-grid-selection-column>-->
            <vaadin-grid-column path="id" header="id" width="0em" hidden></vaadin-grid-column>
            <!-- <vaadin-grid-column header="A" width="60px" flex-grow="0" text-align="end"></vaadin-grid-column>-->
            <vaadin-grid-sort-column path="status" header=" " width="50px" flex-grow="0"></vaadin-grid-sort-column>
            <vaadin-grid-sort-column path="username" header="Who" width="100px"></vaadin-grid-sort-column>
            <vaadin-grid-sort-column path="subject" header="Subject" width="500px"></vaadin-grid-sort-column>
            <vaadin-grid-sort-column path="date" header="Date"></vaadin-grid-sort-column>
            <vaadin-grid-sort-column path="attachment" header=" " width="50px" flex-grow="0"></vaadin-grid-sort-column>
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
      "vaadin-icon": Icon,
      'vaadin-select': Select,
      'vaadin-grid':Grid,
      'vaadin-grid-column':GridColumn,
      'vaadin-grid-sort-column':GridSortColumn,
      'vaadin-horizontal-layout': HorizontalLayout,
      'vaadin-text-field':TextField,
      'vaadin-menu-bar': MenuBar,
    }
  }
}
