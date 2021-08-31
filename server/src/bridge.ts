import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import * as compiler from '@yanivbasmach/splash-compiler';
import { CompletionItem, Diagnostic, Hover, Location, MarkedString, MarkupContent, MarkupKind, Range } from 'vscode-languageserver';
import * as uri from 'vscode-uri'

export function compileFile(doc: TextDocument, diagnostics: Diagnostic[]): CompilationResult {
	let text = doc.getText()
  let tokenizer = new compiler.BaseTokenizer(text)
  let parser = new compiler.Parser(doc.uri, tokenizer)

  let root = parser.parseFile()
  
  diagnostics.push(...parser.diagnostics.map(convertDiagnostic))

  let proc = new compiler.Processor()

  proc.import(compiler.sdk)
  root.index(proc)
  root.indexChildren(proc)
  proc.process(root)

  diagnostics.push(...proc.diagnostics.map(convertDiagnostic))
  return {ast: root, tokenInfos: proc.tokenInfos}
}

export function getCompletion(pos: Position, doc: TextDocument) {
  let parser = new compiler.Parser(doc.uri,new compiler.BaseTokenizer(doc.getText()))
  let completions: CompletionItem[] = []
  parser.cursor = {line: pos.line + 1, column: pos.character + 1}

  let ast
  try {
    ast = parser.parseFile()
  } catch (e) {
    console.log('parser error',e)
  }

  completions.push(...parser.completionItems.map(convertCompletion))

  let proc = new compiler.Processor()
  proc.cursor = {line: pos.line + 1, column: pos.character + 1}

  proc.import(compiler.sdk)
  try {
    ast.index(proc)
    ast.indexChildren(proc)
    proc.process(ast)
  } catch (e) {
    console.log('processor error',e)
  }

  completions.push(...proc.completionItems.map(convertCompletion))
  return completions
}

export function getTokenInfo(pos: Position, res: CompilationResult): TokenInfo {
  let cpos: compiler.Position = {line: pos.line + 1, column: pos.character + 1}
  let infos = res.tokenInfos.filter(i=>rangeContains(i.range,cpos))
  if (infos.length == 0) return
  let hover: Hover = {range: convertRange(infos[0].range), contents: []}
  for (let info of infos) {
    (<MarkedString[]>hover.contents).push({value: info.detail, language: 'splash'})
    if (info.desc) {
      (<MarkedString[]>hover.contents).push({value: info.desc.trim(), language: 'markdown'})
    }
  }
  let decl = infos.filter(i=>i.declaration).map(d=>d.declaration)[0]
  let def: Location
  
  if (decl) {
    let u = uri.URI.parse(decl.file)
    console.log(u)
    def = {range: convertRange(decl.range), uri: u.scheme == 'file' ? u.toString() : uri.URI.file(decl.file).toString()}
  }
  console.log(def)
  return {hover, definition: def}
}

function rangeContains(range: compiler.TextRange, pos: compiler.Position) {
  return range.start.line <= pos.line && range.start.column <= pos.column
    && range.end.line >= pos.line && range.end.column >= pos.column;
}

export function executeScript(ast: compiler.RootNode) {
  let script = ast.generate()
  let r = new compiler.Runtime()
  r.includeModule(compiler.sdk)
  script.run(r)
}

function convertDiagnostic(d: compiler.Diagnostic): Diagnostic {
  return {message: d.message, range: convertRange(d.range), source: 'splash', severity: d.type}
}

function convertRange(r: compiler.TextRange): Range {
  return {
    start: {line: r.start.line - 1, character: r.start.column - 1}, 
    end: {line: r.end.line - 1, character: r.end.column - 1}
  }
}

function convertCompletion(c: compiler.Completion): CompletionItem {
  return {label: c.value, detail: c.detail, documentation: c.desc ? {value: c.desc, kind: MarkupKind.Markdown} : undefined, kind: c.type}
}

interface TokenInfo {
  hover?: Hover
  definition?: Location
}

export interface CompilationResult {
  ast: compiler.RootNode
  tokenInfos: compiler.TokenInfo[]
}