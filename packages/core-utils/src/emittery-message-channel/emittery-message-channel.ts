import Emittery from "emittery";

export type Port<T> = {
	on: Emittery<T>["on"];
	emit: Emittery<T>["emit"];
};

export interface MessageChannel<T = unknown, U = unknown> {
	incoming: Port<T>;
	outgoing: Port<U>;
}

export class EmitteryMessageChannel<T = unknown, U = unknown>
	implements MessageChannel<T, U>
{
	private readonly _incoming: Port<T>;
	private readonly _outgoing: Port<U>;

	constructor(
		incoming: Port<T> = new Emittery<T>(),
		outgoing: Port<U> = new Emittery<U>(),
	) {
		this._incoming = incoming;
		this._outgoing = outgoing;
	}

	public get incoming(): Port<T> {
		return this._incoming;
	}

	public get outgoing(): Port<U> {
		return this._outgoing;
	}

	public reverse = (): MessageChannel<U, T> => {
		return new EmitteryMessageChannel(this._outgoing, this._incoming);
	};
}
