/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import {ClassDefinition, createFile, EnumDefinition, FileDefinition} from "ts-code-generator";
import {DOMParser} from "xmldom-reborn";
import {ASTNode, getFieldType, NEWLINE} from "./parsing";
import {capFirst, log} from "./xml-utils";
import {XsdGrammar} from "./xsd-grammar";

let XMLNS = 'xmlns';
let definedTypes: string[];

//const COLON = ":";
const A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const GROUP_PREFIX = 'group_';
const XSD_NS = "http://www.w3.org/2001/XMLSchema";
const CLASS_PREFIX = ".";
const square_bracket1 = '\x01';
const square_bracket2 = '\x02';

const defaultSchemaName = 'Schema';

const groups: { [key: string]: ASTNode } = {};
const ns2modMap = {} as Map<string, string>;

const primitive = /(string|number)/i;


const namespaces = {default: "", xsd: "xs"};
let   targetNamespace = 's1';

function a2z(p:string){
    return (p.toLowerCase() == p) ? A2Z.toLowerCase() : A2Z;
}
function capfirst(s: string = "")  {
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
    const c = fileDef.addClass({name: capfirst(astNode.name)});

    if (astNode.nodeType === 'Group') {
        c.isAbstract = true;
        // astNode.fields = astNode.list || [];
    }
    if (astNode.attr?.base) {
        let superClass = '';
        let [ns, qname]  = astNode.attr.base.split(':');
        if (ns === targetNamespace){
            superClass = capfirst(qname);
        } else if (qname) {
            superClass = ns.toLowerCase() + '.' + capfirst(qname);
        }else {
            superClass = capfirst(ns);
        }
        c.addExtends(superClass);
    }

    log(indent + 'created: ', astNode.name, ', fields: ', astNode?.children?.length);

    let fields = (astNode.children || []).filter( (f) => f);
    fields.filter((f) => f.nodeType === "Fields").forEach(
        (f) => {
            log(indent + 'adding named fields:',  f.name);
            let superClass = '';
            if (f.attr.ref.indexOf(':') >= 0) {
                const [ns, qname] = f.attr.ref.split(':');
                log(indent + 'split ns, qname: ', ns, qname);
                if (ns === targetNamespace){
                    superClass = capfirst(qname);
                } else {
                    superClass = ns.toLowerCase() + '.' + capfirst(qname);
                    addNewImport(fileDef, ns);
                }
            } else {
                superClass = capfirst(f.attr.ref);
            }
            c.addExtends(superClass);
        });
    fields.filter( (f) => f.nodeType === "Reference").forEach(
        (f) => {
            log(indent + 'adding fields for Reference: ', f.attr.ref);

            const typePostFix = (f.attr.array) ? "[]" : "";
            const namePostFix = (f.attr.array) ? "?" : "";
            const [ns, localName] = (/:/.test(f.attr.ref)) ? f.attr.ref?.split(':') : [null, f.attr.ref];
            const refName = localName + namePostFix;
            let refType = '';
            if (ns === targetNamespace){
                refType = capfirst(localName + typePostFix);
            } else {
                refType = ((ns) ? ns + '.' : '')  + capfirst(localName + typePostFix);
            }
            c.addProperty({name: refName, type: refType, scope: "protected"});

        });
    fields.filter( (f) => f.nodeType === "choice").forEach(
        (f) => {
            const names = f.children?.map((i) => i.attr.fieldName || i.attr.ref);
            log(indent + 'adding methods for choice', names.join(',') );
            f.children?.forEach( (m) => {
                const methodName = m.attr.fieldName || m.attr.ref;

                const method = c.addMethod( {name:  methodName, returnType: 'void', scope: 'protected'} );
                method.addParameter({name: 'arg', type: m.attr.fieldType || capfirst(m.attr.ref)});
                method.onWriteFunctionBody = (w) => { w.write(choiceBody(m, names)); };
                method.onBeforeWrite = (w) => w.write('//choice\n');
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
                fldType = typeParts[1];
                if (xmlns !== targetNamespace) {
                  addNewImport(fileDef, xmlns);
                }
            }

            // whenever the default namespace (xmlns) is defined and not the xsd namespace
            // the types without namespace must be imported and thus prefixed with a ts namespace
            //
            const undefinedType = definedTypes.indexOf(fldType) < 0;
            log('defined: ', fldType , undefinedType);

            if (undefinedType && namespaces.default && namespaces.default !== XSD_NS && 'xmlns' !== targetNamespace) {
                fldType = getFieldType(f.attr.type, ('xmlns' != targetNamespace)? XMLNS : null);
            }
            c.addProperty({name: f.attr.fieldName, type: fldType, scope: "protected"});

            log(indent + 'nested class', f.attr.fieldName, JSON.stringify(f.attr.nestedClass));
            if (f.attr.nestedClass) {
                addClassForASTNode(fileDef, f.attr.nestedClass, indent + ' ');
            }
        },
    );
}


export function regexpPattern2typeAliasOld(pattern, aliasType: string) {
    pattern.split(NEWLINE).forEach(p => {
        //ignore complex stuff
        if (p.indexOf('*') + p.indexOf('+') + p.indexOf('.')  > -3) {
            return;
        }
        const  o = p;
        const  replaced = [];
        p = p.replace(/(\\.)/g, (x, y) => {replaced.push(y[1]); return `<${replaced.length - 1}>`;} );
        console.log('p before:',p, replaced);
        p = p.replace(/\[([^\]]*)\]/g, (x, y) => {
            //console.log('y:', y);
            replaced.forEach((r,i) => {
                y = y.replace(`<${i}>`, replaced[i])
                    .replace('[', square_bracket1)
                    .replace(']', square_bracket2)
                    .replace('-', '\\-')
                    .replace('d', '\\d');
            });
            console.log('y:', y);
            let z = y.replace(/([A-Z])\-([A-Z])/ig, (a, b, c) => b + a2z(b).split(b).reverse().shift().split(c).shift() + c);
            z = z.replace(/([0-9])\-([0-9])/ig, (a, b, c) => b + DIGITS.split(b).reverse().shift().split(c).shift() + c);
            z = z.replace('\\d', DIGITS).replace(/\\-/g, '-');
            //console.log('z:', z);
            z =  '[' + z.split('').join('|') + ']';
            //console.log('z:', z);
            return z;
        });
        console.log('p:',p);
        const z = p.split(/\[|\]\[|\]/);
        console.log('z:', z);
        const prodZ = [];
        let first = true;
        let length = 0;
        let alts = [];
        z.forEach( (x, i, a) => {
            if (x) {
                //console.log('i:', i);
                if (/^\||\|$/g.test(x)){
                    alts.push(x.replace(/^\||\|$/g, ''));
                    return;
                }
                const options = x.split('|');
                length += (options.length > 1) ? 1 : x.length;
                options.forEach( (y, j, b) => {
                    if (first ){
                       prodZ.push(y);
                    } else {

                        prodZ.forEach( (e, k, c) => {
                            if (j == e.length) {
                                c[k] =  e + y;
                            } else {
                                prodZ.push(e + y);
                            }

                        });
                    }

                });
                first = false;
            }
        });

        console.log('prodZ' + ':', prodZ);
        p = prodZ.filter(f => f.length === length).filter((f, i, a) => a.indexOf(f) === i).sort().join('|');
        p = alts.push(p);
        p = alts.join('|');
        p = p.split('').map(c => c.replace(square_bracket1, '[').replace(square_bracket2, ']')).join('');
        console.log('p:', p);
        //remove pre and post |
        p = p.replace('||', '|').replace(/^|/, '').replace(/|$/, '');
        aliasType = (p.indexOf('|') < 0) ? aliasType : p.split('|').map(p => `"${p}"`).join('|');

    });
    return aliasType;
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
    private targetNamespace = 's1';

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
        targetNamespace = Object.keys(ast.attr || []).filter( n => ast.attr[n] === ast.attr.targetNamespace && (n != "targetNamespace") ).shift();
        targetNamespace = targetNamespace?.replace(/^\w+:/, '');

        log('xsd namespace:', xsdNs );
        log('def namespace:', defNs );
        log('xsd targetnamespace:', targetNamespace );
        const typeAliases = {};


        //store namespaces
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
                let aliasType = getFieldType(t.attr.type, null);
                log('alias type: ', t.attr.type , '->', aliasType);
                if (t.attr.pattern){

                    //try to translate regexp pattern to type aliases as far as possible
                    aliasType = regexpPattern2typeAlias(t.attr.pattern, aliasType);

                }
                const [ns, localName] = aliasType.split('.');

                if (targetNamespace === ns && t.name === localName){
                    console.log('skipping alias:', aliasType);
                } else {
                    if (ns == targetNamespace){
                        aliasType = capfirst(localName);
                    }
                    //skip circular refs
                    if (t.name.toLowerCase() != aliasType.toLowerCase()) {
                        if (primitive.test(aliasType)){
                            aliasType = aliasType.toLowerCase();
                        }
                        //fileDef.addTypeAlias({name: capfirst(t.name), type: aliasType, isExported: true});
                        typeAliases[capfirst(t.name)] = aliasType;
                        schemaClass.addProperty({name: lowfirst(t.name), type: capfirst(t.name)});
                    }
                }

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
                const enumDef = fileDef.addEnum({name: capFirst(t.name)});
                t.attr.values.forEach (
                    (m) => { enumDef.addMember( {name: m.attr.value , value: `"${m.attr.value}"` as any } ); },
                );
                schemaClass.addProperty({name: lowfirst(t.name), type: capFirst(t.name)});
            });

        const tmp = this.makeSortedFileDefinition(fileDef.classes);
        Object.keys(typeAliases).forEach( k =>  {
            fileDef.addTypeAlias({name: k, type: typeAliases[k], isExported: true});
        });

        fileDef.classes = tmp.classes;
        //const members = fileDef.getMembers();
        //members.forEach(m => fileDef.setOrderOfMember(1, m.));

        return fileDef;
    }

    // private nsResolver(ns: string): void {
    //     log('nsResolver', ns);
    //     this.importMap[ns] = this.dependencies[ns] || "ns";
    //     log('nsResolver', ns, this.importMap);
    // }

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
        log('ready');
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

