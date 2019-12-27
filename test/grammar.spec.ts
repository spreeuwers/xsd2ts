/**
 * Created by eddy spreeuwers on 14-02-18.
 */
import * as fs from "fs";
import * as ts from "typescript";
import {Grammar} from "../src/xml-grammar";
import {DOMParser} from "xmldom-reborn";


fdescribe("grammar", () => {

    let simpleClassXsd = ""
    let simpleInheritedClassXsd ="";
    let importedClassXsd = "";
    let formXsd: string = "";
    let typesXsd = "";
    let groupXsd = "";
    let elmXsd = "";
    let simpleTypeXsd = "";
    let singleElmXsd = "";
    beforeEach(() => {
        simpleClassXsd = fs.readFileSync('./test/xsd/simpleClass.xsd').toString();
        simpleInheritedClassXsd = fs.readFileSync('./test/xsd/simpleInheritedClass.xsd').toString();
        importedClassXsd = fs.readFileSync('./test/xsd/importedClass.xsd').toString();
        formXsd = fs.readFileSync("./test/xsd/xep-004.xsd").toString();
        typesXsd = fs.readFileSync("./test/xsd/types.xsd").toString();
        groupXsd = fs.readFileSync("./test/xsd/group.xsd").toString();
        elmXsd = fs.readFileSync("./test/xsd/element.xsd").toString();
        singleElmXsd = fs.readFileSync("./test/xsd/singleElm.xsd").toString();
        simpleTypeXsd = fs.readFileSync("./test/xsd/simpletype.xsd").toString();
    });



    it(" can parse a simple class starting with Element ", () => {

        const grammar = new Grammar();
        console.log('src:',elmXsd);
        const xmlDom = new DOMParser().parseFromString(elmXsd, 'application/xml');
        const xmlNode = xmlDom.documentElement;

        let ast = grammar.parse(xmlNode);
        console.log('\n-----\nast:', JSON.stringify( (ast || '') , null, ' '));
        expect(ast).toBeDefined();
        expect(ast.name).toBe('schema');
        expect((ast as any).classes.length).toBe(1);
    });

    it(" can parse a simple class starting with complexType", () => {

        const grammar = new Grammar();
        console.log('src:',simpleClassXsd);
        const xmlDom = new DOMParser().parseFromString(simpleClassXsd, 'application/xml');
        const xmlNode = xmlDom.documentElement;

        let ast = grammar.parse(xmlNode);
        console.log('\n-----\nast:', JSON.stringify( (ast || '') , null, ' '));
        expect(ast).toBeDefined();
        expect(ast.name).toBe('schema');
    });

    fit(" can parse a simple enumeration  starting with element", () => {

        const grammar = new Grammar();
        console.log('src:',simpleTypeXsd);
        const xmlDom = new DOMParser().parseFromString(simpleTypeXsd, 'application/xml');
        const xmlNode = xmlDom.documentElement;

        let ast = grammar.parse(xmlNode);
        console.log('\n-----\nast:', JSON.stringify( (ast || '') , null, ' '));
        expect(ast).toBeDefined();
        expect(ast.name).toBe('schema');
    });





});

function printFile(fname:string) {
    const s = fs.readFileSync(fname).toString();
    console.log(s);
}

function compile(tsFiles: string[] ){
    _compile(tsFiles, {
        module: ts.ModuleKind.CommonJS,
        noEmitOnError: true,
        noImplicitAny: false,
        target: ts.ScriptTarget.ES5,

    });
}



function _compile(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit();

    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log(`Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}


