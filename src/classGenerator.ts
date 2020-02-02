/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import {ClassDefinition, createFile, EnumDefinition, FileDefinition} from "ts-code-generator";
import {DOMParser} from "xmldom-reborn";
import {ASTNode, getFieldType} from "./parsing";
import {log} from "./xml-utils";
import {XsdGrammar} from "./xsd-grammar";

let XMLNS = 'xmlns';
let definedTypes: string[];

const COLON = ":";
const GROUP_PREFIX = 'group_';
const XSD_NS = "http://www.w3.org/2001/XMLSchema";
const CLASS_PREFIX = ".";

const defaultSchemaName = 'Schema';

const groups: { [key: string]: ASTNode } = {};
const ns2modMap = {} as Map<string, string>;

const namespaces = {default: "", xsd: "xs"};

function capfirst(s: string = "") {
    return s[0]?.toUpperCase() + s?.substring(1);
}

function lowfirst(s: string = "") {
    return s[0]?.toLowerCase() + s?.substring(1);
}

function choiceBody(m: any, names: string[]): string {
    const name = m.attr.ref || m.attr.fieldName;
    const result = names.filter((n) => n !== name).map( (n) => `delete((this as any).${n});`).join('\n');
    return result + `\n(this as any).${name} = arg;\n`;
}


function addNewImport(fileDef: FileDefinition, ns: string) {
    if (fileDef.imports.filter(i => i.starImportName === ns).length === 0) {
        fileDef.addImport({moduleSpecifier: ns2modMap[ns], starImportName: ns});
    }
}
function addClassForASTNode(fileDef: FileDefinition, astNode: ASTNode, indent = '') {
    const c = fileDef.addClass({name: astNode.name});

    if (astNode.nodeType === 'Group') {
        c.isAbstract = true;
        // astNode.fields = astNode.list || [];
    }
    if (astNode.attr?.base){
        c.addExtends(capfirst(astNode.attr.base));
    }

    log(indent + 'created: ', astNode.name, ', fields: ', astNode?.children?.length);

    let fields = (astNode.children || []).filter( (f) => f);
    fields.filter((f) => f.nodeType === "Fields").forEach(
        (f) => {
            log(indent + 'adding fields for ref:',  f.name);
            fields = fields.concat(groups[f.attr.ref].children);
        });
    fields.filter( (f) => f.nodeType === "Reference").forEach(
        (f) => {
            log(indent + 'adding method for Reference: ', f.attr.ref);

            const typePostFix = (f.attr.array) ? "[]" : "";
            const namePostFix = (f.attr.array) ? "?" : "";
            const [ns, localName] = (/:/.test(f.attr.ref)) ? f.attr.ref?.split(':') : [null,f.attr.ref];
            const refName = localName + namePostFix;
            const refType = ((ns) ? ns + '.' : '')  + capfirst(localName + typePostFix);
            c.addProperty({name: refName, type: refType, scope: "protected"});

        });
    fields.filter( (f) => f.nodeType === "choice").forEach(
        (f) => {
            const names = f.children?.map((i) => i.attr.fieldName || i.attr.ref);
            log(indent + 'adding methods for choice', names.join(',') );
            f.children?.forEach( (m) => {
                const method = c.addMethod( {name:  m.attr.fieldName || m.attr.ref, returnType: 'void', scope: 'protected'} );
                method.addParameter({name: 'arg', type: m.attr.fieldType || capfirst(m.attr.ref)});
                method.onWriteFunctionBody = (w) => { w.write(choiceBody(m, names)); };
                // log('create class for:' ,m.ref, groups);
            });
            log(indent + 'added methods', c.methods.map((m) => m.name).join(','));
         });
    fields.filter( (f) => f.nodeType === "Field").forEach(
        (f) => {
            log(indent + 'adding field:', {name: f.attr.fieldName, type: f.attr.fieldType});

            let xmlns = "";
            let fldType = f.attr.fieldType;
            const typeParts = f.attr.fieldType.split('.');
            if (typeParts.length === 2) {
                xmlns = typeParts[0];
                //fldType = typeParts[1];
                addNewImport(fileDef, xmlns);
            }

            // whenever the default namespace (xmlns) is defined and not the xsd namspace
            // the types without namsespace must be imported and thus prefixed with a ts namespace
            //
            const undefinedType = definedTypes.indexOf(fldType) < 0;
            log('defined: ', fldType , undefinedType);

            if (undefinedType && namespaces.default && namespaces.default !== XSD_NS) {
                fldType = getFieldType(f.attr.type, XMLNS);
            }
            c.addProperty({name: f.attr.fieldName, type: fldType, scope: "protected"});

            log(indent + 'nested class', f.attr.fieldName, JSON.stringify(f.attr.nestedClass));
            if (f.attr.nestedClass) {
                addClassForASTNode(fileDef, f.attr.nestedClass, indent + ' ');
            }
        },
    );
}


