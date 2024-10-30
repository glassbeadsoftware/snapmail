import {createContext} from "@lit/context";
import {WeaveServices} from "@theweave/api";

export const weClientContext = createContext<WeaveServices>('weave_client');

