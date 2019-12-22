/**
 * Created by eddy spreeuwers on 14-02-18.
 */
import * as fs from "fs";
import * as ts from "typescript";
import {generateTemplateClassesFromXSD} from "../src/index";


describe("generator", () => {


        it(" has function generateTemplateClassesFromXSD", () => {
            expect(generateTemplateClassesFromXSD).toBeDefined();
        });

        it("creates simpleClass.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/simpleClass.xsd",{Xs: "./ns"}));
        });
        it("creates importedClass.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/importedClass.xsd",
                {Dep: "./ns"} as Map<string, string>));
        });

        it("creates simpleInheritedClass.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/simpleInheritedClass.xsd",
                {Xs: "./ns"} as Map<string, string>));
        });

        it("creates xep-004.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/xep-004.xsd"));
        });
        it("creates heeft een types property", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/simpleType.xsd"));
        });

        it("creates group.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/group.xsd"));
        });

        it("creates types.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/types.xsd"));
            printFile("./src/generated/types.ts");
            //compile(["./src/generated/types.ts"]);
        });

        it("creates element.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/element.xsd",{ Xs : "./ns"} ));
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


