import { config } from "../config.js";
import type { FiscalAdapter } from "./adapter.js";
import { MockAdapter } from "./mock.js";
import { LocalImsAdapter } from "./local-ims.js";

export function createFiscalAdapter(): FiscalAdapter {
  switch (config.fiscalAdapter) {
    case "local":
      return new LocalImsAdapter();
    case "mock":
    default:
      return new MockAdapter();
  }
}

export const fiscalAdapter = createFiscalAdapter();

export * from "./adapter.js";
export * from "./mapper.js";
