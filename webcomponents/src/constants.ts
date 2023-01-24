export const redDot   = String.fromCodePoint(0x1F534);
export const greenDot = String.fromCodePoint(0x1F7E2);
//const blueDot  = String.fromCodePoint(0x1F535);
export const whiteDot  = String.fromCodePoint(0x26AA);

export const redStopEmoji = String.fromCodePoint(0x1F6D1);
export const greenCheckEmoji = String.fromCodePoint(0x2714);

export const hourGlassEmoji = String.fromCodePoint(0x23F3);


/* Map of (name -> [agentId]) */
export const SYSTEM_GROUP_LIST = ['All', 'new...'];



/** Styles for vaadin-grid */
export const stylesTemplate = document.createElement('template');
stylesTemplate.innerHTML = `
<style>
  /* Background needs a stronger selector to not be overridden */
  [part~="cell"].male {
      background: rgb(255, 240, 0);
  }

  :host(#contactGrid) #header {
      display: none;
  }

  :host(#groupGrid) #header {
      display: none;
  }
  
  [part~="cell"] ::slotted(vaadin-grid-cell-content) {
    margin-left: 10px;
    padding: 0px;
    /* text-overflow: clip; */
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
      color:darkred;
  }
  .received {
      color: green;
  }
  .statusColumn {
      font-size: x-small;
      text-align: left;
      padding-left: 3px;
  }
</style>
`;
