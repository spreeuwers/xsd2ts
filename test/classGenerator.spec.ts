/**
 * Created by isc05210 on 14-02-18.
 */;
import {ClassGenerator} from "../src/classGenerator";
import * as fs from "fs";

describe("ClassGenerator", () => {
    describe("ClassGenerator simpleClass", () => {
        let generator: ClassGenerator;
        let simpleClassXsd = '';
        let simpleInheritedClassXsd = '';
        let importedClassXsd = '';
        beforeEach(() => {
            generator = new ClassGenerator(<Map<string,string>>{"dep":"xml-parser"});
            simpleClassXsd = fs.readFileSync('./test/simpleClass.xsd').toString();
            simpleInheritedClassXsd = fs.readFileSync('./test/simpleInheritedClass.xsd').toString();
            importedClassXsd = fs.readFileSync('./test/importedClass.xsd').toString();
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
            expect(generator.generateClassFileDefinition('').classes.length).toBe(0);
        });
        it("ClassGenerator geeft een simpele classFile terug", () => {
            expect(generator.generateClassFileDefinition(simpleClassXsd,'',true).classes.length).toBe(1);
        });

        it("ClassGenerator geeft een inherited classFile terug", () => {
            let result = generator.generateClassFileDefinition(simpleInheritedClassXsd);
            expect(result.classes.length).toBe(2);
            let test = result.getClass("Test");
            console.log(test.write());
            expect(test).toBeDefined();

            expect(test.getProperty("intField")).toBeDefined();
            expect(test.getProperty("dateField")).toBeDefined();
            expect(test.getMethod("constructor")).toBeDefined();
            expect(test.getProperty("dateField").type.isArrayType()).toBe(false);
            expect(test.getProperty("arrayField?").type.isArrayType()).toBe(true);
        });

        it("ClassGenerator geeft een  classFile terug met imports", () => {
            expect(generator.generateClassFileDefinition(importedClassXsd,'',true).classes.length).toBe(1);
        });

    });
});
