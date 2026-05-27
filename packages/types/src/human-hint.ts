export type HumanHintAction = "click" | "fill" | "hit-enter";

export type HumanHintTarget =
	| {
			type: "readablePath";
			readablePath: string;
			label?: string;
	  }
	| {
			type: "coordinates";
			x: number;
			y: number;
	  };

export interface ShowHumanHintParams {
	action: HumanHintAction;
	message: string;
	value?: string;
	readablePath?: string;
	x?: number;
	y?: number;
}

export interface HumanHintTabResult {
	ok: boolean;
	reason?: string;
	target?: HumanHintTarget;
}

export interface HumanHintResponse {
	ok: boolean;
	reason?: string;
	action: HumanHintAction;
	target?: HumanHintTarget;
	value?: string;
	message: string;
	humanMessage: string;
	tab: {
		title: string;
		url: string;
	};
	expiresInSeconds: number;
}

export const HUMAN_HINT_EXPIRES_IN_SECONDS = 60;
