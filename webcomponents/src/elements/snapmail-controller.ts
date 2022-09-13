import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
//import { unsafeCSS } from 'lit-element';
//import { CSSModule } from '../css-utils';

//import { contextProvided } from '@lit-labs/context';
import {} from "../types";
//import {ScopedElementsMixin} from "@open-wc/scoped-elements";


import '@vaadin/progress-bar';
import '@vaadin/button';
import '@vaadin/upload';
import '@vaadin/combo-box';
import '@vaadin/menu-bar';
import '@vaadin/text-field';
import '@vaadin/text-area';
import '@vaadin/grid';
//import '@vaadin/grid/vaadin-grid-sort-column.js';
import '@vaadin/grid/vaadin-grid-sort-column';
//import '@vaadin/grid/vaadin-grid-column';
import '@vaadin/notification';
import '@vaadin/dialog';
import '@vaadin/split-layout';
import '@vaadin/vertical-layout';
import '@vaadin/horizontal-layout';


// import {ProgressBarElement} from '@vaadin/vaadin-progress-bar';
// import {ButtonElement} from '@vaadin/vaadin-button';
// import {GridElement} from '@vaadin/vaadin-grid';
// import {UploadElement} from '@vaadin/vaadin-upload';
// //import {} from '@vaadin/vaadin-upload/vaadin-upload.js';
// import {ComboBoxElement} from '@vaadin/vaadin-combo-box';
// import {MenuBarElement} from '@vaadin/vaadin-menu-bar';
// import {TextFieldElement} from '@vaadin/vaadin-text-field';
// import {TextAreaElement} from '@vaadin/vaadin-text-field/vaadin-text-area';
// import {GridSortColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-sort-column';
// import {GridColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-column';
// import {NotificationElement} from '@vaadin/vaadin-notification';
// import {DialogElement} from '@vaadin/vaadin-dialog';
// import {SplitLayoutElement} from '@vaadin/vaadin-split-layout';
// //import {VerticalLayoutElement} from '@vaadin/vaadin-ordered-layout/vaadin-vertical-layout.js';
// //import {HorizontalLayoutElement} from '@vaadin/vaadin-ordered-layout/vaadin-horizontal-layout.js';



// import {GridColumnGroupElement} from '@vaadin/vaadin-grid/vaadin-grid-column-group';
// import {GridFilterElement} from '@vaadin/vaadin-grid/vaadin-grid-filter';
// import {GridFilterColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-filter-column';
// import {GridTreeToggleElement} from '@vaadin/vaadin-grid/vaadin-grid-tree-toggle';
// import {GridSorterElement} from '@vaadin/vaadin-grid/vaadin-grid-sorter';
//import {GridSelectionColumnElement} from '@vaadin/vaadin-grid/vaadin-grid-selection-column';

// import '@vaadin/vaadin-list-box';

/** Uncaught DOMException: CustomElementRegistry.define: 'dom-module' has already been defined as a custom element */
// import '@vaadin/vaadin-icons';
// import '@vaadin/vaadin-icons/vaadin-icons';
// import '@vaadin/vaadin-lumo-styles';
// import '@vaadin/vaadin-lumo-styles/icons';
// //import '@vaadin/vaadin-ordered-layout';
// import '@vaadin-component-factory/vcf-tooltip';


// import * as DNA from '../rsm_bridge'
// import {arrayBufferToBase64, base64ToArrayBuffer, splitFile,  htos, stoh} from '../utils'
// import {systemFolders, isMailDeleted, determineMailCssClass, into_gridItem, into_mailText, is_OutMail, customDateString} from '../mail'


export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))


@customElement('snapmail-controller')
export class SnapmailController extends LitElement {
  constructor() {
    super();
  }


  /** After first render only */
  async firstUpdated() {
    console.log("snapmail-controller first update done!")
    //await this.init();
  }


  /** After each render */
  async updated(changedProperties: any) {
    // n/a
  }


