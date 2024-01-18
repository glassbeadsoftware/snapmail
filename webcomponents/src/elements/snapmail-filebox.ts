import {css, html, PropertyValues} from "lit";
import {Grid, GridActiveItemChangedEvent} from "@vaadin/grid";
import {HorizontalLayout} from "@vaadin/horizontal-layout";
import {TextField, TextFieldValueChangedEvent} from "@vaadin/text-field";
import { state, property, customElement } from "lit/decorators.js";
import {updateTray} from "../electron";
import {stylesTemplate} from "../constants";
import {MailItem} from "../bindings/snapmail.types";
import {
  determineMailCssClass,
  hasMailBeenOpened,
  into_gridItem,
  is_OutMail, isMailDeleted, MailGridItem,
  systemFolders
} from "../mail";
import {MenuBarItem, MenuBarItemSelectedEvent} from "@vaadin/menu-bar";
import {HAPP_BUILD_MODE, ZomeElement} from "@ddd-qc/lit-happ";
import {SnapmailPerspective} from "../viewModel/snapmail.perspective";
import {SnapmailZvm} from "../viewModel/snapmail.zvm";

import {Select, SelectChangeEvent} from "@vaadin/select";
import {GridItemModel} from "@vaadin/grid/src/vaadin-grid";

//import '@vaadin/icon';
//import '@vaadin/vaadin-lumo-styles';

