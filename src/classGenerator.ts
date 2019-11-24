/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import {ClassDefinition, createFile, EnumDefinition, FileDefinition, ImportStructure} from "ts-code-generator";
import {DOMParser} from "xmldom-reborn";

enum xsdTypes {
    XS_STRING = 'xs:string',
    XS_ENUM = "xs:enumeration",
}

const COLUMN = ":";

const XS_SCHEMA = "xs:schema";
const XS_RESTRICTION = "xs:restriction";
const XS_SEQUENCE = "xs:sequence";
const XS_ELEMENT = "xs:element";
const XS_EXTENSION = "xs:extension";
const XS_COMPLEX_TYPE = "xs:complexType";
const XS_SIMPLE_TYPE = "xs:simpleType";
const XS_GROUP = "xs:group";
const XS_ANNOTATION = "xs:annotation";
const XS_DOCUMENTATION = "xs:documentation";
const XS_ATTRIBUTE= "xs:attribute";
const XS_ATTRGROUP ="xs:attributeGroup";
const XS_ENUM ="xs:enum";
const UNKNOWN = "Unknown";

const GROUP_PREFIX = 'group_';

const CLASS_PREFIX = ".";

class State {
    public path: string;
    public fieldName: string;
    public className: string;
    public fieldType: string;
    public parentName: string;
    public parentClass: string;
    constructor(s?:State) {
        Object.keys(s||{}).forEach(key => this[key] = s[key])

    }
}


export type namespaceResolver = (ns:string) => void;


function logLine(title: string = "") {
    let line ="-------------------------------------------------------------------------------------";
    console.log(line);
};

