/**
 * Created by eddy spreeuwers on 14-02-18.
 */
import * as fs from "fs";
import * as ts from "typescript";
import {useNormalLogModus, useVerboseLogModus} from "../src/xml-utils";

import {generateTemplateClassesFromXSD} from "../src/index";

function xsdPath(name: string){
  return   `./test/xsd/${name}.xsd`;
}

useVerboseLogModus();

describe("generator", () => {


        it(" has function generateTemplateClassesFromXSD", () => {
            expect(generateTemplateClassesFromXSD).toBeDefined();

        });

        it("creates simpleClass.ts", () => {
            expect(generateTemplateClassesFromXSD(xsdPath("simpleClass"),{Xs: "./ns"}));
            printFile("./src/generated/simpleClass.ts");
        });

        it("creates importedClass.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/importedClass.xsd",
                {dep: "./ns"} as Map<string, string>));
            printFile("./src/generated/importedClass.ts");
            compile("./src/generated/importedClass.ts");
        });

        it("creates simpleInheritedClass.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/simpleInheritedClass.xsd",
                {Xs: "./ns"} as Map<string, string>));
            printFile("./src/generated/simpleInheritedClass.ts");
            compile("./src/generated/simpleInheritedClass.ts");
        });

        it("creates xep-004.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/xep-004.xsd",{jabber:'./ns'}, 'jabber'));
            printFile("./src/generated/xep-004.ts");
            compile("./src/generated/xep-004.ts");
        });

        it("creates heeft een types property", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/simpleType.xsd"));
            printFile("./src/generated/simpleType.ts");
            compile("./src/generated/simpleType.ts");
        });

        it("creates group.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/group.xsd"));
            printFile("./src/generated/group.ts");
            compile("./src/generated/group.ts");
        });

       it("creates types.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/types.xsd"));
            printFile("./src/generated/types.ts");
            compile("./src/generated/types.ts");
        });

        it("creates element.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/element.xsd",{ Xs : "./ns"} ));
            printFile("./src/generated/element.ts");
            compile("./src/generated/element.ts");
        });

        it("creates capabilities_1_3_0.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/capabilities_1_3_0.xsd", { wms : "./wms", xlink: "./xlink"} ));
            printFile("./src/generated/capabilities_1_3_0.ts");
            compile("./src/generated/capabilities_1_3_0.ts");
        });

        it("creates defNamespace.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/defNamespace.xsd",{ dep : "./ns"} ));
            printFile("./src/generated/defNamespace.ts");
            compile("./src/generated/defNamespace.ts");
        });

        it("creates inversedNamespace.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/inversedNamespace.xsd",{ dep : "./ns"}, 'dep' ));
            printFile("./src/generated/inversedNamespace.ts");
            compile("./src/generated/inversedNamespace.ts");
        });

        it("creates dep.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/dep.xsd"));
            printFile("./src/generated/dep.ts");
            compile("./src/generated/dep.ts");
        });

        it("creates a single element schema.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/singleElm.xsd"));
            printFile("./src/generated/singleElm.ts");
            compile("./src/generated/singleElm.ts");
        });

});

function printFile(fname:string) {
    const s = fs.readFileSync(fname).toString();
    console.log(s);
}



function compile(tsFile: string): void {
    expect( compileAll([tsFile]) ).toBe(true);
}

function compileAll(tsFiles: string[]): boolean {

    return _compile(tsFiles, {
        module: ts.ModuleKind.CommonJS,
        noEmitOnError: true,
        noImplicitAny: false,
        target: ts.ScriptTarget.ES5,
    });
}



function _compile(fileNames: string[], options: ts.CompilerOptions): boolean {


    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit();

    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    allDiagnostics.forEach( (diagnostic) => {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log(`Compiling process exiting with code '${exitCode}'.`);
    return !emitResult.emitSkipped;
}


