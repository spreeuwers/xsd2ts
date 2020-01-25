/**
 * Created by eddy spreeuwers on 14-02-18.
 */
import * as fs from "fs";
import * as ts from "typescript";
import {generateTemplateClassesFromXSD2} from "../src/index";

function xsdPath(name: string){
  return   `./test/xsd/${name}.xsd`;
}

describe("generator", () => {


        it(" has function generateTemplateClassesFromXSD", () => {
            expect(generateTemplateClassesFromXSD2).toBeDefined();

        });

        it("creates simpleClass.ts", () => {
            expect(generateTemplateClassesFromXSD2(xsdPath("simpleClass"),{Xs: "./ns"}));
            printFile("./src/generated/simpleClass.ts");
        });

        fit("creates importedClass.ts", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/importedClass.xsd",
                {dep: "./ns"} as Map<string, string>));
            printFile("./src/generated/importedClass.ts");
        });

        it("creates simpleInheritedClass.ts", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/simpleInheritedClass.xsd",
                {Xs: "./ns"} as Map<string, string>));
            printFile("./src/generated/simpleInheritedClass.ts");
        });

        it("creates xep-004.ts", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/xep-004.xsd"));
            printFile("./src/generated/xep-004.ts");
        });

        it("creates heeft een types property", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/simpleType.xsd"));
            printFile("./src/generated/simpleType.ts");
            compile(["./src/generated/simpleType.ts"]);
        });

        it("creates group.ts", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/group.xsd"));
            printFile("./src/generated/group.ts");
            compile(["./src/generated/group.ts"]);
        });

       it("creates types.ts", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/types.xsd"));
            printFile("./src/generated/types.ts");
            compile(["./src/generated/types.ts"]);
        });

        it("creates element.ts", () => {
            expect(generateTemplateClassesFromXSD2("./test/xsd/element.xsd",{ Xs : "./ns"} ));
            compile(["./src/generated/element.ts"]);
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
    //process.exit(exitCode);
}


