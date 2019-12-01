/**
 * Created by eddy spreeuwers on 14-02-18.
 */
import * as fs from "fs";
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
        });

        it("creates element.ts", () => {
            expect(generateTemplateClassesFromXSD("./test/xsd/element.xsd",{ Xs : "./ns"} ));
        });

});
