/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import * as fs from "fs";
import {ClassGenerator} from './classGenerator';

const TSCONFIG =
    `{
                "compilerOptions": {
                    "module": "commonjs",
                    "target": "es5",
                    "sourceMap": true,
                    "declaration": true,
                    "declarationDir": "../../",
                    "outDir":  "../../"
                },
                "exclude": [
                    "node_modules"
                ]
    }`;


export function generateTemplateClassesFromXSD(xsdFilePath: string): void {

    const PROTECTED = 'protected';
    const xsdString = fs.readFileSync(xsdFilePath, 'utf8');

    const genSrcPath = "./src/generated";
    const generator = new ClassGenerator();

    if (!fs.existsSync(genSrcPath)) {
        fs.mkdirSync(genSrcPath);
        fs.writeFileSync('./src/generated/tsconfig.json', TSCONFIG, 'utf8');
    }

    const classFileDef = generator.generateClassFileDefinition(xsdString);

    //add classes in order of hierarchy depth to make the compiler happy

    let disclaimer = "/***********\ngenerated template classes for " + xsdFilePath + ' ' + new Date().toLocaleString() + "\n***********/\n\n";
    let types = generator.types.map((t) => `${t}`).join('\n');
    let src = disclaimer + types + '\n\n\n\n' + classFileDef.write().replace(/protected\s/g, 'public ');
    fs.writeFileSync(`./src/generated/index.ts`, src, 'utf8');

}

