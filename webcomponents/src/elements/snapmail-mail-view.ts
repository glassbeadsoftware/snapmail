import {css, html, LitElement} from "lit";
import { state, property } from "lit/decorators.js";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {TextArea} from "@vaadin/text-area";
import {InMail, MailItem} from "../bindings/snapmail.types";
import {into_mailText} from "../mail";
import {UsernameMap} from "../viewModel/snapmail.perspective";


/**
 *
 */
export class SnapmailMailView extends ScopedElementsMixin(LitElement) {

  @property({type: Object})
  inMailItem: MailItem;

  @property({type: Object})
  usernameMap: UsernameMap;

  /** */
  render() {
    console.log("<snapmail-mail-view>.render()", this.inMailItem);

    let mailText = '<no mail selected>';
    if (this.inMailItem && this.usernameMap) {
      mailText = into_mailText(this.usernameMap, this.inMailItem);
    }

    /** */
    return html`
        <vaadin-text-area id="inMailArea" readonly
                style="backgroundColor:#dfe7efd1; height:100%; padding:0px; width:100%;"                 
                .value="${mailText}"
        >
            <!-- <span id="mailDisplay"></span>-->
        </vaadin-text-area>
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
      'vaadin-text-area':TextArea,
    }
  }
}
