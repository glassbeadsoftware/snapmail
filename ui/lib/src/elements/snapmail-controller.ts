import {css, html, LitElement} from "lit";
import {property} from "lit/decorators.js";


//import {contextProvided} from "@holochain-open-dev/context";
import { contextProvided } from '@lit-labs/context';
import {} from "../types";
import {ScopedElementsMixin} from "@open-wc/scoped-elements";


export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))


/**
 * @element place-controller
 */
export class SnapmailController extends ScopedElementsMixin(LitElement) {
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
        <span>Loading...</span>
      `;
  }


  /** */
  static get scopedElements() {
    return {
      //"place-snapshot": PlaceSnapshot,
      //'sl-tooltip': SlTooltip,
      //'sl-badge': SlBadge,
    };
  }


  /** */
  static get styles() {
    return [
      css``
    ];
  }
}
