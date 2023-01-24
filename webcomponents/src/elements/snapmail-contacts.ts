import {css, html, PropertyValues} from "lit";
import { state, property } from "lit/decorators.js";
import {Grid, GridColumn, GridEventContext} from "@vaadin/grid";
import {VerticalLayout} from "@vaadin/vertical-layout";
import {HorizontalLayout} from "@vaadin/horizontal-layout";
import {ComboBox} from "@vaadin/combo-box";
import {TextField} from "@vaadin/text-field";
import {Icon} from "@vaadin/vaadin-icon";
import {Button} from "@vaadin/button";
import {Dialog} from "@vaadin/dialog";
import {ContactGridItem, SnapmailPerspective} from "../viewModel/snapmail.perspective";
import {greenDot, redDot, stylesTemplate, SYSTEM_GROUP_LIST, whiteDot} from "../constants";
import {PolymerElement} from "@polymer/polymer";
import {GridSelectionColumn} from "@vaadin/grid/vaadin-grid-selection-column";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {SnapmailZvm} from "../viewModel/snapmail.zvm";
import {DEV_MODE} from "../electron";
import {MenuBar} from "@vaadin/menu-bar";

/** Find and collect grid items that have the given agentIds */
function ids_to_items(ids: string[], items: ContactGridItem[]) {
  const subGroup = [];
  for (const id of ids) {
    for (const item of items) {
      //const itemStr = htos(item.agentId);
      if (item.agentIdB64 === id) {
        subGroup.push(item);
        break;
      }
    }
  }
  return subGroup;
}


/**
 *
 */
export class SnapmailContacts extends ZomeElement<SnapmailPerspective, SnapmailZvm> {
  constructor() {
    super(SnapmailZvm.DEFAULT_ZOME_NAME);
  }


  /** groupname -> agentIdB64[]  */
  private _groupMap: Map<string, string[]> = new Map();


  @state() private _shownItems: ContactGridItem[] = []
  @state() private _allContactItems: ContactGridItem[] = [];
  @state() private _selectedContactIdB64s: string[] = [];
  @state() private _selectedItems: ContactGridItem[] = [];
  //_activeItem:any = null;

  @state() private _currentGroup = SYSTEM_GROUP_LIST[0];


  get allContacts(): ContactGridItem[] { return this._allContactItems}
  get selectedContacts(): ContactGridItem[] { return this._selectedItems}


  /** -- Getters -- */

  get contactGridElem() : Grid {
    return this.shadowRoot!.getElementById("contactGrid") as Grid;
  }

  get contactSearchElem() : TextField {
    return this.shadowRoot!.getElementById("contactSearch") as TextField;
  }

  get groupComboElem() : ComboBox {
    return this.shadowRoot!.getElementById("groupCombo") as ComboBox;
  }


  /** -- Methods -- */


  /** */
  resetSelection() {
    this._selectedItems = [];
    this._selectedContactIdB64s = [];
    this.updateContacts(false);
  }


  /** */
  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    this.initGroupsDialog();

    this.contactGridElem.cellClassNameGenerator = function(column, rowData:any) {
      //console.log(rowData)
      let classes = rowData.item.status;
      if (column.path === 'status') {
        classes += ' statusColumn';
      }
      if (rowData.item.recipientType !== '') { classes += ' newmail' }
      if (rowData.item.recipientType === 'cc') { classes += ' myCc' }
      if (rowData.item.recipientType === 'bcc') { classes += ' myBcc' }
      return classes;
    };

    this.contactGridElem.shadowRoot!.appendChild(stylesTemplate.content.cloneNode(true));

    this.loadGroupList(this.dnaHash);

    this._zvm.storePingResult({}, this.agentPubKey);

    /** Ping an agent every 1 second */
    // /*let _1sec =*/ setInterval(() => {
    //   // if (DEV_MODE === 'dev') {
    //   //   return;
    //   // }
    //   try {
    //     if (this._zvm.canPing) {
    //       this._zvm.pingNextAgent();
    //     }
    //   } catch(e) {
    //     console.error("_1sec.pingNextAgent() failed: ", e)
    //   }
    // }, 1 * 1000);