//console.log(indent, node?.tagName, nodeName);
function capfirst(s:string=''){
    return s[0]?.toUpperCase() + s?.substring(1);
}

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

    private findAttrValue(node: HTMLElement, attrName: string):string{
        //this.log(attrName + ':' + node?.attributes?.getNamedItem(attrName));
        return node?.attributes?.getNamedItem(attrName)?.value;
    }

    private nodeName(node: HTMLElement):string{
        return this.findAttrValue(node , 'name');
    }
    private childName(node: HTMLElement):string{
        return this.findAttrValue(node?.children[0] as HTMLElement, 'name');
    }


    private findChildren(node: HTMLElement): HTMLElement[] {
        let result: HTMLElement[] = [];
        let child = node?.firstChild;
        while (child){
            if (!/function Text/.test("" + child.constructor)){
                result.push(child as HTMLElement);
            }
            child = child.nextSibling;
        }
        return result;
    }

    private findFirstChild(node: HTMLElement): HTMLElement {
        return this.findChildren(node)[0];
    }

    private arrayfy(nodes: HTMLCollection): HTMLElement[] {
        return Array.prototype.slice.call(nodes||[], 0);
    }

    constructor(dependencies?: Map<string,string>, private class_prefix = CLASS_PREFIX){
        this.dependencies = dependencies || <Map<string,string>>{};
        console.log(JSON.stringify(this.dependencies));
    }


    public generateClassFileDefinition(xsd: string, pluralPostFix='s',  verbose?: boolean): FileDefinition {
        this.fileDef = createFile({classes: []});
        const xmlDom = new DOMParser().parseFromString(xsd,'application/xml');

        //const xmlDoc = {root:xmlRoot};//parse(xsd);
        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;


        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        //this.log(xmlDom);
        //this.log(JSON.stringify(xmlDoc, null, ' '));
        this.log('-------------------------------------------------------------------------------------');
        if (xmlDom?.documentElement) {
            //console.log('start'+ xmlDom?.documentElement.firstChild.nextSibling);
            //console.log('------------------------------------------------------');

            this.traverse(xmlDom.documentElement);

        }

        let sortedClasses = this.fileDef.classes.sort(
            (a, b) => a.name.localeCompare(b.name)
        );
        // remove Schema class when not needed, when there are no toplevel elements
        sortedClasses = sortedClasses.filter(c => (c.name == "Schema") ?  c.properties.length > 0 : true);

        console.log("-------------------------------generated classes-------------------------------------");
        console.log("Nr of classes generated: ", sortedClasses.length);
        sortedClasses.forEach(c => this.log(c.name));

        logLine();
        let outfile =  this.makeSortedFileDefinition(sortedClasses);
        outfile.enums =this.fileDef.enums;
        return outfile;

    }

    private log(message?: any, ...optionalParams: any[]):void {
        if (this.verbose) {
            console.log(message,optionalParams);
        }
    }

    /**
     * Recursive function to retrieve all types from the XSD
     * @param node
     * @param parentClassDef
     * @param parent
     */
    private traverse(node: HTMLElement, state?: State, parent?: HTMLElement, indent?:string): string {
        // console.log(node.name);
        // let classDef = parentClassDef;
        if (!node?.tagName) {
            this.log(indent + `<!--   comment    -->`);
            return "";
        }
        indent=indent || "";
        state = new State(state);
        let superClassName:string;
        // let arrayPostfix='';
        // let newField:{name:string, type:string, parent: string};
        // let newClass:{name:string, super:string, abstract: boolean};
        let fileDef = this.fileDef;
        const nodeName = this.findAttrValue(node,"name");
        // const parentName = this.findAttrValue(parent,'name');
        const nodeType = this.findAttrValue(node,'type');
        const minOccurs = this.findAttrValue(node,'minOccurs');
        const maxOccurs = this.findAttrValue(node,'maxOccurs');
        const abstract = this.findAttrValue(node,'abstract');
        const final = this.findAttrValue(node,'final');
        const nillable = this.findAttrValue(node,'nillable');

        const firstChild = (node?.children)?node.children[0]:null;
        // const childName = this.nodeName(<HTMLElement>firstChild);
        this.log(indent + `<${node?.tagName} name="${nodeName}" type="${nodeType}">`);
        let createField= false;



        state.path = (state.path || '') + node?.tagName.replace('xs:','/');
        this.log(indent, ' path', state.path);
        switch (node.tagName) {

            case XS_SCHEMA:
                state.className = "Schema";
                this.createClass(state.className, indent);
                break

            case XS_EXTENSION:
                // console.log(indent+"XS_EXTENSION");
                // this.log('node  base: ' + superClassName);
                // superClassName = nodeBase;
                // classDef.addExtends(nodeBase);
                superClassName = this.findAttrValue(node,'base');
                fileDef.getClass(state.className)?.addExtends(superClassName);

                break;
            case XS_ANNOTATION:
                break;
            case XS_SEQUENCE:
                break;
            case XS_RESTRICTION:
                if (state.fieldName){
                    state.fieldType = this.findAttrValue(node,'base');
                }
                break;
            case XS_DOCUMENTATION:
                break;
            case XS_ENUM:
                break
            case XS_SIMPLE_TYPE:
                this.log(indent + "XS_SIMPLE_TYPE");
                //make a typedef for string enums

                let typeName = (nodeName) ? nodeName : capfirst(state.fieldName);

                const simpleType = `export type ${typeName} `;
                let child = this.findFirstChild(node);//children[0];
                let options = [];
                let enums  = [];
                let childName = this.nodeName(<HTMLElement>child);
                let childBase = this.findAttrValue(<HTMLElement>child, 'base');
                if (child && child.attributes) {
                    this.log('  export type: ' + simpleType);


                    if (child.tagName === XS_RESTRICTION) {
                        this.log('  restriction: ' + simpleType);


                        //Array.prototype.slice.call(child.children,0).filter(
                        this.findChildren(child).filter(
                            (c) => (c.tagName === xsdTypes.XS_ENUM)
                        ).forEach(
                            (c) => {
                                const value = this.findAttrValue(<HTMLElement>c, 'value');

                                if (value){
                                    enums.push(value);
                                } else {
                                    options.push(`"${value}"`);
                                }
                            }
                        );
                    }
                }

                if (enums.length > 0) {
                    this.createEnum(nodeName || capfirst(state.fieldName), enums, indent);
                } else {
                    if (options.length === 0) {
                        options.push(this.getFieldType(childBase));
                    }
                    //convert to typedef statement
                    this.types.push(simpleType + '= ' + options.join(' | ') + ';');
                    this.log('  export types: ' + this.types);
                }
                break;


            case XS_COMPLEX_TYPE:
                //this.log(indent + 'XS_COMPLEX_TYPE');


                if (nodeName) {
                    state.className = capfirst(nodeName);

                } else {
                    //when there is no name attribute take the parent fieldName

                    state.parentClass = state.className;
                    state.parentName = state.fieldName;
                    state.className = capfirst(state.fieldName);

                }
                this.createClass( state.className, indent).isAbstract = /true/i.test(abstract);
                break;
            case XS_ATTRGROUP:
            //treat as group
            case XS_GROUP:
                //console.log(indent, nodeName);
                if (nodeName) {
                    state.className = GROUP_PREFIX + nodeName;
                    this.createClass(state.className, indent).isAbstract= true;
                    break;
                }
                //treat as element
            case XS_ATTRIBUTE:
                //treat as element
            case XS_ELEMENT:
                //console.log(indent+"XS_ELEMENT");
                state.fieldName = nodeName;
                state.fieldType = nodeType || capfirst(state.fieldName || "");
                let requiredPostfix = ((minOccurs==="0") ? "?" : "");
                let arrayPostfix = (maxOccurs==="unbounded") ? "[]" : "";

                let nrOfElements =  this.findChildren(parent).filter(c => c.tagName === XS_ELEMENT).length;
                this.log(indent, 'elm siblings:' ,parent.tagName, nrOfElements);
                let isArrayClass = nrOfElements===1 && arrayPostfix;
                //nested field with nested class
                if (isArrayClass){
                    this.log(indent, 'isArrayClass:' , isArrayClass);
                    let fieldName = state.parentName  + ((minOccurs==="0") ? "?" : "");
                    this. adjustField(state.parentClass, fieldName, nodeType, arrayPostfix, indent);
                    this.fileDef.classes = this.fileDef.classes.filter(c=>c.name!==state.className)

                } else {
                    let ref = this.findAttrValue(node,'ref');
                    if(ref){
                        state.fieldType = (XS_GROUP === node.tagName) ? GROUP_PREFIX + ref : capfirst(ref);
                        state.fieldName = nodeName || ref;
                    }
                    this.log(indent, 'createField:' , state);
                    this.createField(state, arrayPostfix, requiredPostfix, indent);
                }

        }
        ////////////////////////////////////////////////////////////////

        let elms =this.findChildren(node);
        elms.map(child => this.traverse(child, state, node, indent + " "));
   }

    private createField(state: State, arrayPostfix: string, requiredPoastfix:string, indent: string) {
        let fldName = state.fieldName + requiredPoastfix;
        let fldType:string;
        if (/^group_/.test(state.fieldType)){
            fldType =  state.fieldType;
        } else {
            fldType = this.getFieldType(state.fieldType) + arrayPostfix;
        }
        this.log('creating field:', fldName, 'on class: ', state.className, ' with type: ', fldType);
        let classDef = this.fileDef?.getClass(state?.className||UNKNOWN);
        let property = classDef?.getProperty(fldName);

        if (!property) {
            property = classDef?.addProperty({name: fldName, type: fldType, scope: "protected"});
        }

        this.log('created field:', fldName, 'on class: ', state.className, ' with type: ', fldType);
        this.log(indent, 'prop: ', property?.name, property?.type?.text);

    }

    private adjustField(className: string, fldName: string, fieldType: string, arrayPostfix: string, indent: string) {

        let fldType = this.getFieldType(fieldType) + arrayPostfix;
        let classDef = this.fileDef.getClass(className);
        classDef?.getProperty(fldName)?.setType(fldType);

    }


    /////////////////////////////////////////////////////////////////////////
    private createEnum(name: string, names: string[], indent: string): EnumDefinition {
        let enumDef = null;//this.fileDef.getEnum(name);
        if (!enumDef) {
            this.log(indent, 'defining Enum: ', name);
            enumDef = this.fileDef.addEnum({name: name});
            enumDef.isExported = true;
            names.forEach(
                (n, i) => enumDef.addMember({name: n, value: `"${n}"`})
            );
         }
        return enumDef;
    }


    private createClass(name: string, indent: string): ClassDefinition {
        let classDef = this.fileDef.getClass(name);
        if (!classDef) {
            this.log(indent, 'defining class: ', name);
            classDef = this.fileDef.addClass({name: name});
            classDef.isExported = true;

        }
        return classDef;
    }

    private makeSortedFileDefinition(sortedClasses: ClassDefinition[]): FileDefinition {
        //console.log('makeSortedFileDefinition ');
        const outFile = createFile({classes: []});
        for ( let ns in this.importMap){
            //console.log('ns ',ns);
            outFile.addImport({moduleSpecifier:this.importMap[ns], starImportName: ns});
        }

        let depth = 0;
        let max_depth = 1;
        //console.log('max_depth ',max_depth);
        while (depth <= max_depth) {
            //console.log('depth ');
            sortedClasses.forEach(
                (c) => {
                    //console.log('forEach ', c);
                    let hDepth = this.findHierachyDepth(c, this.fileDef);
                    //console.log('hDepth ', hDepth);
                    if (hDepth > max_depth) {
                        max_depth = hDepth;
                    }
                    this.log(c.name + '\t' + hDepth);
                    if (hDepth === depth) {

                        if (c.name.indexOf(GROUP_PREFIX) === 0) {
                            //return;
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
            //console.log('depth:', depth);
            depth++;
        }
        console.log('ready');
        return outFile;
    }

    private addProtectedPropToClass(classDef: ClassDefinition, prop) {
        let type = prop.type.text;

        if (/^group_/.test(type)){
            let c =this.fileDef.getClass(type);
            if(c) {
                 c.getPropertiesAndConstructorParameters().forEach(
                    (p) => {
                        this.addProtectedPropToClass(classDef, p);
                   }
                );
                return;
            }
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
            //console.log('superClassName',c,superClassName)
            result++;
            c = f.getClass(superClassName);
            superClassName =  c?.extendsTypes[0]?.text;
        }
        return result;
    }


    private getFieldType(type: string): string {
        let result = capfirst(type);
        switch (type?.toLowerCase()) {
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

            if (result.indexOf(COLUMN) > 0){
                let ns = result.split(COLUMN)[0];
                this.nsResolver(ns);
                console.log("namespace",ns);
            }

            return result.replace(COLUMN, '.');
        } else {
            return 'any';
        }

    }

}