  /** Render the current state */
  render() {
    return html`
        <!-- Loading Spinner -->
        <vaadin-progress-bar indeterminate value="0" id="loadingBar" ></vaadin-progress-bar>
        <!-- Notifications -->
        <vaadin-notification duration="4000" theme="contrast" position="bottom-center" id="notifyMail"></vaadin-notification>
        <vaadin-notification duration="4000" position="bottom-center" id="notifyAck"></vaadin-notification>
        <vaadin-notification duration="4000" position="bottom-center" id="notifyFile"></vaadin-notification>

        <!-- Groups dialog -->
        <vaadin-dialog no-close-on-esc no-close-on-outside-click id="newGroupDlg"></vaadin-dialog>
        <vaadin-dialog no-close-on-esc no-close-on-outside-click id="editGroupDlg"></vaadin-dialog>

        <!-- MAIN VERTICAL LAYOUT -->
        <vaadin-vertical-layout theme="spacing-s" style="display:none; height:100%;" id="mainPage">

            <!-- TITLE BAR -->
            <vaadin-horizontal-layout id="titleLayout" theme="spacing-xs" style="background-color:beige; width:100%;">
                <abbr title="dna" id="titleAbbr">
                    <img src="favicon.ico" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
                </abbr>
                <span id="snapTitle" style="text-align: center; font-size: larger; padding: 10px 0px 10px 5px;">SnapMail</span>
                <span id="networkIdDisplay" style="text-align: center; font-size: small; padding: 15px 2px 0px 5px;">NETWORK-ID</span>
                <!--        <span style="text-align: center; font-size: larger; padding: 10px 10px 10px 5px;"> - </span>-->
            </vaadin-horizontal-layout>

            <!-- FILEBOX MENU -->
            <vaadin-horizontal-layout theme="spacing-xs" id="fileboxBar" style="width:100%;">
                <vaadin-combo-box id="fileboxFolder" style="user-select: none;
            -khtml-user-select: none;
            -webkit-user-select: none;"></vaadin-combo-box>
                <vaadin-menu-bar open-on-hover id="MenuBar" style="margin-top:2px"></vaadin-menu-bar>
                <span style="padding:12px 0px 0px 5px;margin-right: 10px;">messages: <span id="messageCount">0</span></span>
                <vaadin-text-field id="mailSearch" clear-button-visible placeholder="Search" style="width: 25%; margin-left: auto;margin-right: 5px;">
                    <iron-icon slot="prefix" icon="lumo:search"></iron-icon>
                </vaadin-text-field>
            </vaadin-horizontal-layout>

            <!-- Split between InArea and the rest -->
            <vaadin-split-layout orientation="vertical" style="width:100%; height:100%; margin-top:0px;">

                <!-- Split between filebox and Inmail -->
                <vaadin-split-layout orientation="vertical" style="width:100%; height:50%; margin-top:0px;">
                    <!-- FILEBOX AREA -->
                    <vaadin-grid id="mailGrid" theme="compact" style="min-height:50px; margin-top:0;">
                        <!--  <vaadin-grid-selection-column width="2em" auto-select></vaadin-grid-selection-column>-->
                        <vaadin-grid-column path="id" header="id" width="0em" hidden></vaadin-grid-column>
                        <!-- <vaadin-grid-column header="A" width="60px" flex-grow="0" text-align="end"></vaadin-grid-column>-->
                        <vaadin-grid-sort-column path="status" header=" " width="50px" flex-grow="0"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="username" header="Who" width="100px"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="subject" header="Subject" width="500px"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="date" header="Date"></vaadin-grid-sort-column>
                        <vaadin-grid-sort-column path="attachment" header=" " width="50px" flex-grow="0"></vaadin-grid-sort-column>
                    </vaadin-grid>

                    <!-- IN-MAIL AREA -->
                    <vaadin-horizontal-layout theme="spacing-xs" style="min-height:50px; height:30%; width:100%; margin-top: 4px;">
                        <vaadin-text-area style="width: 70%;padding:0;" id="inMailArea" placeholder="<no selection>" readonly>
                            <!-- <span id="mailDisplay"></span>-->
                        </vaadin-text-area>
                        <!-- ATTACHMENT GRID -->
                        <vaadin-grid theme="no-row-borders" id="attachmentGrid" style="width:30%; height:100%; border-style: dotted;">
                            <vaadin-grid-column path="status" header=" " width="40px" flex-grow="0"></vaadin-grid-column>
                            <vaadin-grid-column auto-width path="filename" header="Attachments"></vaadin-grid-column>
                            <vaadin-grid-column auto-width path="filesize" text-align="end" header="KiB"></vaadin-grid-column>
                            <vaadin-grid-column path="filetype" hidden></vaadin-grid-column>
                            <vaadin-grid-column path="fileId" hidden></vaadin-grid-column>
                        </vaadin-grid>
                    </vaadin-horizontal-layout>
                </vaadin-split-layout>

                <!-- OUT-MAIL AREA -->
                <vaadin-vertical-layout style="width:100%; height:50%">

                    <h4 style="margin:10px 0px 0px 0px;">&#128394; Write Mail</h4>

                    <!-- Split between Write and Contacts -->
                    <vaadin-split-layout style="min-height:50px; height:100%; width:100%; margin:0px;">
                        <!-- WRITE AREA -->
                        <vaadin-vertical-layout style="min-width: 40px; width: 65%;">
                            <vaadin-text-field style="width: 100%;" id="outMailSubjectArea" placeholder="Write subject here..."></vaadin-text-field>
                            <vaadin-text-area style="width: 100%; height: 100%;padding-bottom:0;" id="outMailContentArea" placeholder="Write here..."></vaadin-text-area>
                        </vaadin-vertical-layout>
                        <!-- CONTACTS AREA -->
                        <vaadin-vertical-layout theme="spacing-xs" style="min-width: 20px; width: 35%;">
                            <!-- CONTACTS MENU -->
                            <!-- <vaadin-horizontal-layout theme="spacing-xs" id="fileboxBar">-->
                            <vaadin-horizontal-layout theme="spacing-xs" style="background-color: #f7f7f1; width: 100%;">
                                <h4 style="min-width:85px;text-align: center; font-size: large; padding: 10px 10px 10px 10px; margin: 0px 0px 0px 5px;">📇 Groups</h4>
                                <vaadin-combo-box id="groupCombo" style="min-width:100px;max-width:200px;"></vaadin-combo-box>
                                <vaadin-button id="groupsBtn" style="margin: 5px; min-width: 40px; padding-left: 5px;"><iron-icon icon="lumo:edit" slot="suffix"></iron-icon></vaadin-button>
                                <vaadin-text-field id="contactSearch" clear-button-visible placeholder="Search" style="width: 35%; min-width:100px; margin-left: auto;margin-right: 3px;">
                                    <iron-icon slot="prefix" icon="lumo:search"></iron-icon>
                                </vaadin-text-field>
                            </vaadin-horizontal-layout>
                            <!-- CONTACTS GRID -->
                            <vaadin-grid theme="no-row-borders" id="contactGrid" style="height: 100%; min-width: 50px;">
                                <vaadin-grid-column path="status" width="30px" flex-grow="0" header=" "></vaadin-grid-column>
                                <vaadin-grid-column auto-width path="username" header=" "></vaadin-grid-column>
                                <vaadin-grid-column auto-width path="recepientType" header=" "></vaadin-grid-column>
                                <vaadin-grid-column path="agentId" hidden></vaadin-grid-column>
                            </vaadin-grid>
                        </vaadin-vertical-layout>
                    </vaadin-split-layout>

                    <!-- <input type="file" hidden id="file-input" name="myfile">-->
                    <!-- </div>-->
                    <!-- <vaadin-list-box id="fileList"></vaadin-list-box>-->


                    <!-- Upload | Handle MENU -->
                    <vaadin-horizontal-layout theme="spacing-xs" style="background-color: #f7f7f1; width: 100%;">

                        <vaadin-upload nodrop max-file-size="8000000" style="width:280px; margin-top:0;">
                            <span slot="drop-label">Maximum file size: 8 MB</span>
                        </vaadin-upload>
                        <div style="margin-left: auto;display: flex;">
                            <h4 style="margin: 14px 10px 0px 0px;">Username:</h4>
                            <abbr title="handle" id="handleAbbr" style="margin-left:0px;">
                                <vaadin-button id="handleDisplay" style="min-width: 100px;"><span id="handleText"></span><iron-icon icon="lumo:edit" slot="suffix"></iron-icon></vaadin-button>
                            </abbr>
                            <!-- <vcf-tooltip id="handleDisplayTT" for="handleDisplay" position="bottom">fucking tooltip</vcf-tooltip> -->
                            <vaadin-text-field clear-button-visible id="myNewHandleInput" placeholder="username"></vaadin-text-field>
                            <vaadin-button theme="icon" id="setMyHandleButton" title="unknown">
                                <iron-icon icon="lumo:checkmark" slot="prefix"></iron-icon>
                            </vaadin-button>
                            <vaadin-button theme="icon" id="cancelHandleButton">
                                <iron-icon icon="lumo:cross" slot="prefix"></iron-icon>
                            </vaadin-button>
                        </div>
                        <vaadin-menu-bar open-on-hover id="ContactsMenu" style="margin-top:2px;"></vaadin-menu-bar>
                    </vaadin-horizontal-layout>


                    <!-- SEND MENU -->
                    <div style="width:100%; display:flex;justify-content: flex-end">
                        <vaadin-menu-bar theme="primary" id="ActionBar" style="height:40px; margin-top:5px; margin-bottom:10px;"></vaadin-menu-bar>
                    </div>
                    <!-- Progress Bar -->
                    <h3 style="margin:10px 0 5px 0;display:none;" id="sendingTitle">Sending</h3>
                    <vaadin-progress-bar indeterminate value="0" id="sendProgressBar" style="margin-bottom:20px;"></vaadin-progress-bar>
                </vaadin-vertical-layout>

            </vaadin-split-layout>

        </vaadin-vertical-layout>
      `;
  }


