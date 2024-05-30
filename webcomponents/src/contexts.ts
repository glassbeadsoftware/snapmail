import {createContext} from "@lit/context";
import {WeaveServices} from "@lightningrodlabs/we-applet";

export const weClientContext = createContext<WeaveServices>('weave_client');

