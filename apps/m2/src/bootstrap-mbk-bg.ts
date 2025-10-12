import "core-js/proposals";
import { containerBg, MbkBg } from "./services";

// Resolve the MbkBg service and bootstrap
const mbkBg = containerBg.get<MbkBg>(MbkBg);
mbkBg.bootstrap();
