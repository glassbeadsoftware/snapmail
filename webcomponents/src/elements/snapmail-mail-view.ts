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
    let mailText = '<no mail selected>';
    if (this.inMailItem && this.usernameMap) {
      mailText = into_mailText(this.usernameMap, this.inMailItem);
    }

    /** */
    return html`
        <vaadin-text-area id="inMailArea" readonly
                .value="${mailText}"
                style="backgroundColor: #dfe7efd1"
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
