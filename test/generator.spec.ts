/**
 * Created by isc05210 on 14-02-18.
 */;
import {generateTemplateClassesFromXSD} from "../src/index";
import * as fs from "fs";

describe("generator", () => {
    describe("generator simpleClass", () => {
        let simpleClassXsd = '';
        let simpleInheritedClassXsd = '';

        beforeEach(() => {
            simpleClassXsd = fs.readFileSync('./test/simpleClass.xsd').toString();
            simpleInheritedClassXsd = fs.readFileSync('./test/simpleInheritedClass.xsd').toString();
        });



        it(" has function generateTemplateClassesFromXSD", () => {
            expect(generateTemplateClassesFromXSD).toBeDefined();
        });

        it("ClassGenerator heeft een types property", () => {
            expect(generateTemplateClassesFromXSD('./test/simpleClass.xsd'));
        });
        it("ClassGenerator heeft een types property", () => {
            expect(generateTemplateClassesFromXSD('./test/importedClass.xsd',<Map<string,string>>{"dep":"xml-parser"}));
        });
        it("ClassGenerator heeft een types property", () => {
            expect(generateTemplateClassesFromXSD('./test/simpleInheritedClass.xsd',<Map<string,string>>{"dep":"xml-parser"}));
        });


    });
});
