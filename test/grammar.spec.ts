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
        let ast = testGrammar(elmXsd);
        expect((ast as any).types.length).toBe(1);
        expect((ast as any).types[0].nodeType).toBe('Class');
        expect((ast as any).types[0].name).toBe('classname');
        expect((ast as any).types[0].fields).toBeDefined();
        expect((ast as any).types[0].fields[0].nodeType).toBe('Field');
        expect((ast as any).types[0].fields[0].fieldName).toBe('intField');
        expect((ast as any).types[0].fields[0].fieldType).toBe('xs:integer');
    });

    it(" can parse a simple class starting with complexType", () => {

        let ast = testGrammar(simpleClassXsd);
        expect((ast as any).types.length).toBe(1);
        expect((ast as any).types[0].nodeType).toBe('Class');
        expect((ast as any).types[0].name).toBe('Test');
        expect((ast as any).types[0].fields).toBeDefined();
        expect((ast as any).types[0].fields[0].nodeType).toBe('Field');
        expect((ast as any).types[0].fields[0].fieldName).toBe('intField');
        expect((ast as any).types[0].fields[0].fieldType).toBe('xs:integer');
    });

    it(" can parse a simple class starting with an imported type namspace", () => {
        let ast = testGrammar(importedClassXsd);
        expect((ast as any).types.length).toBe(1);
        expect((ast as any).types[0].nodeType).toBe('Class');
        expect((ast as any).types[0].name).toBe('Test');
        expect((ast as any).types[0].fields).toBeDefined();
        expect((ast as any).types[0].fields[0].nodeType).toBe('Field');
        expect((ast as any).types[0].fields[0].fieldName).toBe('firstName');
        expect((ast as any).types[0].fields[0].fieldType).toBe('xs:string');
        expect((ast as any).types[0].fields[2].nodeType).toBe('Field');
        expect((ast as any).types[0].fields[2].fieldName).toBe('imported');
        expect((ast as any).types[0].fields[2].fieldType).toBe('dep:Node');
    });

    it(" can parse a simple simple Inherited Class", () => {
        let ast = testGrammar(simpleInheritedClassXsd);
        expect((ast as any).types.length).toBe(1);
        expect((ast as any).types[0].nodeType).toBe('Class');
        expect((ast as any).types[0].name).toBe('Test');
        expect((ast as any).types[0].fields).toBeDefined();
        expect((ast as any).types[0].fields[0].nodeType).toBe('Field');
        expect((ast as any).types[0].fields[0].fieldName).toBe('nestedFields');
        expect((ast as any).types[0].fields[0].fieldType).toBe('NestedFields');
        expect((ast as any).types[0].fields[2].nodeType).toBe('Field');
        expect((ast as any).types[0].fields[2].fieldName).toBe('dateField');
        expect((ast as any).types[0].fields[2].fieldType).toBe('xs:dateTime');
    });

    it(" can parse a simple enumeration  starting with element", () => {
        let ast = testGrammar(simpleTypeXsd);
        expect((ast as any).types[0].nodeType).toBe('AliasType');
        expect((ast as any).types[0].name).toBe('age');
        expect((ast as any).types[0].type).toBe('integer');

        expect((ast as any).types[1].nodeType).toBe('Enumeration');
        expect((ast as any).types[1].name).toBe('option');
        expect((ast as any).types[1].values).toBeDefined();
        expect((ast as any).types[1].values[0].value).toBe('A');
        expect((ast as any).types[1].values[1].value).toBe('B');

    });

    fit(" can parse a group tag", () => {
        let ast = testGrammar(groupXsd);
        expect((ast as any).types[0].nodeType).toBe('Class');
        expect((ast as any).types[0].name).toBe('group_custGroup');
        //expect((ast as any).types[0].type).toBe('group_custGroup');



    });





});

function printFile(fname:string) {
    const s = fs.readFileSync(fname).toString();
    console.log(s);
}


function testGrammar (elmXsd: string) {
    const grammar = new Grammar();
    console.log('src:', elmXsd);
    const xmlDom = new DOMParser().parseFromString(elmXsd, 'application/xml');
    const xmlNode = xmlDom.documentElement;

    let ast = grammar.parse(xmlNode);
    console.log('\n-----\nast:', JSON.stringify((ast || ''), null, ' '));
    expect(ast).toBeDefined();
    expect(ast.nodeType).toBe('schema');
    return ast;
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


