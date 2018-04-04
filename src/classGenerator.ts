/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import {ClassDefinition, createFile, FileDefinition, ImportStructure} from "ts-code-generator";
import parse = require("xml-parser");


const XS_RESTRICTION = "xs:restriction";
const XS_SIMPLE_TYPE = "xs:simpleType";
const XS_SCHEMA = "xs:schema";
const XS_STRING = 'xs:string';
const XS_SEQUENCE = "xs:sequence";
const XS_ELEMENT = "xs:element";
const XS_EXTENSION = "xs:extension";
const XS_COMPLEX_TYPE = "xs:complexType";
const XS_ENUM = "xs:enumeration";
const XS_GROUP = "xs:group";
const CLASS_PREFIX = ".";



export type namespaceResolver = (ns:string) => void;

export class ClassGenerator {
    //private file: FileDefinition;
    //private classes: { [key: string]: FileDefinition } = {};
    private fileDef = createFile({classes: []});
    private verbose = false;
    private pluralPostFix = 's';
    private dependencies: Map<string,string>;
    private importMap:string[] = [];

    public types: string[] = [];

    private nsResolver(ns: string): void {
        //this.importStatements.push(`import * as ${ns} from "${this.dependencies[ns]}";\n`);
        this.importMap[ns] = this.dependencies[ns] || "ns";
        //console.log(ns, this.dependencies[ns]);
    }

    constructor(dependencies?: Map<string,string>, private class_prefix = CLASS_PREFIX){
        this.dependencies = dependencies || <Map<string,string>>{};
        console.log(JSON.stringify(this.dependencies));
    }


    public generateClassFileDefinition(xsd: string, pluralPostFix='s',  verbose?: boolean): FileDefinition {
        this.fileDef = createFile({classes: []});
        const xmlDoc = parse(xsd);
        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;


        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        //this.log(JSON.stringify(xmlDoc, null, ' '));
        this.log('-------------------------------------------------------------------------------------');
        if (xmlDoc.root) {
            this.traverse(xmlDoc.root);
        }

        let sortedClasses = this.fileDef.classes.sort(
            (a, b) => a.name.localeCompare(b.name)
        );

        console.log('-------------------------------generated classes-------------------------------------');
        console.log('Nr of classes generated: ', sortedClasses.length);
        sortedClasses.forEach(c => this.log(c.name));

        console.log('--------------------------------------------------------------------------------------');
        return this.makeSortedFileDefinition(sortedClasses);

    }

    private log(msg: string) {
        if (this.verbose) {
            console.log(msg);
        }
    }

    /**
     * Recusrsive function to retrieve all types from the XSD
     * @param node
     * @param parentClassDef
     * @param parent
     */
    private traverse(node: parse.Node, parentClassDef?: ClassDefinition, parent?: parse.Node): void {
        //console.log(node.name);
        let classDef = parentClassDef;
        let stopDescent = false;

        let fileDef = this.fileDef;

        switch (node.name) {
            case XS_GROUP:
            if (node.attributes && node.attributes.ref) {
                classDef.addProperty({
                    name: 'group_'+ node.attributes.ref,
                    type: 'group_'+ node.attributes.ref,
                    scope: "protected"
                });
                break;
            }


            case XS_COMPLEX_TYPE:
                if (node.attributes && node.attributes.name) {
                    let className = node.attributes.name;
                    const isAbstract = !!node.attributes.abstract;
                    if (node.name === XS_GROUP) {
                        className = 'group_' + className;
                    }
                    fileDef.addClass({name: className});
                    classDef = fileDef.getClass(className);
                    classDef.isAbstract = isAbstract;
                    classDef.isExported = true;


                    this.log('class: ' + className);
                }
                break;
            case XS_SIMPLE_TYPE:
                //make a typedef for string enums
                if (parent && parent.name === XS_SCHEMA) {
                    const simpleType = `export type ${node.attributes.name} `;
                    let child = node.children[0];
                    let options = [];
                    if (child && child.attributes) {
                        this.log('  export typ: ' + simpleType);


                        if (child.name === XS_RESTRICTION) {
                            this.log('  restriction: ' + simpleType);


                            child.children.filter(
                                (c) => c.name === XS_ENUM
                            ).forEach(
                                (c) => {
                                    options.push(`"${c.attributes.value}"`);
                                }
                            );
                        }
                    }
                    if (options.length === 0) {
                        options.push(this.getFieldType(child.attributes.base));
                    }
                    //convert to typedef statement
                    this.types.push(simpleType + '= ' + options.join(' | ') + ';');
                }
                break;
            case XS_EXTENSION:
                const base = node.attributes.base;
                this.log('  base: ' + base);
                classDef.addExtends(base);
                break;

            case XS_ELEMENT:
                let fldName = node.attributes.name;
                let fldType = node.attributes.type;
                let child = node.children[0];
                let skipField = false;
                let arrayPostfix = '';
                if (node.attributes.minOccurs === "0") {
                    fldName+= "?";
                }

                if (child && child.name === XS_SIMPLE_TYPE) {
                    fldType = XS_STRING;
                }
                //check if there is a complextype defined within the element
                //and retrieve the element type in this element
                if (child && child.name === XS_COMPLEX_TYPE) {
                    child = child.children[0];
                    if (child && child.name === XS_SEQUENCE) {
                        child = child.children[0];
                        if (child && child.name === XS_ELEMENT && child.attributes) {


                            this.log('nested typedef: ' + fldType);
                            if (child.attributes.maxOccurs === "unbounded") {
                                arrayPostfix = "[]";
                                fldType = child.attributes.type;
                            } else {
                                fldType = fldName[0].toUpperCase() + fldName.substring(1);
                                fileDef.addClass({name: fldType}).addProperty(
                                    {
                                        name: child.attributes.name,
                                        type: this.getFieldType(child.attributes.type),
                                        scope: "protected"
                                    }
                                );
                            }
                            this.log('nested typedef: ' + fldType);
                            stopDescent = true;
                        }
                    }

                }
                this.log('  field: ' + fldName);
                if (fldName && classDef) {
                    //is the field is of type string array then we add a prefix (s)
                    let fieldNamePostFix = (arrayPostfix === '[]' && fldType === XS_STRING) ? this.pluralPostFix : '';
                    if (arrayPostfix === '[]' && fldType === XS_STRING) {
                        //console.log('  field: ', fldName, '['+ fldType + ']', arrayPostfix, this.pluralPostFix);
                        console.log('  field: ', fldName,'  fieldNamePostFix: ', fieldNamePostFix);
                    }
                    classDef.addProperty({
                        name: fldName,
                        type: this.getFieldType(fldType) + arrayPostfix,
                        scope: "protected"
                    });

                }

                break;
        }
        if (!stopDescent) {
            node.children.forEach(
                (child) => this.traverse(child, classDef, node)
            );
        }

    }

