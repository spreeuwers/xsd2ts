"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var fs = require("fs");
var classGenerator_1 = require("./classGenerator");
var TSCONFIG = "{\n                \"compilerOptions\": {\n                    \"module\": \"commonjs\",\n                    \"target\": \"es5\",\n                    \"sourceMap\": true,\n                    \"declaration\": true,\n                    \"declarationDir\": \"../../\",\n                    \"outDir\":  \"../../\"\n                },\n                \"exclude\": [\n                    \"node_modules\"\n                ]\n    }";
var importStatements = [];
var imports = {};
function nsResolver(ns) {
    importStatements.push("import * as " + ns + " from \"" + imports[ns] + "\";\n");
}
function generateTemplateClassesFromXSD(xsdFilePath, dependencies) {
    var imports = dependencies || {};
    console.log(JSON.stringify(dependencies));
    var PROTECTED = 'protected';
    var xsdString = fs.readFileSync(xsdFilePath, 'utf8');
    var genSrcPath = "./src/generated";
    var generator = new classGenerator_1.ClassGenerator(imports);
    if (!fs.existsSync(genSrcPath)) {
        fs.mkdirSync(genSrcPath);
        fs.writeFileSync('./src/generated/tsconfig.json', TSCONFIG, 'utf8');
    }
    var classFileDef = generator.generateClassFileDefinition(xsdString, '');
    //add classes in order of hierarchy depth to make the compiler happy
    var disclaimer = "/***********\ngenerated template classes for " + xsdFilePath + ' ' + new Date().toLocaleString() + "\n***********/\n\n";
    var types = generator.types.map(function (t) { return "" + t; }).join('\n');
    var src = disclaimer + types + '\n\n\n\n' + classFileDef.write().replace(/protected\s/g, 'public ');
    fs.writeFileSync("./src/generated/index.ts", src, 'utf8');
}
exports.generateTemplateClassesFromXSD = generateTemplateClassesFromXSD;
