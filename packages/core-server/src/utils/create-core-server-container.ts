import { Container } from "inversify";
import { CaptureActiveTabInputPort } from "../input-ports/capture-active-tab";
import { ClickOnReadableElementInputPort } from "../input-ports/click-on-readable-element";
import { ClickOnViewableElementInputPort } from "../input-ports/click-on-viewable-element";
import { FillTextToReadableElementInputPort } from "../input-ports/fill-text-to-readable-element";
import { FillTextToViewableElementInputPort } from "../input-ports/fill-text-to-viewable-element";
import { GetInnerTextInputPort } from "../input-ports/get-inner-text";
import { GetReadableElementsInputPort } from "../input-ports/get-readable-elements";
import { GetTabsInputPort } from "../input-ports/get-tabs";
import { InvokeJsFnInputPort } from "../input-ports/invoke-js-fn";
import {
	CaptureActiveTabUseCase,
	ClickOnReadableElementUseCase,
	ClickOnViewableElementUseCase,
	FillTextToReadableElementUseCase,
	FillTextToViewableElementUseCase,
	GetInnerTextUseCase,
	GetReadableElementsUseCase,
	GetTabsUseCase,
	InvokeJsFnUseCase,
} from "../use-cases";

export const createCoreServerContainer = () => {
	const container = new Container({
		defaultScope: "Singleton",
	});

	// Add bindings here
	container.bind<GetTabsInputPort>(GetTabsInputPort).to(GetTabsUseCase);
	container
		.bind<GetReadableElementsInputPort>(GetReadableElementsInputPort)
		.to(GetReadableElementsUseCase);
	container
		.bind<ClickOnReadableElementInputPort>(ClickOnReadableElementInputPort)
		.to(ClickOnReadableElementUseCase);
	container
		.bind<CaptureActiveTabInputPort>(CaptureActiveTabInputPort)
		.to(CaptureActiveTabUseCase);
	container
		.bind<ClickOnViewableElementInputPort>(ClickOnViewableElementInputPort)
		.to(ClickOnViewableElementUseCase);
	container
		.bind<FillTextToReadableElementInputPort>(
			FillTextToReadableElementInputPort,
		)
		.to(FillTextToReadableElementUseCase);
	container
		.bind<FillTextToViewableElementInputPort>(
			FillTextToViewableElementInputPort,
		)
		.to(FillTextToViewableElementUseCase);
	container
		.bind<GetInnerTextInputPort>(GetInnerTextInputPort)
		.to(GetInnerTextUseCase);
	container
		.bind<InvokeJsFnInputPort>(InvokeJsFnInputPort)
		.to(InvokeJsFnUseCase);

	return container;
};
