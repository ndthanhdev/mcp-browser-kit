import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownContentProps {
	/** The whole accumulated Markdown source, never a single streamed delta. */
	content: string;
	/** Draws a caret after the last block while the text is still arriving. */
	streaming?: boolean;
}

const remarkPlugins = [
	remarkGfm,
];

const components: Components = {
	// The sidepanel is the extension page itself, so a same-frame link would
	// navigate it away from the chat.
	a: ({ node: _node, ...props }) => (
		<Link
			{...props}
			target="_blank"
			rel="noopener noreferrer"
			sx={{
				color: "brand.link",
			}}
		/>
	),
};

/**
 * Model-authored Markdown (GFM) rendered with compact, chat-sized spacing. Raw
 * HTML in the source is not rendered.
 */
export const MarkdownContent = ({
	content,
	streaming = false,
}: MarkdownContentProps) => (
	<Box
		sx={{
			typography: "body2",
			wordBreak: "break-word",
			"& > :first-child": {
				mt: 0,
			},
			"& > :last-child": {
				mb: 0,
			},
			// The caret lives in CSS rather than the source so it never reaches the
			// Markdown parser (an appended "▌" can land inside a code fence).
			...(streaming && {
				"& > :last-child::after": {
					content: '"▌"',
				},
			}),
			"& p, & ul, & ol, & pre, & blockquote, & table": {
				my: 1,
			},
			"& ul, & ol": {
				pl: 2.5,
			},
			"& li + li": {
				mt: 0.25,
			},
			"& h1, & h2, & h3, & h4, & h5, & h6": {
				fontSize: "1em",
				fontWeight: 600,
				my: 1,
			},
			"& code": {
				fontFamily: "monospace",
				fontSize: "0.9em",
				px: 0.5,
				borderRadius: 0.5,
				bgcolor: "action.hover",
			},
			"& pre": {
				p: 1,
				borderRadius: 1,
				overflowX: "auto",
				bgcolor: "background.default",
			},
			"& pre code": {
				p: 0,
				bgcolor: "transparent",
			},
			"& blockquote": {
				mx: 0,
				pl: 1.5,
				borderLeft: 3,
				borderColor: "divider",
				color: "text.secondary",
			},
			"& table": {
				display: "block",
				overflowX: "auto",
				borderCollapse: "collapse",
			},
			"& th, & td": {
				px: 1,
				py: 0.5,
				border: 1,
				borderColor: "divider",
			},
			"& hr": {
				border: 0,
				borderTop: 1,
				borderColor: "divider",
			},
		}}
	>
		<Markdown remarkPlugins={remarkPlugins} components={components}>
			{content}
		</Markdown>
	</Box>
);