  // /** */
  // static get scopedElements() {
  //   return {
  //     //'iron-icon':,
  //     "vaadin-progress-bar": ProgressBarElement,
  //     'vaadin-button':ButtonElement,
  //     'vaadin-upload': UploadElement,
  //     'vaadin-grid':GridElement,
  //     'vaadin-menu-bar':MenuBarElement,
  //     'vaadin-combo-box':ComboBoxElement,
  //     'vaadin-text-field':TextFieldElement,
  //     'vaadin-notification': NotificationElement,
  //     'vaadin-text-area':TextAreaElement,
  //     'vaadin-dialog':DialogElement,
  //      //'vaadin-vertical-layout': VerticalLayoutElement,
  //      //'vaadin-horizontal-layout': HorizontalLayoutElement,
  //      'vaadin-split-layout': SplitLayoutElement,
  //     'vaadin-grid-column':GridColumnElement,
  //     'vaadin-grid-sort-column':GridSortColumnElement,
  //   };
  // }


  /** */
  static get styles() {
    return [
      //CSSModule('lumo-typography'),
      //unsafeCSS(styles),
      css`
        /* Background needs a stronger selector to not be overridden */
        [part~="cell"].male {
          background: rgb(255, 240, 0);
        }

        /*
        [part~="header-cell"] {
            background: rgb(255, 0, 200);
        }
        */

        :host(#contactGrid) #header {
          display: none;
        }

        :host(#groupGrid) #header {
          display: none;
        }

        /*
        :host th {
            height: 15px;
            margin-top: 0 !important;
            padding-top: 0 !important;
        }
        */

        :host(#attachmentGrid) #header {
          /*padding: 0px 0px 0px 0px;*/
          /*margin: 0px 0px 0px 0px;*/
          /*background: rgb(0, 100, 200);*/
          /*height: 15px;*/
        }

        .newmail {
          font-weight: bold;
        }

        .deleted {
          color:grey;
          text-decoration: line-through;
        }

        .arrived {
          color:black;
        }
        .checked {
          font-weight: normal;
        }

        .myCc {
          color: #0f4de8;
        }

        .myBcc {
          color: #a56bf8;
        }

        .partially {
          color: darkorange;
        }
        .pending {
          color: darkred;
        }
        .received {
          color: green;
        }
        .statusColumn {
          font-size: x-small;
          text-align: left;
          padding-left: 3px;
        }      
      `];
  }
}
