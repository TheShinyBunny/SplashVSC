
declare module '@yanivbasmach/splash-compiler' {

	interface Tokenizer {

	}
	class BaseTokenizer implements Tokenizer {
		constructor(input: string)
	}

	class Parser {

		constructor(file: string, tokenizer: Tokenizer)

		parseFile(): RootNode

		diagnostics: Diagnostic[]
		cursor: Position
		completionItems: Completion[]
	}

	class Runtime {
		constructor()
		includeModule(module: SplashModule): void
	}

	class SplashScript {
		run(r: Runtime): void
	}

	class RootNode {
		file: string
		input: string
		valid: boolean
		index(proc: Processor): void
		indexChildren(proc: Processor): void
		generate(): SplashScript
	}

	interface Position {
		line: number
		column: number
	}

	interface TextRange {
		start: Position
		end: Position
	}

	enum DiagnosticType {
		error = 1,
		warn = 2,
		info = 3,
		hint = 4
	}

	interface Diagnostic {
		file: string
		range: TextRange
		message: string
		type: DiagnosticType
	}

	class SplashModule {

	}

	class Processor {
		import(module: SplashModule): void

		process(root: RootNode): void

		diagnostics: Diagnostic[]
		completionItems: Completion[]
		cursor: Position
		tokenInfos: TokenInfo[]
	}

	const sdk: SplashModule

	enum CompletionType {
    variable = 6,
    field = 5,
    method = 2
	}

	interface PartialCompletion {
		value: string
		detail?: string
		desc?: string
		type?: CompletionType
	}

	interface Completion extends PartialCompletion {
		range: TextRange
	}

	interface TextLocation {
		file: string
		range: TextRange
	}

	interface TokenInfo {
		range: TextRange
		detail: string
		desc?: string
		declaration?: TextLocation
	}

	
}