    /** Add Refresh button in DEBUG */
    const contactsMenu = this.shadowRoot!.getElementById("ContactsMenu") as MenuBar;
    if (DEV_MODE === 'dev' && contactsMenu) {
      contactsMenu.items = [{ text: 'Refresh' }];
      contactsMenu.addEventListener('item-selected', (e:any) => {
        console.log('item-selected', JSON.stringify(e.detail.value));
        if(e.detail.value.text === 'Refresh') {
          console.log("contactsMenu Refresh clicked")
          //contactsMenu.items[0].disabled = true;
          //contactsMenu.render();
          this._zvm.probeHandles();
        }
      });
    }
  }



  /** Regenerate _allContactItems from _usernameMap, _pingMap and _selectedContactIds */
  updateContacts(canKeepSelection: boolean): void {
    //console.log('updateContacts() - START', canKeepSelection)
    /* Stash currently selected items (by hash) */
    const prevSelected: string[] = [];
    const recipientTypeMap: Map<string, string> = new Map();
    if (canKeepSelection) {
      for (const selecetedContactId of this._selectedContactIdB64s) {
        const contactItem: ContactGridItem = this._allContactItems.find((item) => item.agentIdB64 === selecetedContactId)!;
        console.assert(contactItem);
        prevSelected.push(contactItem.agentIdB64);
        recipientTypeMap.set(contactItem.agentIdB64, contactItem.recipientType);
      }
    } else {
      this._selectedContactIdB64s = []
    }
    //console.log({recipientTypeMap});

    /* Convert each handle into a contactGridItem */
    const selected: ContactGridItem[] = [];
    const allItems: ContactGridItem[] = [];
    for (const [agentIdB64, username] of this.perspective.usernameMap.entries()) {
      //console.log('' + agentIdB64 + ' => ' + username)
      let status = whiteDot
      if (this.perspective.pingMap.get(agentIdB64)) {
        status = this.perspective.responseMap.get(agentIdB64)? greenDot : redDot
      }
      //const status = blueDot
      const item: ContactGridItem = {
        username,
        agentIdB64,
        recipientType: '',
        status,
      };
      /** Retrieve stashed selectedItems */
      if (canKeepSelection && prevSelected.includes(agentIdB64)) {
        console.log("keep selected: " + item.username);
        item.recipientType = recipientTypeMap.get(agentIdB64)!;
        selected.push(item);
      }
      allItems.push(item);
    }
    this._selectedItems = selected;

    /* Sort by username */
    this._allContactItems = allItems.sort((obj1, obj2) => {
      return obj1.username < obj2.username? -1 : 1;
    });


    this._shownItems = this.filterContacts(selected, this.contactSearchElem? this.contactSearchElem.value : '');

    //console.log('updateContacts() - END', this._allContactItems)
  }


  /** */
  filterContacts(selectedItems: ContactGridItem[], searchValue: string): ContactGridItem[] {
    //console.log("filterContacts() called");
    /** Get contacts from current group only */
    //console.log({items});
    let groupItems = this._allContactItems;
    if (this._currentGroup !== SYSTEM_GROUP_LIST[0]) {
      const ids = this._groupMap.get(this._currentGroup);
      //console.log({ids});
      groupItems = ids_to_items(ids!, this._allContactItems);
      //console.log({items});
    }
    /** Set filter */
    const searchTerm = (searchValue || '').trim();
    const matchesTerm = (value: string) => {
      return value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
    };
    /** Apply filter */
    const filteredItems = groupItems.filter((item) => {
      //console.log({item});
      return (
        !searchTerm
        || matchesTerm(item.username)
      );
    });
    /** Merge with selection and clear duplicate values by going through a Set */
    const merged = [...new Set(selectedItems.concat(filteredItems))];
    /** Sort */
    const result = merged.sort((obj1, obj2) => {
      return obj1.username < obj2.username? -1 : 1;
    });
    return result;
  }



  /** update state */
  toggleContact(contactItem: ContactGridItem) {
    let nextType = '';
    switch(contactItem.recipientType) {
      case '': {
        nextType = 'to';
        this._selectedContactIdB64s.push(contactItem.agentIdB64)
      } break;
      case 'to': nextType = 'cc'; break;
      case 'cc': nextType = 'bcc'; break;
      case 'bcc': {
        nextType = '';
        /** Remove item from selected list */
          //if (selectedItems.length > 0) {
        const index = this._selectedContactIdB64s.indexOf(contactItem.agentIdB64)
        if (index > -1) {
          this._selectedContactIdB64s.splice(index, 1);
        }
        //}
        break;
      }
      default: console.error('unknown recipientType');
    }
    contactItem.recipientType = nextType;
  }



  /**
   * Populate contactGrid according to:
   * _allContactItems, _selectedContactIds and search value
   */
  updateContactGrid(canResetSearch: boolean): void {
    // /* Deselect all */
    // for (const item of this._allContactItems) {
    //   this.contactGridElem.deselectItem(item);
    // }
    /** Form selectedItems */
    const selected = []
    for (const idB64 of this._selectedContactIdB64s) {
      const item = this._allContactItems.find((item) => item.agentIdB64 === idB64)!;
      selected.push(item)
    }
    this._selectedItems = selected;
    /* Reset search filter */
    if (canResetSearch) {
      this.contactSearchElem.value = '';
    }
    /** generated items */
    this._shownItems = this.filterContacts(selected, this.contactSearchElem.value);
  }


  /** */
  onGridClick(e) {
    const eventContext: GridEventContext<ContactGridItem> = this.contactGridElem.getEventContext(e)!;
    console.log("contactGrid.click:", eventContext)
    /* Bail if clicked on empty space */
    if (!eventContext.item) {
      return;
    }
    const index = this._allContactItems.indexOf(eventContext.item)
    console.assert(index > -1)
    console.log({click_before_SelectedItems: this.contactGridElem.selectedItems})

    this.toggleContact(this._allContactItems[index]);
    this.updateContactGrid(false);

    //console.log({click_after_SelectedItems: this.contactGridElem.selectedItems})
    this.dispatchEvent(new CustomEvent('contact-selected',
      { detail: this._selectedContactIdB64s, bubbles: true, composed: true }));

  }


  /** */
  setCurrentGroup(groupName: string): void {
    console.log('Current Group changed: ' + groupName);
    if(groupName === SYSTEM_GROUP_LIST[1]) {
      const newDialog = this.shadowRoot!.getElementById('newGroupDlg') as Dialog;
      this._currentGroup = SYSTEM_GROUP_LIST[0];
      newDialog.opened = true;
      return;
    }
    /** Set current Group and update contact Grid */
    this._currentGroup = groupName;
    this.updateContactGrid(false);
    /** Store _groupMap in localStore */
    const entries = Array.from(this._groupMap.entries());
    console.log("Storing groups",  entries)
    window.localStorage[this.dnaHash] = JSON.stringify(entries);
  }


  /** */
  loadGroupList(dnaId: string) {
    try {
      this._groupMap = new Map(JSON.parse(window.localStorage[dnaId]));
    } catch(err) {
      if (!dnaId || dnaId === '') {
        console.warn("localStorage parse failed. No contact groups will be loaded. DnaId =", dnaId);
        console.warn({err});
      }
      this._groupMap = new Map();
      this._groupMap.set('All', []);
    }
    //console.log({ groupList: this._groupMap });
  }


  /** */
  generateGroupComboBox(): string[] {
    const groupKeys = [];
    //groupKeys.push(SYSTEM_GROUP_LIST[0]);
    if (this._groupMap) {
      for (const groupName of this._groupMap.keys()) {
        groupKeys.push(groupName);
      }
    }
    groupKeys.push(SYSTEM_GROUP_LIST[1]);
    //console.log({groupKeys})
    return groupKeys;
  }


  /** */
  isValidGroupName(name: string) {
    const keys = Array.from(this._groupMap.keys());
    for (const takenName of keys) {
      if (name === takenName) {
        return false;
      }
    }
    return true;
  }


  /** */
  createNewGroup(dialog: Dialog, textField: TextField) {
    if (!this.isValidGroupName(textField.value)) {
      textField.invalid = true;
      textField.errorMessage = 'Name already taken';
      return;
    }
    if (textField.value.length < 1) {
      textField.invalid = true;
      textField.errorMessage = 'Min 1 character';
      return;
    }
    this._groupMap.set(textField.value, []);
    //console.log('g_groupList: ' + JSON.stringify(g_groupList.keys()));
    this.generateGroupComboBox();
    this.setCurrentGroup(textField.value);
    this.groupComboElem.selectedItem = textField.value;
    textField.value = '';
    dialog.opened = false;
  }


  /** */
  initGroupsDialog() {
    console.log("initGroupsDialog() called");
    /** -- New Group Dialog */
    const newDialog = this.shadowRoot!.getElementById('newGroupDlg') as Dialog;
    newDialog.renderer = (root, dialog) => {
      /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
      if (root.firstElementChild) {
        //console.log({root});
        const vaadin = root.children[1] as PolymerElement;
        vaadin.autofocus = true;
        vaadin.focus();
        return;
      }
      /** Title */
      const div = window.document.createElement('div') as HTMLDivElement;
      div.textContent = 'Create new group: ';
      const br = window.document.createElement('br');
      /** Name text-field */
      const vaadin = window.document.createElement('vaadin-text-field') as TextField;
      vaadin.placeholder = "name";
      vaadin.autofocus = true;
      vaadin.minlength = 1;
      vaadin.maxlength = 16;
      vaadin.helperText = "Max 16 characters";
      vaadin.allowedCharPattern = "[a-zA-Z0-9_.]";
      vaadin.addEventListener("keyup", (event) => {
        /** On return key */
        if (event.keyCode == 13) {
          this.createNewGroup(dialog!, vaadin);
        }
      });

      /** Confirm Button */
      const okButton = window.document.createElement('vaadin-button') as Button;
      okButton.setAttribute('theme', 'primary');
      okButton.textContent = 'OK';
      okButton.setAttribute('style', 'margin-right: 1em');
      okButton.addEventListener('click', () => {this.createNewGroup(dialog!, vaadin);});
      /** Cancel Button */
      const cancelButton = window.document.createElement('vaadin-button') as Button;
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => {
        vaadin.value = '';
        //this.groupComboElem.value = this._currentGroup;
        dialog!.opened = false;
      });
      /** Add all elements */
      root.appendChild(div);
      root.appendChild(br);
      root.appendChild(vaadin);
      root.appendChild(br);
      root.appendChild(okButton);
      root.appendChild(cancelButton);


      /** -- Edit Group Dialog */

      const editDialog = this.shadowRoot!.getElementById('editGroupDlg') as Dialog;
      editDialog.renderer = (root, dialog) => {
        console.log("Edit Groups dialog called", this._currentGroup);
        /** Check if there is a DOM generated with the previous renderer call to update its content instead of recreation */
        if (root.firstElementChild) {
          const title = root.children[0];
          title.textContent = 'Edit Group: ' + this._currentGroup;
          const grid = root.children[1] as Grid;
          grid.items = this._allContactItems;
          const groupIds = this._groupMap.get(this._currentGroup);
          if (groupIds) {
            grid.selectedItems = ids_to_items(groupIds, grid.items);
          }
          return;
        }
        /** Title */
        const div = window.document.createElement('h3');
        div.textContent = 'Edit Group: ' + this._currentGroup;
        div.setAttribute('style', 'margin-bottom: 10px; margin-top: 0px;');
        const br = window.document.createElement('br');


        /* Grid <vaadin-grid> */
        const selectColumn: GridSelectionColumn = window.document.createElement('vaadin-grid-selection-column');
        selectColumn.autoSelect = true;
        const column = window.document.createElement('vaadin-grid-column');
        column.path = 'username';
        column.header = "Name";
        column.flexGrow = 0;
        column.width = "300px";
        const grid = window.document.createElement('vaadin-grid') as Grid;
        grid.appendChild(selectColumn);
        grid.appendChild(column);
        grid.id = "groupGrid";
        //grid.heightByRows = true;
        grid.setAttribute('style', 'width: 360px;display:block;');
        grid.items = this._allContactItems;
        console.log({groupItems: grid.items})
        const groupIds = this._groupMap.get(this._currentGroup);
        const items = ids_to_items(groupIds!, grid.items)
        //grid.selectedItems = items; // does not work here
        /** Confirm Button */
        const okButton = window.document.createElement('vaadin-button');
        okButton.setAttribute('theme', 'primary');
        okButton.textContent = 'OK';
        okButton.setAttribute('style', 'margin-right: 1em');


        /** OnClick OK save agentIds of selected items for the group */
        okButton.addEventListener('click', () => {
          const ids = [];
          for (const item of grid.selectedItems!) {
            const contactItem: ContactGridItem = item as ContactGridItem;
            ids.push(contactItem.agentIdB64);
          }
          this._groupMap.set(this._currentGroup, ids);
          grid.selectedItems = [];
          this.setCurrentGroup(this._currentGroup);
          dialog!.opened = false;
        });
        /** Delete Button */
        const delButton = window.document.createElement('vaadin-button');
        delButton.setAttribute('theme', 'error');
        delButton.textContent = 'Delete';
        delButton.setAttribute('style', 'margin-right: 1em');
        delButton.addEventListener('click', () => {
          this._groupMap.delete(this._currentGroup);
          this.generateGroupComboBox();
          this.setCurrentGroup(SYSTEM_GROUP_LIST[0]);
          grid.selectedItems = [];
          dialog!.opened = false;
        });
        /** Cancel Button */
        const cancelButton = window.document.createElement('vaadin-button');
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', function () {
          grid.selectedItems = [];
          dialog!.opened = false;
        });
        /** Add all elements */
        root.appendChild(div);
        root.appendChild(br);
        root.appendChild(grid);
        root.appendChild(br);
        root.appendChild(okButton);
        root.appendChild(delButton);
        root.appendChild(cancelButton);
        /** Set selected at the end otherwise it won't register */
        grid.selectedItems = items;
      };

      /** -- Edit Group Button */
      const button = this.shadowRoot!.getElementById('groupsBtn') as Button;
      button.addEventListener('click', () => {
        /** open if not 'All' group selected */
        if (this._currentGroup !== SYSTEM_GROUP_LIST[0]) {
          editDialog.opened = true;
        }
      });
    }
  }


  /** */
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<snapmail-contacts>.willUpdate()");
    /** Handle mails from perspective */
    if (changedProperties.has('perspective')) {
      this.updateContacts(true);
    }
  }


  /** */
  render() {
    console.log("<snapmail-contacts>.render()", this._allContactItems, this._selectedItems);

    return html`
        <!-- CONTACT GROUPS dialog -->
        <vaadin-dialog no-close-on-esc no-close-on-outside-click id="newGroupDlg"></vaadin-dialog>
        <vaadin-dialog no-close-on-esc no-close-on-outside-click id="editGroupDlg"></vaadin-dialog>
        <!-- CONTACTS -->
        <vaadin-vertical-layout theme="spacing-xs" style="height:100%;">
            <!-- MENU -->
            <!-- <vaadin-horizontal-layout theme="spacing-xs" id="fileboxLayout">-->
            <vaadin-horizontal-layout theme="spacing-xs" style="background-color: #f7f7f1; width: 100%;">
                <h4 style="min-width:85px;text-align: center; font-size: large; padding: 10px 10px 10px 10px; margin: 0px 0px 0px 5px;">📇 Groups</h4>
                <vaadin-combo-box id="groupCombo" 
                                  style="min-width:100px;max-width:200px;"
                                  .value="${this._currentGroup}"
                                  .items="${this.generateGroupComboBox()}"
                                  @change="${(e) => this.setCurrentGroup(e.target.value)}"
                ></vaadin-combo-box>
                <vaadin-button id="groupsBtn" 
                               style="margin: 5px; min-width: 40px; padding-left: 5px;"
                               .disabled="${this._currentGroup == SYSTEM_GROUP_LIST[0]}">
                    <vaadin-icon icon="lumo:edit" slot="suffix"></vaadin-icon>
                </vaadin-button>
                <vaadin-text-field id="contactSearch" clear-button-visible 
                                   style="width: 35%; min-width:100px; margin-left: auto;margin-right: 3px;"
                                   placeholder="Search"
                                   @value-changed="${(e:any) => {this._shownItems = this.filterContacts(this._selectedItems, e.detail.value);}}">
                    <vaadin-icon slot="prefix" icon="lumo:search"></vaadin-icon>
                </vaadin-text-field>
            </vaadin-horizontal-layout>
            <!-- CONTACTS GRID -->
            <vaadin-grid id="contactGrid" theme="no-row-borders" 
                         style="height: 100%; min-width: 50px;min-height: 150px;"
                         .items="${this._shownItems}"
                         .selectedItems="${this._selectedItems}"
                         @click="${this.onGridClick}"                         
            >
                <vaadin-grid-column path="status" width="30px" flex-grow="0" header=" "></vaadin-grid-column>
                <vaadin-grid-column auto-width path="username" header=" "></vaadin-grid-column>
                <vaadin-grid-column auto-width path="recipientType" header=" "></vaadin-grid-column>
              <vaadin-grid-column path="agentId" hidden></vaadin-grid-column>
            </vaadin-grid>

            <!-- <vaadin-menu-bar open-on-hover id="ContactsMenu" style="margin-top:2px;"></vaadin-menu-bar>-->

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
      'vaadin-menu-bar':MenuBar,
      'vaadin-button':Button,
      'vaadin-combo-box':ComboBox,
      'vaadin-dialog':Dialog,
      "vaadin-icon": Icon,
      'vaadin-text-field':TextField,
      'vaadin-grid':Grid,
      'vaadin-grid-column':GridColumn,
      'vaadin-vertical-layout': VerticalLayout,
      'vaadin-horizontal-layout': HorizontalLayout,
    }
  }
}
