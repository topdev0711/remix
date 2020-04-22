import { default as category } from './categories'
import { default as algorithm } from './algorithmCategories'
import { isStringToBytesConversion, isBytesLengthCheck } from './staticAnalysisCommon'
import { AnalyzerModule, ModuleAlgorithm, ModuleCategory, ReportObj, CompilationResult, MemberAccessAstNode, FunctionCallAstNode} from './../../types'

export default class stringBytesLength implements AnalyzerModule {
  name: string = `String length: `
  description: string = `Bytes length != String length`
  category: ModuleCategory = category.MISC
  algorithm: ModuleAlgorithm = algorithm.EXACT

  stringToBytesConversions: FunctionCallAstNode[] = []
  bytesLengthChecks: MemberAccessAstNode[] = []

  visit (node: FunctionCallAstNode | MemberAccessAstNode): void {
    if (node.nodeType === "FunctionCall" && isStringToBytesConversion(node)) this.stringToBytesConversions.push(node)
    else if (node.nodeType === "MemberAccess" && isBytesLengthCheck(node)) this.bytesLengthChecks.push(node)
  }

  report (compilationResults: CompilationResult): ReportObj[] {
    if (this.stringToBytesConversions.length > 0 && this.bytesLengthChecks.length > 0) {
      return [{
        warning: 'Bytes and string length are not the same since strings are assumed to be UTF-8 encoded (according to the ABI defintion) therefore one character is not nessesarily encoded in one byte of data.',
        location: this.bytesLengthChecks[0].src,
        more: 'https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI#argument-encoding'
      }]
    } else {
      return []
    }
  }
}