/** */
function filterMails(mailItems: MailGridItem[], searchValue: string) {
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


/** */
@customElement("snapmail-filebox")
export class SnapmailFilebox extends ZomeElement<SnapmailPerspective, SnapmailZvm> {
  constructor() {
    super(SnapmailZvm.DEFAULT_ZOME_NAME);
    if (HAPP_BUILD_MODE == 'Debug') {
      this._menuItems.push({text: 'Refresh', disabled: false});
    }
  }

  // @property({type: Object})
  // mailItems:any;
  //_items:any = []
  @state() private _allMailGridItems: MailGridItem[] = [];
  private _curFolderItems: MailGridItem[] = [];
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

  @state() private _menuItems: MenuBarItem[] =
    [ { text: 'Move', disabled: true }
      , { text: 'Reply', disabled: true, children: [{ text: 'Reply to sender' }, { text: 'Reply to all' }, { text: 'Forward' }] }
      , { text: 'Trash', disabled: true }
      , { text: 'Print', disabled: true }
      //, { text: 'Find', disabled: true }
    ];


  get mailGridElem(): Grid<MailGridItem> {
    return this.shadowRoot.getElementById("mailGrid") as Grid<MailGridItem>;
  }

  get mailSearchElem(): TextField {
    return this.shadowRoot.getElementById("mailSearch") as TextField;
  }


  get folderElem(): Select {
    return this.shadowRoot.getElementById("fileboxFolder") as Select;
  }


  /** -- Methods -- */

  /** */
  resetSelection() {
    this._selectedItems = [];
  }

  /** */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    /** Display bold if mail not acknowledged */
    this.mailGridElem.cellClassNameGenerator = (column, rowData: GridItemModel<MailGridItem>) => {
      let classes = '';
      classes += determineMailCssClass(rowData.item.mailItem);
      const is_old = hasMailBeenOpened(rowData.item.mailItem);
      //console.log('hasMailBeenOpened: ', is_old, idB64);
      if (!is_old) {
        classes += ' newmail';
      }
      return classes;
    };

    this.mailGridElem.shadowRoot.appendChild(stylesTemplate.content.cloneNode(true));

    const fileboxLayout = this.shadowRoot.getElementById('fileboxLayout') as HorizontalLayout;
    if (HAPP_BUILD_MODE == 'Debug') {
      fileboxLayout.style.backgroundColor = "rgba(241,154,154,0.82)";
    }

    this.fillMailGrid();
  }


  /** */
  onMenuItemSelected(e: MenuBarItemSelectedEvent) {
    console.log("   filebox.onMenuItemSelected()", e.detail.value);
    this.dispatchEvent(new CustomEvent<string>('menu-item-selected', { detail: e.detail.value.text, bubbles: true, composed: true }));
  }


  /** On item select: Display in inMailArea */
  onMailSelected(item: MailGridItem) {
    console.log("   filebox.onMailSelected()", item);
    this.dispatchEvent(new CustomEvent<MailGridItem>('mail-item-selected', { detail: item, bubbles: true, composed: true }));
    this._selectedItems = item ? [item] : [];
}


  /** */
  disableMenuButtons(isDisabled: boolean): void {
    console.log("   disableMenuButtons() called", isDisabled)

    if (this._menuItems[2].disabled === isDisabled) {
      return;
    }

    /** Deep-copy MenuBarItems so it can trigger a new render */
    const items = JSON.parse(JSON.stringify(this._menuItems)) as MenuBarItem[];
    items[1].disabled = isDisabled;
    items[2].disabled = isDisabled;
    items[3].disabled = isDisabled;

    this._menuItems = items;
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
      for (const mailItem of this.mailGridElem.selectedItems) {
        prevSelected.push(mailItem.id);
      }
    }

    let trashCount = 0;
    let inboxCount = 0;
    let sentCount = 0;
    let newCount = 0;

    const selected: MailGridItem[] = [];
    const items: MailGridItem[] = [];

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
    console.log(`Counters: ${newCount} / ${inboxCount} / ${sentCount} / ${trashCount} / ${mailItems.length}`);

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

    console.log(`   mailCount = ${items.length} ('${selected.length}')`);
    this._allMailGridItems = items;
    this._shownItems = filterMails(this._allMailGridItems, this.mailSearchElem.value);
    this._selectedItems = selected;
    this.mailGridElem.items = this._shownItems;
    this.mailGridElem.selectedItems = selected;
    this.mailGridElem.activeItem = selected[0];
  }


  /** */
  update_mailGrid(folderValue: string): void {
    console.log('   update_mailGrid:', folderValue);
    this._curFolderItems = [];

    switch(folderValue) {
      case systemFolders.ALL/*.codePointAt(0)*/:
        for (const mailItem of Object.values(this._allMailGridItems)) {
          //folderItems = Array.from(g_mail_map.values());
          this._curFolderItems.push(mailItem);
        }
        break;
      case systemFolders.INBOX/*.codePointAt(0)*/:
      case systemFolders.SENT/*.codePointAt(0)*/:
        //console.log("this.perspective.mailMap", this.perspective.mailMap)
        for (const mailGridItem of Object.values(this._allMailGridItems)) {
          console.log('mailItem', mailGridItem.id);
          const is_out = is_OutMail(mailGridItem.mailItem);
          if (isMailDeleted(mailGridItem.mailItem)) {
            continue;
          }
          if (is_out && folderValue == systemFolders.SENT/*.codePointAt(0)*/) {
            this._curFolderItems.push(mailGridItem);
            continue;
          }
          if (!is_out && folderValue == systemFolders.INBOX/*.codePointAt(0)*/) {
            this._curFolderItems.push(mailGridItem);
          }
        }
        break;
      case systemFolders.TRASH/*.codePointAt(0)*/: {
        for (const mailGridItem of Object.values(this._allMailGridItems)) {
          if(isMailDeleted(mailGridItem.mailItem)) {
            this._curFolderItems.push(mailGridItem);
          }
        }
      }
        break;
      default:
        console.error('Unknown folder')
    }

    const span: HTMLElement = this.shadowRoot.getElementById('messageCount');
    span.textContent = this._curFolderItems.length.toString();

    console.log('   folderItems count: ', this._curFolderItems.length);
    this._shownItems = filterMails(this._curFolderItems, this.mailSearchElem.value);
    console.log('   update_mailGrid() _shownItems', this._shownItems);
  }


  /** */
  updated() {
    /** Update active Item */
    console.log('   <snapmail-filebox>.updated()');
    if(this.mailGridElem.activeItem) {
      let newActiveItem: MailGridItem;
      for(const item of this.mailGridElem.items) {
        if(item.id === this.mailGridElem.activeItem.id) {
          newActiveItem = item;
          break;
        }
      }
      this.mailGridElem.selectItem(newActiveItem);
    }
  }


  /** */
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("   <snapmail-filebox>.willUpdate()", this._shownItems);

    /** Handle mails from perspective */
    if (changedProperties.has('perspective')) {
      const allMailGridItem: MailGridItem[] = [];
      for (const mailItem of Object.values(this.perspective.mailMap)) {
        allMailGridItem.push(into_gridItem(this.perspective.usernameMap, mailItem));
      }
      //console.log("   <snapmail-filebox>.willUpdate() this._allMailItems", this._allMailGridItems, allMailGridItem);
      this._allMailGridItems = allMailGridItem;
      /** Update grid if it exists */
      if (!this.folderElem || !this.mailGridElem) {
        return;
      }
      try {
        this.update_mailGrid(this.folderElem.value);
      } catch(e) {
        console.error("<snapmail-filebox>.willUpdate() failed", e)
      }
    }

    /** Determine menu buttons state */
    let isDisabled = true;
    if (this._selectedItems.length > 0) {
      if (!isMailDeleted(this._selectedItems[0].mailItem)) {
        isDisabled = false;
      }
    }
    this.disableMenuButtons(isDisabled);
  }



  /**
   */
  render() {
    console.log("<snapmail-filebox>.render()", this._selectedItems.length);
    return html`
        <vaadin-vertical-layout theme="spacing-s" style="height:100%;">
          <!-- FILEBOX MENU -->
          <vaadin-horizontal-layout theme="spacing-xs" id="fileboxLayout" style="width:100%;">
            <vaadin-select id="fileboxFolder" 
                           style="user-select: none; -khtml-user-select: none; -webkit-user-select: none"
                           .items="${this._systemFoldersVec}"
                           .value="${this._currentFolder}"
                           @change="${(e: SelectChangeEvent) => {this.onFolderChange(e.target.value)}}"
            ></vaadin-select>
  
            <vaadin-menu-bar id="fileboxMenu" open-on-hover 
                             style="margin-top:2px"
                             .items="${this._menuItems}"
                             @item-selected="${(e: MenuBarItemSelectedEvent) => this.onMenuItemSelected(e)}"
            ></vaadin-menu-bar>
  
            <span style="padding:12px 0px 0px 5px;margin-right: 10px;">messages: <span id="messageCount">0</span></span>
            <vaadin-text-field id="mailSearch" clear-button-visible
                               style="width: 25%; margin-left: auto;margin-right: 5px;"
                               placeholder="Search" 
                               @value-changed="${(e:TextFieldValueChangedEvent) => {this._shownItems = filterMails(this._curFolderItems, e.detail.value)}}"
            >
              <vaadin-icon slot="prefix" icon="lumo:search"></vaadin-icon>
            </vaadin-text-field>
          </vaadin-horizontal-layout>
    
          <!-- FILEBOX AREA -->
          <vaadin-grid id="mailGrid" theme="compact" multiSort
                       style="min-height:50px; margin-top:-7px;height: auto;"
                       .items="${this._shownItems}"
                       .selectedItems="${this._selectedItems}"
                       @active-item-changed="${(e: GridActiveItemChangedEvent<MailGridItem>) => this.onMailSelected(e.detail.value)}"
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
        </vaadin-vertical-layout>
    `;
  }

  /** */
  static get styles() {
    return [
      css`
    `];
  }

}
