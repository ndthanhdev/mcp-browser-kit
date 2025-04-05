export interface Screenshot {
	width: number;
	height: number;
	mimeType: string;
	data: string;
}

export interface CaptureActiveTabInputPort {
	captureActiveTabInstruction(): string;
	captureActiveTab(): Promise<Screenshot>;
}

export const CaptureActiveTabInputPort = Symbol("CaptureActiveTabInputPort");