export class ClassGenerator {
    public types: string[] = [];
    public schemaName = "schema";
    public xmlnsName= "xmlns";
    private fileDef = createFile({classes: []});
    private verbose = false;
    private pluralPostFix = 's';
    private dependencies: Map<string, string>;
    private importMap: string[] = [];

    constructor(depMap?: Map<string, string>, private classPrefix = CLASS_PREFIX) {
        this.dependencies = depMap || {} as Map<string, string>;
        (Object as any).assign(ns2modMap, depMap);
        log(JSON.stringify(this.dependencies));
    }





    public generateClassFileDefinition(xsd: string, pluralPostFix= 's', verbose?: boolean): FileDefinition {
        const fileDef = createFile();

        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;


        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        this.log('-------------------------------------------------------------------------------------');

        if (!xsd){
            return fileDef;
        }

        const ast = this.parseXsd(xsd);

        if (!ast){
            return fileDef;
        }

        XMLNS = this.xmlnsName;


        const xsdNsAttr = Object.keys(ast.attr || []).filter(n => ast.attr[n] === XSD_NS).shift();
        const xsdNs = xsdNsAttr.replace(/^\w+:/, '');
        const defNs = ast.attr.xmlns;

        log('xsd namespace:', xsdNs );
        log('def namespace:', defNs );
        //store namspaces
        namespaces.xsd = xsdNs;
        namespaces.default = defNs;

        if (defNs && (defNs !== XSD_NS)) addNewImport(fileDef, XMLNS);

        Object.keys(groups).forEach( (key) => delete(groups[key]));
        log('AST:\n', JSON.stringify(ast, null, 3));

        // create schema class

        const schemaClass = createFile().addClass({name: capfirst(ast?.name || defaultSchemaName) });

        const children = ast?.children || [];
        definedTypes = children.map(c => c.name);
        log('definedTypes: ', JSON.stringify(definedTypes));

        children
            .filter((t) => t.nodeType === 'AliasType')
            .forEach( (t) => {
                log('alias type: ', t.attr.type);
                fileDef.addTypeAlias({name: capfirst(t.name), type: getFieldType(t.attr.type, defNs)});
                schemaClass.addProperty({name: lowfirst(t.name), type: capfirst(t.name)});
            });

        fileDef.classes.push(schemaClass);

        children
            .filter((t) => t.nodeType === 'Group')
            .forEach((t) => {
                groups[t.name] = t;
                log('storing group:', t.name);
                addClassForASTNode(fileDef, t);
            });

        children
            .filter((t) => t.nodeType === 'Class')
            .forEach((t) => {
                addClassForASTNode(fileDef, t);
                schemaClass.addProperty({name: lowfirst(t.name), type: t.name});
            });


        children
            .filter((t) => t.nodeType === 'Enumeration')
            .forEach((t) => {
                const enumDef = fileDef.addEnum({name: t.name});
                t.attr.values.forEach (
                    (m) => { enumDef.addMember( {name: m.attr.value , value: `"${m.attr.value}"` as any } ); },
                );
                schemaClass.addProperty({name: lowfirst(t.name), type: t.name});
            });

        const tmp = this.makeSortedFileDefinition(fileDef.classes);
        fileDef.classes = tmp.classes;
        return fileDef;
    }

    private nsResolver(ns: string): void {
        log('nsResolver', ns);
        this.importMap[ns] = this.dependencies[ns] || "ns";
        log('nsResolver', ns, this.importMap);
    }