    private makeSortedFileDefinition(sortedClasses: ClassDefinition[]): FileDefinition {
        const outFile = createFile({classes: []});
        for ( let ns in this.importMap){
            outFile.addImport({moduleSpecifier:this.importMap[ns], starImportName: ns});
        }

        let depth = 0;
        let max_depth = 1;
        while (depth <= max_depth) {
            sortedClasses.forEach(
                (c) => {
                    let hDepth = this.findHierachyDepth(c, this.fileDef);
                    if (hDepth > max_depth) {
                        max_depth = hDepth;
                    }
                    this.log(c.name + '\t' + hDepth);
                    if (hDepth === depth) {
                        if (c.name.indexOf('group_') === 0) {
                            return;
                        }



                        outFile.addClass({name: c.name});


                        let classDef = outFile.getClass( c.name);
                        classDef.isExported = true;
                        classDef.isAbstract = c.isAbstract;
                        c.extendsTypes.forEach((t) => classDef.addExtends(t.text));
                        c.getPropertiesAndConstructorParameters().forEach(
                            (prop) => {

                                this.addProtectedPropToClass(classDef, prop);

                            }
                        );
                        let constructor = classDef.addMethod({name: 'constructor'});
                        constructor.scope = "protected";
                        constructor.addParameter({name:"props?", type:c.name});
                        constructor.onWriteFunctionBody = (writer) => {
                            if (c.extendsTypes.length) {
                                writer.write(`super();\n`);
                            }
                            writer.write(`this["@class"] = "${this.class_prefix}${c.name}";\n`);
                            writer.write('(<any>Object).assign(this, <any> props);');
                        };
                    }
                }
            );
            depth++;
        }
        return outFile;
    }

    private addProtectedPropToClass(classDef: ClassDefinition, prop) {
        let type = prop.type.text;

        if (/^group_/.test(type)){
            let c =this.fileDef.getClass(type);
            c.getPropertiesAndConstructorParameters().forEach(
                (p) => {
                    this.addProtectedPropToClass(classDef, p);

                }
            );
            return;
        }

        classDef.addProperty(
            {
                name: prop.name,
                type: prop.type.text,
                defaultExpression: (prop.defaultExpression) ? prop.defaultExpression.text : null,
                scope: "protected"
            }
        );
    }


    private findHierachyDepth(c: ClassDefinition, f: FileDefinition) {
        let result = 0;
        let superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        while (superClassName) {
            result++;
            c = f.getClass(superClassName);
            superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        }
        return result;
    }


    private getFieldType(type: string): string {
        let result = type;
        switch (type) {
            case "xs:string":
                result = "string";
                break;
            case "xs:float":
                result = "number";
                break;
            case "xs:double":
                result = "number";
                break;
            case "xs:integer":
                result = "number";
                break;
            case "xs:int":
                result = "number";
                break;
            case "xs:boolean":
                result = "boolean";
                break;
            case "xs:dateTime":
                result = "Date";
                break;
            case "xs:date":
                result = "Date";
                break;
            case "xs:long":
                result = "number";
                break;
            case "xs:decimal":
                result = "number";
                break;
            case "xs:base64Binary":
                result = "string";
                break;
        }

        if (result){
            if (result.indexOf(':') > 0){
                let ns = result.split(':')[0];
                this.nsResolver(ns);
                console.log("namespace",ns);
            }

            return result.replace(':','.');
        } else {
            return 'any';
        }

    }

}

