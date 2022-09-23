// eagerly import theme styles so as we can override them
//import '@vaadin/vaadin-lumo-styles/all-imports';


function safeDecorator(fn:any) {
  // eslint-disable-next-line func-names
  return function(...args:any) {
    try {
      // @ts-ignore
      return fn.apply(this, args);
    } catch (error) {
      if (
        error instanceof DOMException &&
        //error.message.includes('has already been used with this registry')
        error.message.includes('has already been defined as a custom element')
      ) {
        console.warn("Double customElements.define waived")
        return false;
      }
      throw error;
    }
  };
}
customElements.define = safeDecorator(customElements.define);

//
// const $_documentContainer = document.createElement('template');
//
//
// $_documentContainer.innerHTML = `
// <custom-style>
//   <style>
//     html {
//     }
//   </style>
// </custom-style>
//
// <dom-module id="my-grid-styles" theme-for="vaadin-grid">
//     <template>
//         <style>
//             /* Background needs a stronger selector to not be overridden */
//             [part~="cell"].male {
//                 background: rgb(255, 240, 0);
//             }
//
//             /*
//             [part~="header-cell"] {
//                 background: rgb(255, 0, 200);
//             }
//             */
//
//             :host(#contactGrid) #header {
//                 display: none;
//             }
//
//             :host(#groupGrid) #header {
//                 display: none;
//             }
//
//             /*
//             :host th {
//                 height: 15px;
//                 margin-top: 0 !important;
//                 padding-top: 0 !important;
//             }
//             */
//
//             :host(#attachmentGrid) #header {
//                 /*padding: 0px 0px 0px 0px;*/
//                 /*margin: 0px 0px 0px 0px;*/
//                 /*background: rgb(0, 100, 200);*/
//                 /*height: 15px;*/
//             }
//
//             .newmail {
//                 font-weight: bold;
//             }
//
//             .deleted {
//                 color:grey;
//                 text-decoration: line-through;
//             }
//
//             .arrived {
//                 color:black;
//             }
//             .checked {
//                 font-weight: normal;
//             }
//
//             .myCc {
//                 color: #0f4de8;
//             }
//
//             .myBcc {
//                 color: #a56bf8;
//             }
//
//             .partially {
//                 color: darkorange;
//             }
//             .pending {
//                 color: darkred;
//             }
//             .received {
//                 color: green;
//             }
//             .statusColumn {
//                 font-size: x-small;
//                 text-align: left;
//                 padding-left: 3px;
//             }
//         </style>
//     </template>
// </dom-module>
// `;
//
// document.head.appendChild($_documentContainer.content);
