/**
 * Created by eddy spreeuwers on 14-02-18.
 */
import * as fs from "fs";
import * as ts from "typescript";
import {XsdGrammar} from "../src/xsd-grammar";
import {DOMParser} from "xmldom-reborn";



describe("grammar", () => {

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


    it(" can parse a single elements  ", () => {
        let ast = testGrammar(singleElmXsd);
        expect((ast).children.length).toBe(1);
        expect((ast).children[0].nodeType).toBe('AliasType');
        expect((ast).children[0].name).toBe("naam");
        expect((ast).children[0].attr.type).toBe("xs:string");
    });

    it(" can parse a simple class starting with Element ", () => {
        let ast = testGrammar(elmXsd);
        expect(ast.children.length).toBe(7);
        expect(ast.children[0].nodeType).toBe('Class');
        expect(ast.children[0].name).toBe('Classname');
        expect(ast.children[0].children).toBeDefined();
        expect(ast.children[0].children[0].nodeType).toBe('Field');
        expect(ast.children[0].children[0].attr.fieldName).toBe('intField');
        expect(ast.children[0].children[0].attr.fieldType).toBe('number');
        expect(ast.children[0].children[1].nodeType).toBe('Field');
        expect(ast.children[0].children[1].attr.fieldName).toBe('dateField');
        expect(ast.children[0].children[1].attr.fieldType).toBe('Date');

        expect(ast.children[0].children[2].nodeType).toBe('Field');
        expect(ast.children[0].children[2].attr.fieldName).toBe('things');
        expect(ast.children[0].children[2].attr.fieldType).toBe('Things');

        expect(ast.children[2].children[0].nodeType).toBe('Field');
        expect(ast.children[2].children[0].attr.fieldName).toBe('show?');
        expect(ast.children[2].children[0].attr.fieldType).toBe('Show[]');

        expect(ast.children[6].nodeType).toBe('AliasType');
        expect(ast.children[6].attr.type).toBe('xs:string');
        expect(ast.children[6].attr.element).toBe('true');
        expect(ast.children[6].name).toBe('xxx');
    });

    it(" can parse a simple class starting with complexType", () => {

        let ast = testGrammar(simpleClassXsd);
        expect(ast.children.length).toBe(2);
        expect(ast.children[0].nodeType).toBe('AliasType');
        expect(ast.children[0].name).toBe('test');
        expect(ast.children[1].nodeType).toBe('Class');
        expect(ast.children[1].name).toBe('Test');
        expect(ast.children[1].children).toBeDefined();
        expect(ast.children[1].children[0].nodeType).toBe('Field');
        expect(ast.children[1].children[0].attr.fieldName).toBe('intField');
        expect(ast.children[1].children[0].attr.fieldType).toBe('number');
    });

    it(" can parse a simple class starting with an imported type namspace", () => {
        let ast = testGrammar(importedClassXsd);
        expect(ast.children.length).toBe(1);
        expect(ast.children[0].nodeType).toBe('Class');
        expect(ast.children[0].name).toBe('Test');
        expect(ast.children[0].children).toBeDefined();
        expect(ast.children[0].children[0].nodeType).toBe('Field');
        expect(ast.children[0].children[0].attr.fieldName).toBe('firstName');
        expect(ast.children[0].children[0].attr.fieldType).toBe('string');
        expect(ast.children[0].children[2].nodeType).toBe('Field');
        expect(ast.children[0].children[2].attr.fieldName).toBe('imported');
        expect(ast.children[0].children[2].attr.fieldType).toBe('dep.Node');
    });

    it(" can parse a simple simple Inherited Class", () => {
        let ast = testGrammar(simpleInheritedClassXsd);
        expect(ast.children.length).toBe(2);
        expect(ast.children[0].nodeType).toBe('Class');
        expect(ast.children[0].name).toBe('InheridedClass');
        expect(ast.children[0].children).toBeDefined();
        expect(ast.children[0].children[0].nodeType).toBe('Field');
        expect(ast.children[0].children[0].attr.fieldName).toBe('nestedFields');
        expect(ast.children[0].children[0].attr.fieldType).toBe('NestedFields');
        expect(ast.children[0].children[2].nodeType).toBe('Field');
        expect(ast.children[0].children[2].attr.fieldName).toBe('dateField');
        expect(ast.children[0].children[2].attr.fieldType).toBe('Date');
    });

    it(" can parse a simple enumeration and simpletypes starting with element", () => {
        let ast = testGrammar(simpleTypeXsd);
        expect(ast.children[0].nodeType).toBe('AliasType');
        expect(ast.children[0].name).toBe('age1');
        expect(ast.children[0].attr.type).toBe('number');

        expect(ast.children[1].nodeType).toBe('AliasType');
        expect(ast.children[1].name).toBe('age2');
        expect(ast.children[1].attr.type).toBe('number');

        expect(ast.children[2].nodeType).toBe('Enumeration');
        expect(ast.children[2].name).toBe('option');
        expect(ast.children[2].attr.values).toBeDefined();
        expect(ast.children[2].attr.values[0].attr.value).toBe('A');
        expect(ast.children[2].attr.values[1].attr.value).toBe('B');

    });

    it(" can parse a group tag", () => {
        let ast = testGrammar(groupXsd);
        expect(ast.children[0].nodeType).toBe('Group');
        expect(ast.children[0].name).toBe('custGroup');
        expect(ast.children[1].nodeType).toBe('AliasType');
        expect(ast.children[1].name).toBe('order');
        expect(ast.children[2].nodeType).toBe('Class');
        expect(ast.children[2].name).toBe('Ordertype');
        //expect(ast.children[0].type).toBe('group_custGroup');



    });

    it(" can parse an attribute group tag", () => {
        let ast = testGrammar(typesXsd);
        expect(ast.children[0].nodeType).toBe('Group');
        expect(ast.children[0].name).toBe('BaseView');
        expect(ast.children[1].nodeType).toBe('Class');
        expect(ast.children[1].name).toBe('View');
        //expect(ast.children[0].type).toBe('group_custGroup');



    });





});

function printFile(fname:string) {
    const s = fs.readFileSync(fname).toString();
    console.log(s);
}


function testGrammar (elmXsd: string) {
    const grammar = new XsdGrammar("Schema");
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