export function regexpPattern2typeAlias(pattern: string, base: string): string {
    let result = '';
    let escaped = false;
    let charModus = false;
    let options = [];
    let optionVariants = null;
    let inRange = false;
    let rangeStart = null;
    let newOptionVariants = [];
    let option  = '';
    const digits = '0123456789';
    const a2z = 'abcdefghijklmnopqrstuvwxyz';
    const A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const all = digits + a2z + A2Z;



    pattern = pattern.split(NEWLINE).filter(p => {
        //ignore complex stuff
        if  (p.indexOf('*') + p.indexOf('+') + p.indexOf('.') > -3){
            return false;
        }
       return !/^\d+$/.test(p)

    }).shift();
    if (!pattern) return base;
    pattern.split('').forEach((c, idx) => {
        if (c === '\\'){
            escaped = true;
            return;
        }

        if (c === '|' && !escaped && !charModus){
            if (option){
                options.push(option);
            }
            if (optionVariants){
                optionVariants.forEach( ov => {
                    options.push(ov);
                });
            }
            optionVariants=null;
            option = '';
            return;
        }

        if (c === '[' && !escaped){
            charModus = true;
            optionVariants = (optionVariants) ? optionVariants : [option];
            newOptionVariants = [];
            option = '';
            return;
        }

        if (c === ']' && !escaped){
            optionVariants = newOptionVariants;
            charModus = false;
            return;
        }
        console.log('c:', c, escaped, charModus);
        if (charModus) {


            optionVariants.forEach( (ov, i, a) => {
                if (c === 'd' && escaped) {

                    digits.split('').forEach(d =>{
                        newOptionVariants.push(ov + d);
                    });

                } else if (c === '-' && !escaped) {
                    inRange = true;

                } else if (inRange && rangeStart) {
                    //newOptionVariants =[];
                    let range = rangeStart + all.split(rangeStart).reverse().shift().split(c).shift() + c;
                    console.log('range:', range);
                    range.split('').forEach(r => {
                        newOptionVariants.push(ov + r);
                    });
                    inRange=false;
                    rangeStart=null;
                } else if (pattern[idx+1] === '-'  && !escaped) {
                    rangeStart = c;
                } else {
                    newOptionVariants.push(ov + c);

                }
            });

        } else {
            option += c;
        }


        console.log('newOptionVariants:', newOptionVariants);
        console.log('optionVariants:', optionVariants);
        console.log('options:', options);
        escaped = false;
    });

    //after all chars processed
    if (option) {
        options.push(option);
    }
    if (optionVariants){
        optionVariants.forEach( ov => {
            options.push(ov);
        });
    }
    result = options.map(o => `"${o}"`).join('|');

    console.log('\n' , pattern, '=>' , result, '\n');
    return result || base;
}



