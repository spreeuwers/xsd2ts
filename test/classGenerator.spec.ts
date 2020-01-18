/**
 * Created by eddy spreeuwers 14-02-18.
 */import {FileDefinition} from "ts-code-generator";
import {ClassGenerator} from "../src/classGenerator";
import * as fs from "fs";

let logClassDef = function (result: FileDefinition) {
    console.log('\n----- classdef --------\n');
    console.log(result.write());
    console.log("\n-----------------------\n");
    result.classes.forEach((c) => {
        console.log(c.name);
    });
    console.log("\n-------------\n");
};

describe("ClassGenerator", () => {
        let generator: ClassGenerator;
        let simpleClassXsd = ""
        let simpleInheritedClassXsd ="";
        let importedClassXsd = "";
        let formXsd: string = "";
        let typesXsd = "";
        let groupXsd = "";
        let elmXsd = "";
        let choiceXsd = "";
        let simpleTypeXsd = "";
        let singleElmXsd = "";
        beforeEach(() => {
            generator = new ClassGenerator(<Map<string,string>>{"dep":"xml-parser"});
            simpleClassXsd = fs.readFileSync('./test/xsd/simpleClass.xsd').toString();
            simpleInheritedClassXsd = fs.readFileSync('./test/xsd/simpleInheritedClass.xsd').toString();
            importedClassXsd = fs.readFileSync('./test/xsd/importedClass.xsd').toString();
            formXsd = fs.readFileSync("./test/xsd/xep-004.xsd").toString();
            choiceXsd = fs.readFileSync("./test/xsd/choice.xsd").toString();
            typesXsd = fs.readFileSync("./test/xsd/types.xsd").toString();
            groupXsd = fs.readFileSync("./test/xsd/group.xsd").toString();
            elmXsd = fs.readFileSync("./test/xsd/element.xsd").toString();
            singleElmXsd = fs.readFileSync("./test/xsd/singleElm.xsd").toString();
            simpleTypeXsd = fs.readFileSync("./test/xsd/simpletype.xsd").toString();
        });

        it("heeft een werkende constructor", () => {
            expect(generator).toBeDefined();
        });

        it("heeft een generateClassFileDefition methode", () => {
            expect(generator.generateClassFileDefinition).toBeDefined();
        });

        it("heeft een types property", () => {
            expect(generator.types).toBeDefined();
        });

        it("heeft een types property", () => {
            expect(generator.generateClassFileDefinition("").classes.length).toBe(0);
        });

        it("returns a simple classFile ", () => {
            const result = generator.generateClassFileDefinition(simpleClassXsd);
            logClassDef(result);
            expect(result.classes.length).toBe(3);

        });

        it("geeft een inherited classFile terug", () => {
            const result = generator.generateClassFileDefinition(simpleInheritedClassXsd, '', true);
            logClassDef(result);
            expect(result.classes.length).toBe(6);
            let test = result.getClass("InheridedClass");
            console.log(test.write());
            expect(test).toBeDefined();
            expect(test.extendsTypes[0].text).toBe('Base');
            expect(test.getProperty("intField")).toBeDefined();
            expect(test.getProperty("dateField")).toBeDefined();
            expect(test.getMethod("constructor")).toBeDefined();
            expect(test.getProperty("dateField").type.isArrayType()).toBe(false);
            expect(test.getProperty("arrayField?").type.isArrayType()).toBe(true);
            expect(test.getProperty("nestedFields").type.isArrayType()).toBe(false);
            expect(test.getProperty("nestedFields").type.text).toBe("NestedFields");
            expect(test.getProperty("strArrayField").type.text).toBe("string[]");
        });

        it("geeft een  classFile terug met imports", () => {
            let importingClass =generator.generateClassFileDefinition(importedClassXsd, '' , true);
            expect(importingClass.classes.length).toBe(1);
            let fld = importingClass.getClass("Test").getProperty("imported");
            expect(fld).toBeDefined();
        });

        fit("geeft een  classFile terug voor form met refs", () => {
            const classFile = generator.generateClassFileDefinition(formXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(6);
            let fld = classFile.getClass("X").getProperty("field?");
            expect(fld.type.text).toBe("Field[]");
            expect(fld.name).toBe("field?");

            fld = classFile.getClass("Field").getProperty("option?");
            expect(fld.type.text).toBe("Option[]");
            expect(fld.name).toBe("option?");

        });

        it("geeft een  classFile terug voor form met refs", () => {
            const classFile = generator.generateClassFileDefinition2(formXsd, "", true);

            console.log(classFile.write());
            const  classNames = ['X', 'Field', 'Option', 'ForValue', 'Item', 'Reported' ];
            expect(classFile.classes.length).toBe(classNames.length);
            let fld = classFile.getClass("X").getProperty("field?");
            expect(fld.type.text).toBe("Field[]");
            expect(fld.name).toBe("field?");

            fld = classFile.getClass("Field").getProperty("option?");
            expect(fld.type.text).toBe("Option[]");
            expect(fld.name).toBe("option?");

        });

        it("returns a  classFile with special types from typesXsd", () => {
            let classFile = generator.generateClassFileDefinition(typesXsd, "", true);
            let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(types, "\n\n", classFile.write());
            expect(classFile.classes.length).toBe(7);
            let fld = classFile.getClass("Module")?.getProperty("param");
            expect(fld.type.text).toBe("Param");
        });

        it("geeft een  classFile terug voor een enkel leeg element", () => {

            let classFile = generator.generateClassFileDefinition(singleElmXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(0);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });

        it("returns a classFile for a groupXsd", () => {

            let classFile = generator.generateClassFileDefinition(groupXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(2);
            let c  = classFile.getClass("Ordertype");
            console.log('class:  ' ,  c.write());
            expect(c).toBeDefined();
            let p  = c.getProperty('customer');
            expect(p.type).toBeDefined();

        });
        it("returns a classFile for a single element with nested type", () => {

            let classFile = generator.generateClassFileDefinition(elmXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(1);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });
        it("returns a classFile for a simpleTypeXsd", () => {

            let classFile = generator.generateClassFileDefinition(simpleTypeXsd, "", true);
            let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(types,"\n\n", classFile.write());
            expect(classFile.classes.length).toBe(0);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });

        it("returns a classFile for a simpleTypeXsd", () => {

            let classFile = generator.generateClassFileDefinition2(simpleClassXsd, "", true);
            let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(types,"\n\n", classFile.write());
            expect(classFile.classes.length).toBe(3);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });

        it("returns a classFile for a simpleTypeXsd", () => {

            let classFile = generator.generateClassFileDefinition2(simpleTypeXsd, "", true);
            let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(types,"\n\n", classFile.write());
            expect(classFile.classes.length).toBe(0);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });

        it("returns a  classFile with special types from typesXsd", () => {
            let classFile = generator.generateClassFileDefinition2(typesXsd, "", true);
            //let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(classFile.write());
            expect(classFile.classes.length).toBe(7);
            let method = classFile.getClass("Module")?.getMethod("param");
            expect(method?.returnType?.text).toBe("void");
        });

        it("returns a  classFile with special types from typesXsd", () => {
            let classFile = generator.generateClassFileDefinition2(choiceXsd, "", true);
            //let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(classFile.write());
            expect(classFile.classes.length).toBe(7);
            let method = classFile.getClass("Module")?.getMethod("param");
            expect(method?.returnType?.text).toBe("void");
        });
});
