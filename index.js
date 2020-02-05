"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var fs = require("fs");
var classGenerator_1 = require("./classGenerator");
var xml_utils_1 = require("./xml-utils");
var TSCONFIG = "{\n                \"compilerOptions\": {\n                    \"module\": \"commonjs\",\n                    \"target\": \"es5\",\n                    \"sourceMap\": true,\n                    \"declaration\": true,\n                    \"declarationDir\": \"../../\",\n                    \"outDir\":  \"../../\"\n                },\n                \"exclude\": [\n                    \"node_modules\"\n                ]\n    }";
var importStatements = [];
var imports = {};
// function  nsResolver(ns: string): void {
//     importStatements.push(`import * as ${ns} from "${imports[ns]}";\n`);
// }
// export function generateTemplateClassesFromXSD(xsdFilePath: string, dependencies?: Map<string,string>): void {
//     let imports = dependencies || <Map<string,string>>{};
//      console.log(JSON.stringify(dependencies));
//
//     const PROTECTED = 'protected';
//     const xsdString = fs.readFileSync(xsdFilePath, 'utf8');
//     const fileName =  xsdFilePath.split("/").reverse()[0].replace(".xsd",".ts");
//
//     const genSrcPath = "./src/generated";
//     const generator = new ClassGenerator(imports);
//
//     if (!fs.existsSync(genSrcPath)) {
//         fs.mkdirSync(genSrcPath);
//         fs.writeFileSync('./src/generated/tsconfig.json', TSCONFIG, 'utf8');
//     }
//
//     const classFileDef = generator.generateClassFileDefinition(xsdString, 's');
//
//     //add classes in order of hierarchy depth to make the compiler happy
//
//     let disclaimer = "/***********\ngenerated template classes for " + xsdFilePath + ' ' + new Date().toLocaleString() + "\n***********/\n\n";
//     let types = generator.types.map((t) => `${t}`).join("\n");
//     let src = disclaimer + types + '\n\n\n\n' + classFileDef.write().replace(/protected\s/g, 'public ');
//     fs.writeFileSync(`${genSrcPath}/${fileName}`, src, 'utf8');
//
// }
function verbose() {
    xml_utils_1.useVerboseLogModus();
}
exports.verbose = verbose;
function generateTemplateClassesFromXSD(xsdFilePath, dependencies, xmlnsName) {
    if (dependencies === void 0) { dependencies = {}; }
    if (xmlnsName === void 0) { xmlnsName = 'xmlns'; }
    var imports = dependencies;
    console.log(JSON.stringify(dependencies));
    var xsdString = fs.readFileSync(xsdFilePath, 'utf8');
    var fileName = xsdFilePath.split("/").reverse()[0].replace(".xsd", ".ts");
    var genSrcPath = "./src/generated";
    var generator = new classGenerator_1.ClassGenerator(imports);
    generator.xmlnsName = xmlnsName;
    generator.schemaName = fileName.replace(".ts", "").replace(/\W/g, '_');
    if (!fs.existsSync(genSrcPath)) {
        fs.mkdirSync(genSrcPath);
        fs.writeFileSync('./src/generated/tsconfig.json', TSCONFIG, 'utf8');
    }
    var classFileDef = generator.generateClassFileDefinition(xsdString, 's');
    //add classes in order of hierarchy depth to make the compiler happy
    var disclaimer = "/***********\ngenerated template classes for " + xsdFilePath + ' ' + new Date().toLocaleString() + "\n***********/\n\n";
    var src = disclaimer + '\n\n\n\n' + classFileDef.write().replace(/protected\s/g, 'public ');
    fs.writeFileSync(genSrcPath + "/" + fileName, src, 'utf8');
    fs.writeFileSync(genSrcPath + "/index.ts", src, 'utf8');
}
exports.generateTemplateClassesFromXSD = generateTemplateClassesFromXSD;
