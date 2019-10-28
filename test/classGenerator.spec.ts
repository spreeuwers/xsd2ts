/**
 * Created by eddy spreeuwers 14-02-18.
 */import {FileDefinition} from "ts-code-generator";
;
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
    describe("ClassGenerator simpleClass", () => {
        let generator: ClassGenerator;
        let simpleClassXsd = ""
        let simpleInheritedClassXsd ="";
        let importedClassXsd = "";
        let formXsd: string = "";
        let typesXsd = "";
        let groupXsd = "";
        let elmXsd = "";
        let simpleTypeXsd = '';
        beforeEach(() => {
            generator = new ClassGenerator(<Map<string,string>>{"dep":"xml-parser"});
            simpleClassXsd = fs.readFileSync('./test/simpleClass.xsd').toString();
            simpleInheritedClassXsd = fs.readFileSync('./test/simpleInheritedClass.xsd').toString();
            importedClassXsd = fs.readFileSync('./test/importedClass.xsd').toString();
            formXsd = fs.readFileSync("./test/form.xsd").toString();
            typesXsd = fs.readFileSync("./test/types.xsd").toString();
            groupXsd = fs.readFileSync("./test/group.xsd").toString();
            elmXsd = fs.readFileSync("./test/element.xsd").toString();
            simpleTypeXsd = fs.readFileSync("./test/simpletype.xsd").toString();
        });

        it("ClassGenerator heeft een werkende constructor", () => {
            expect(generator).toBeDefined();
        });

        it("ClassGenerator heeft een generateClassFileDefition methode", () => {
            expect(generator.generateClassFileDefinition).toBeDefined();
        });

        it("ClassGenerator heeft een types property", () => {
            expect(generator.types).toBeDefined();
        });

        it("ClassGenerator heeft een types property", () => {
            expect(generator.generateClassFileDefinition("").classes.length).toBe(0);
        });

        it("ClassGenerator returns a simple classFile ", () => {
            const result = generator.generateClassFileDefinition(simpleClassXsd);
            logClassDef(result);
            expect(result.classes.length).toBe(2);

        });

        it("ClassGenerator geeft een inherited classFile terug", () => {
            const result = generator.generateClassFileDefinition(simpleInheritedClassXsd);
            logClassDef(result);
            expect(result.classes.length).toBe(5);
            let test = result.getClass("Test");
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

            //test = result.getClass("MeldingIdentificatie");
            //console.log(test.write());
            //expect(test).toBeDefined();
            //expect(test.getProperty("externeBrons").type.text).toBe("string[]");
        });

        it("ClassGenerator geeft een  classFile terug met imports", () => {
            let importingClass =generator.generateClassFileDefinition(importedClassXsd,'',true);
            expect(importingClass.classes.length).toBe(1);
            let fld = importingClass.getClass("Test").getProperty("imported");
            expect(fld).toBeDefined();
        });

        fit("ClassGenerator geeft een  classFile terug voor form met refs", () => {
            let classFile = generator.generateClassFileDefinition(formXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(4);
            let fld = classFile.getClass("Forms").getProperty("field");
            expect(fld.type.text).toBe("Field");
            expect(fld.name).toBe("field");

            fld = classFile.getClass("Forms").getProperty("option");
            expect(fld.type.text).toBe("Option");
            expect(fld.name).toBe("option");

        });
        it("ClassGenerator returns a  classFile with special types from typesXsd", () => {
            let classFile = generator.generateClassFileDefinition(typesXsd, "", true);
            let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(types,"\n\n", classFile.write());
            expect(classFile.classes.length).toBe(7);
            let fld = classFile.getClass("Schema").getProperty("item");
            expect(fld.type.text).toBe("Item");

        });

        it("ClassGenerator geeft een  classFile terug voor een element", () => {
            const elmXsd = `
              <?xml version='1.0' encoding='UTF-8'?>
                 <xs:schema xmlns:xs='http://www.w3.org/2001/XMLSchema'>
                   <xs:element name="naam" type="string"/>
                 </xs:schema>
                 
             `
            let classFile = generator.generateClassFileDefinition(elmXsd,"",true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(1);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });

        it("ClassGenerator returns a classFile for a groupXsd", () => {

            let classFile = generator.generateClassFileDefinition(groupXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(3);
            let c  = classFile.getClass("Ordertype");
            console.log('class:  ' ,  c.write());
            expect(c).toBeDefined();
            let p  = c.getProperty('customer');
            //console.log('prop:  ' ,  p);
            expect(p.type).toBeDefined();

        });
        it("ClassGenerator returns a classFile for a single element with nested type", () => {

            let classFile = generator.generateClassFileDefinition(elmXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(2);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });
        it("ClassGenerator returns a classFile for a simpleTypeXsd", () => {

            let classFile = generator.generateClassFileDefinition(simpleTypeXsd,"",true);
            let types = generator.types.map((t) => `${t}`).join("\n");
            console.log("-------------------------------------\n");
            console.log(types,"\n\n", classFile.write());
            expect(classFile.classes.length).toBe(1);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });
    });
});
