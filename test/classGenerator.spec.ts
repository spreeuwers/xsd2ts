/**
 * Created by eddy spreeuwers 14-02-18.
 */
import {FileDefinition} from "ts-code-generator";
import {ClassGenerator} from "../src/classGenerator";
import {regexpPattern2typeAlias, series, variants, range, char, specials} from "../src/regexp2aliasType";
import {log} from "../src/xml-utils";
import * as fs from "fs";

let logClassDef = function (result: FileDefinition) {
    log('\n----- classdef --------\n');
    log(result.write());
    log("\n-----------------------\n");
    result.classes.forEach((c) => {
        log(c.name);
    });
    console.log("\n-------------\n");
};


const zero_99 = '0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63|64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95|96|97|98|99';

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
        let targetnamespace = "";
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
            targetnamespace = fs.readFileSync("./test/xsd/targetnamespace.xsd").toString();
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

        it("returns an empty claas array for an empty string", () => {
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
            const test = result.getClass("InheridedClass");
            log(test.write());
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

        // it("geeft een  classFile terug met imports", () => {
        //     let importingClass =generator.generateClassFileDefinition(importedClassXsd, '' , true);
        //     expect(importingClass.classes.length).toBe(1);
        //     let fld = importingClass.getClass("Test").getProperty("imported");
        //     expect(fld).toBeDefined();
        // });
        //
        // it("geeft een  classFile terug voor form met refs", () => {
        //     const classFile = generator.generateClassFileDefinition(formXsd, "", true);
        //
        //     console.log(classFile.write());
        //     expect(classFile.classes.length).toBe(6);
        //     let fld = classFile.getClass("X").getProperty("field?");
        //     expect(fld.type.text).toBe("Field[]");
        //     expect(fld.name).toBe("field?");
        //
        //     fld = classFile.getClass("Field").getProperty("option?");
        //     expect(fld.type.text).toBe("Option[]");
        //     expect(fld.name).toBe("option?");
        //
        // });

        it("geeft een  classFile terug voor form met refs", () => {
            const classFile = generator.generateClassFileDefinition(formXsd, "", true);

            log(classFile.write());
            const  classNames = ['X', 'Field', 'Option', 'ForValue', 'Item', 'Reported' ];
            expect(classFile.classes.length).toBe(classNames.length);
            let fld = classFile.getClass("X").getProperty("field?");
            expect(fld.type.text).toBe("Field[]");
            expect(fld.name).toBe("field?");

            fld = classFile.getClass("Field").getProperty("option?");
            expect(fld.type.text).toBe("Option[]");
            expect(fld.name).toBe("option?");

        });



        it("geeft een  classFile terug voor een enkel leeg element", () => {

            let classFile = generator.generateClassFileDefinition(singleElmXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(1);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });

        it("returns a classFile for a groupXsd", () => {

            let classFile = generator.generateClassFileDefinition(groupXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(3);
            let c  = classFile.getClass("Ordertype");
            console.log('class:  ' ,  c.write());
            expect(c).toBeDefined();
            expect(c.extendsTypes.length).toBe(1);
            let superClass = c.extendsTypes[0].text;
            expect(superClass).toBe("CustGroup");
            c  = classFile.getClass(superClass);
            let p  = c.getProperty('customer');
            expect(p.type).toBeDefined();

        });

        it("returns a classFile for a single element with nested type", () => {

            let classFile = generator.generateClassFileDefinition(elmXsd, "", true);

            console.log(classFile.write());
            expect(classFile.classes.length).toBe(2);
            let c  = classFile.getClass("Naam");
            expect(c).toBeDefined();

        });


        it("returns a classFile for a simpleTypeXsd", () => {

            let classFile = generator.generateClassFileDefinition(simpleClassXsd, "", true);
            const types = generator.types.map((t) => `${t}`).join("\n");
            log("-------------------------------------\n");
            log(types,"\n\n", classFile.write());
            expect(classFile.classes.length).toBe(3);
            const c  = classFile.getClass("Schema");
            expect(c.name).toBe("Schema");

        });


       it("returns a classFile for a simpleTypeXsd", () => {

            let classFile = generator.generateClassFileDefinition(simpleTypeXsd, "", true);
            log("------------ classes -------------------------\n");
            log(classFile.write());
            expect(classFile.classes.length).toBe(1);
            const c  = classFile.getClass("Schema");
            expect(c.name).toBe("Schema");
            expect(classFile.typeAliases.length).toBe(25);
            expect(classFile.getTypeAlias('ABC7').type.text).toEqual('"A"|"B"|"C"');
            expect(classFile.enums.length).toBe(4);
            expect(classFile.getTypeAlias('Priority18').type.text).toEqual('0|1|2|3');


        });

        it("returns a  classFile with special types from typesXsd", () => {
            let classFile = generator.generateClassFileDefinition(typesXsd, "", true);
            console.log("-------------------------------------\n");
            console.log(classFile.write());
            expect(classFile.classes.length).toBe(7);
            let method = classFile.getClass("Module")?.getMethod("param");
            expect(method?.returnType?.text).toBe("void");
        });

        it("returns a  classFile with special types from typesXsd", () => {
            let classFile = generator.generateClassFileDefinition(choiceXsd, "", true);
            console.log("-------------------------------------\n");
            console.log(classFile.write());
            expect(classFile.classes.length).toBe(3);
            let method = classFile.getClass("Choose1")?.getMethod("item");
            expect(method?.returnType?.text).toBe("void");
            method = classFile.getClass("Choose2")?.getMethod("b");
            expect(method?.returnType?.text).toBe("void");
            let attr = classFile.getClass("Choose2").getProperty("$a0");
            expect(attr.type.text).toEqual('Date');
        });

        it("returns a  classFile with types from namespaceXsd", () => {
            let classFile = generator.generateClassFileDefinition(targetnamespace, "", true);
            console.log("-------------------------------------\n");
            console.log(classFile.write());
            expect(classFile.classes.length).toBe(3);
        });

        it ("returns as type alias for regexps" , () => {
            let alias = '';
            alias = regexpPattern2typeAlias('', 'string');
            expect(alias).toBe('string');
            alias = regexpPattern2typeAlias('A', 'string');
            expect(alias).toBe('"A"');
            alias = regexpPattern2typeAlias('A|B|C', 'string');
            expect(alias).toBe('"A"|"B"|"C"');
            alias = regexpPattern2typeAlias('[ABC]', 'string');
            expect(alias).toBe('"A"|"B"|"C"');
            alias = regexpPattern2typeAlias('A[12]', 'string');
            expect(alias).toBe('"A1"|"A2"');
            alias = regexpPattern2typeAlias('A[12]|B|C[34]', 'string');
            expect(alias).toBe('"A1"|"A2"|"B"|"C3"|"C4"');
            alias = regexpPattern2typeAlias('A[\\d]|B', 'string');
            expect(alias).toBe('"A0"|"A1"|"A2"|"A3"|"A4"|"A5"|"A6"|"A7"|"A8"|"A9"|"B"');
             //alias = regexpPattern2typeAlias('pre|[b-dC-E4-7]|mid|[A]|post', 'string');
             //expect(alias).toBe('"pre"|"b"|"c"|"d"|"C"|"D"|"E"|"4"|"5"|"6"|"7"|"mid"|"A"|"post"');
             //alias = regexpPattern2typeAlias('a[b-c1-3]', 'string');
             //expect(alias).toBe('"ab"|"ac"|"a1"|"a2"|"a3"');
             //alias = regexpPattern2typeAlias("[P\\-][B\\-][A\\-]", 'string');
             //expect(alias).toBe('"PBA"|"-BA"|"P-A"|"--A"|"PB-"|"-B-"|"P--"|"---"');
            // alias = regexpPattern2typeAlias("[\\d]+", 'number', {maxLength: 1});
            // expect(alias).toBe('0|1|2|3|4|5|6|7|8|9');
            // alias = regexpPattern2typeAlias("\\d+", 'number', {maxLength: 2});
            // expect(alias).toBe(zero_99);
            // alias = regexpPattern2typeAlias("[\\d]+", 'number', {maxLength: 2});
            // expect(alias).toEqual(zero_99);
            // alias = regexpPattern2typeAlias("(\\d*)", 'number', {maxLength: 2});
            // expect(alias).toEqual(zero_99);
            // alias = regexpPattern2typeAlias("\\d+", 'number', {maxLength: 1});
            // expect(alias).toBe('0|1|2|3|4|5|6|7|8|9');

        });

        fit ("returns as type alias for regexps" , () => {
            let v = null;
            let i = 0;

            [v, i] = specials(0, '\\d');
            expect(v).toBe('0123456789');
            [v, i] = specials(0, 'a');
            expect(v).toBe('');

            [v, i] = char(0, 'a');
            expect(v).toBe('a');
            [v, i] = range(0, '[');
            expect(v).toBe('');

            [v, i] = range(0, 'a-z');
            expect(v).toBe('abcdefghijklmnopqrstuvwxyz');
            [v, i] = range(0, 'a');
            expect(v).toBe('');

            [v, i] = series(0, '[\\d]');
            expect(v).toBe('0123456789');

            [v, i] = series(0, '[\\w]');
            expect(v).toBe('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

            [v, i] = series(0, '[.]');
            expect(v).toBe('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~§±!@#$%^&*()-_=+[]{}|;:.,');
            //
            [v, i] = series(0, '[A\\d]');
            expect(v).toBe('A0123456789');

            [v, i] = series(0, '[A-Z]');
            expect(v).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            [v, i] = series(0, '[a-Z]');
            expect(v).toBe('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
            [v, i] = series(0, '[5-g]');
            expect(v).toBe('56789abcdefg');
            [v, i] = variants('5g');
            expect(v).toBe('5g');
            v = series(0, '\\\\');
            expect(v).toBe('\\\\');
        });
});