    private findAttrValue(node: HTMLElement, attrName: string): string {
        return node?.attributes?.getNamedItem(attrName)?.value;
    }

    private nodeName(node: HTMLElement): string {
        return this.findAttrValue(node , 'name');
    }

    private findChildren(node: HTMLElement): HTMLElement[] {
        const result: HTMLElement[] = [];
        let child = node?.firstChild;
        while (child) {
            if (!/function Text/.test("" + child.constructor)) {
                result.push(child as HTMLElement);
            }
            child = child.nextSibling;
        }
        return result;
    }

    private findFirstChild(node: HTMLElement): HTMLElement {
        return this.findChildren(node)[0];
    }


    private parseXsd(xsd: string) {
        const xsdGrammar = new XsdGrammar(this.schemaName);
        const xmlDom = new DOMParser().parseFromString(xsd, 'application/xml');
        const xmlNode = xmlDom?.documentElement;
        return xsdGrammar.parse(xmlNode);

    }

    private log(message?: any, ...optionalParams: any[]): void {
        if (this.verbose) {
            console.log.apply(console, [message].concat(optionalParams));
        }
    }


    private makeSortedFileDefinition(sortedClasses: ClassDefinition[]): FileDefinition {
        //  console.log('makeSortedFileDefinition ');
        const outFile = createFile({classes: []});

        //outFile.addImport({moduleSpecifier: "mod", starImportName: "nspce"});
        for ( const ns in this.importMap) {
            log('ns ', ns, this.importMap[ns]);
            outFile.addImport({moduleSpecifier: this.importMap[ns], starImportName: ns});
        }

        let depth = 0;
        let max_depth = 1;
        // console.log('max_depth ',max_depth);
        while (depth <= max_depth) {
            // console.log('depth ');
            sortedClasses.forEach(
                (c) => {

                    const hDepth = this.findHierachyDepth(c, this.fileDef);

                    if (hDepth > max_depth) {
                        max_depth = hDepth;
                    }
                    this.log( c.name + '\t' + hDepth);
                    if (hDepth === depth) {

                        if (c.name.indexOf(GROUP_PREFIX) === 0) {
                            // return;
                        }



                        outFile.addClass({name: c.name});


                        const classDef = outFile.getClass( c.name);
                        classDef.methods = c.methods;
                        classDef.isExported = true;
                        classDef.isAbstract = c.isAbstract;
                        c.extendsTypes.forEach((t) => classDef.addExtends(t.text));
                        c.getPropertiesAndConstructorParameters().forEach(
                            (prop) => {

                                this.addProtectedPropToClass(classDef, prop);

                            },
                        );
                        const constructor = classDef.addMethod({name: 'constructor'});
                        constructor.scope = "protected";
                        constructor.addParameter({name: "props?", type: c.name});
                        constructor.onWriteFunctionBody = (writer) => {
                            if (c.extendsTypes.length) {
                                writer.write(`super();\n`);
                            }
                            writer.write(`this["@class"] = "${this.classPrefix}${c.name}";\n`);
                            writer.write('(<any>Object).assign(this, <any> props);');
                        };

                    }
                },
            );
            // console.log('depth:', depth);
            depth++;
        }
        console.log('ready');
        return outFile;
    }

    private addProtectedPropToClass(classDef: ClassDefinition, prop) {
        const type = prop.type.text;

        if (/^group_/.test(type)) {
            const c = this.fileDef.getClass(type);
            if (c) {
                c.getPropertiesAndConstructorParameters().forEach(
                    (p) => {
                        this.addProtectedPropToClass(classDef, p);
                    },
                );
                return;
            }
        }


        classDef.addProperty(
            {
                defaultExpression: (prop.defaultExpression) ? prop.defaultExpression.text : null,
                name: prop.name,
                scope: "protected",
                type: prop.type.text,
            },
        );
    }


    private findHierachyDepth(c: ClassDefinition, f: FileDefinition) {
        let result = 0;
        let superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        while (superClassName) {
            result++;
            c = f.getClass(superClassName);
            superClassName =  c?.extendsTypes[0]?.text;
        }
        return result;
    }



}

