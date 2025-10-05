import type Emittery from "emittery";

export type Port<T> = {
	on: Emittery<T>["on"];
	emit: Emittery<T>["emit"];
};

export interface MessageChannel<I = unknown, O = unknown> {
	incoming: Port<I>;
	outgoing: Port<O>;
}
