/**
 * Created by eddy spreeuwers 14-02-18.
 */;
import {ClassGenerator} from "../src/classGenerator";
import * as fs from "fs";

describe("ClassGenerator", () => {
    describe("ClassGenerator simpleClass", () => {
        let generator: ClassGenerator;
        let simpleClassXsd = '';
        let simpleInheritedClassXsd = '';
        let importedClassXsd = '';
        let formXsd: string = '';
        beforeEach(() => {
            generator = new ClassGenerator(<Map<string,string>>{"dep":"xml-parser"});
            simpleClassXsd = fs.readFileSync('./test/simpleClass.xsd').toString();
            simpleInheritedClassXsd = fs.readFileSync('./test/simpleInheritedClass.xsd').toString();
            importedClassXsd = fs.readFileSync('./test/importedClass.xsd').toString();
            formXsd = fs.readFileSync("./test/form.xsd").toString();
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

        it("ClassGenerator geeft een simpele classFile terug", () => {
            expect(generator.generateClassFileDefinition(simpleClassXsd,"",true).classes.length).toBe(1);
        });

        fit("ClassGenerator geeft een inherited classFile terug", () => {
            const result = generator.generateClassFileDefinition(simpleInheritedClassXsd);
            //console.log('\n-------------\n', result.write(), '\n-------------\n');
            console.log("\n-------------\n");
            result.classes.forEach((c) => {console.log(c.name);});
            console.log("\n-------------\n");
            expect(result.classes.length).toBe(7);
            let test = result.getClass("Test");
            console.log(test.write());
            expect(test).toBeDefined();

            expect(test.getProperty("intField")).toBeDefined();
            expect(test.getProperty("dateField")).toBeDefined();
            expect(test.getMethod("constructor")).toBeDefined();
            expect(test.getProperty("dateField").type.isArrayType()).toBe(false);
            expect(test.getProperty("arrayField?").type.isArrayType()).toBe(true);
            expect(test.getProperty("nestedFields").type.isArrayType()).toBe(false);
            expect(test.getProperty("nestedFields").type.text).toBe("NestedFields");
            expect(test.getProperty("strArrayField").type.text).toBe("string[]");

            test = result.getClass("MeldingIdentificatie");
            console.log(test.write());
            expect(test).toBeDefined();
            //expect(test.getProperty("externeBrons").type.text).toBe("string[]");
        });

        it("ClassGenerator geeft een  classFile terug met imports", () => {
            let importingClass =generator.generateClassFileDefinition(importedClassXsd,'',true);
            expect(importingClass.classes.length).toBe(1);
            let fld = importingClass.getClass("Test").getProperty("imported");
            expect(fld).toBeDefined();
        });

        it("ClassGenerator geeft een  classFile terug voor form met refs", () => {
            let classFile = generator.generateClassFileDefinition(formXsd,"",true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(3);
            let fld = classFile.getClass("Forms").getProperty("field");
            expect(fld.type.text).toBe("Field");

        });

        it("ClassGenerator geeft een  classFile terug voor een elements", () => {
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


        it("ClassGenerator geeft een  classFile terug voor een elements", () => {
            const elmXsd = `
              <?xml version='1.0' encoding='UTF-8'?>
                 <xs:schema xmlns:xs='http://www.w3.org/2001/XMLSchema'>
                   <xs:element name="naam">
                     <xs:complexType>
                       <xs:sequence>
                         <xs:element name="intField" type="xs:integer"/>
                         <xs:element name="dateField" type="xs:dateTime"/>
                       </xs:sequence>
                      </xs:complexType>
                      </xs:element>
                 </xs:schema>
                 
             `
            let classFile = generator.generateClassFileDefinition(elmXsd,"",true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(1);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });
    });
});
