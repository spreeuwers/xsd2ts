/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {findFirstChild, findNextSibbling, attribs, xml, capFirst} from './xml-utils';

type FindNextNode = (n: Node) => Node;
type NodeHandler = (n: Node) => ASTNode;
const fieldHandler: NodeHandler = (n) => (attribs(n).type) ? new ASTNode('Field')
    .prop('fieldName', attribs(n).name)
    .prop('fieldType', attribs(n).type + ((attribs(n).maxOccurs === 'unbounded') ? '[]' : '') ) : null;

const arrayFldHandler: NodeHandler = (n) => (attribs(n).type && attribs(n).maxOccurs == "unbounded") ? new ASTNode('Field')
    .prop('fieldType', attribs(n).type + ((attribs(n).maxOccurs === 'unbounded') ? '[]' : '') ) : null;



const cmpFldHandler: NodeHandler = (n) => new ASTNode('Field')
    .prop('fieldName', attribs(n).name)
    .prop('fieldType', capFirst(attribs(n).name))

const classHandler: NodeHandler = (n) => (attribs(n).type) ? null : new ASTNode('Class').prop('name', attribs(n).name);
const enumElmHandler: NodeHandler = (n) => (attribs(n).type) ? null : new ASTNode('Enum').prop('name', attribs(n).name);
const enumerationHandler: NodeHandler = (n) => (attribs(n).value) ?  new ASTNode('EnumValue').prop('value', attribs(n).value):null;
const extensionHandler: NodeHandler = (n) => new ASTNode('Extesnsion').prop('extends', attribs(n).base);

const intRestrictionHandler: NodeHandler = (n) => /integer/.test(attribs(n).base) ?  new ASTNode('AliasType').prop('value', 'number'): null;
const strRestrictionHandler: NodeHandler = (n) => /string/.test(attribs(n).base) ?  new ASTNode('EnumType').prop('value', 'number'): null;

type Merger = (r1: ASTNode, r2: ASTNode) => ASTNode;

const returnMergedResult: Merger  = (r1, r2) => r1.merge(r2);

const typesMerger: Merger  = (r1, r2) => {r1.obj.types = r2.list; return r1; };
const fieldsMerger: Merger  = (r1, r2) => {r1.obj.fields = r2.list; return r1; };
const enumMerger: Merger = (r1, r2) => {r1.nodeType = 'Enumeration'; r1.obj.values = r2.list; return r1; };
const typeMerger: Merger = (r1, r2) => {r1.nodeType = 'AliasType'; r1.obj.type = r2.obj.value; return r1; };


//const subclassMerger

//const returnChildResult: Merger  = (r1, r2) => r2;
const nestedClassMerger: Merger  = (r1, r2) => {r1.nodeType='Field';r1.obj.subClass= {name: r1.obj.fieldType, list: r2.list}; return r1; };

function log(...parms: any) {
    console.log.apply(console, parms);
}


function oneOf(...options: Parslet[]){
   return new OneOf('ONE OFF' , options);
}


function match(t: Terminal, m?: Merger) {
    return new Matcher('MATCH' , t, m);
}


interface Parsable {
    parse(node: Node, indent?: string): ASTNode;
}


abstract class Parslet implements Parsable {
    public name: string;
    public fnNextNode: FindNextNode;
    public nextParslet: Parslet;

    constructor(name: string) {
        this.name = name;
    }

    public abstract parse(node: Node, indent?: string): ASTNode;

    //Add child at and of child chain recursively
    public addNext(p: Parslet, fnn: FindNextNode) {
        if (this.nextParslet) {
            this.nextParslet.addNext(p, fnn);
        } else {
            this.nextParslet = p;
            this.fnNextNode = fnn;
        }
    }

    public children(p: Parslet) {
        const next = new Children(this.name, p);
        this.addNext(next, findFirstChild);
        return this;
    }


    public child(t: Terminal, m?: Merger) {
        const next = new Matcher('MATCH' , t, m);
        this.addNext(next, findFirstChild);
        return this;
    }


    public match(t: Terminal, m?: Merger) {
        const next = new Matcher('MATCH' , t, m);
        this.addNext(next, n => n);
        return this;
    }

    public oneOf(...options: Parslet[]){
        const next = new OneOf('ONE OFF' , options);
        this.addNext(next, n => n);
        return this;
    }


}

export class Terminal implements Parsable {

    public tagName: string;
    public label: string;
    private nodeHandler = (n) => new ASTNode(this.tagName);

    constructor(tagName: string, handler?: NodeHandler) {
        let tmp = tagName.split(':');
        this.tagName = tmp[0];
        this.label = tmp[1] || '_';

        this.nodeHandler = handler || this.nodeHandler;
    }


    public parse(node: Node, indent?: string): ASTNode {
        let result = null;
        const isElement = xml(node)?.localName === this.tagName;
        log(indent + 'Terminal: ', this.tagName + ':' + this.label, 'node: ', node?.nodeName, 'found: ', isElement);
        if (isElement) {
            result =  this.nodeHandler(node);
        }
        return result;
    }


}


abstract class NonTerminal extends Parslet {

   public parsable: Parslet;

    constructor(name: string, p?: Parslet) {
        super(name);
        this.parsable = p;
    }
}

class Proxy extends Parslet {

    public parsable: Parslet;

    constructor(name: string) {
        super(name);

    }
    set parslet(p: Parslet) {
        this.parsable = p;
    }

    public parse(node: Node, indent?: string): ASTNode {
        return this.parsable.parse(node, indent + ' ');
    }
}

export class Matcher extends Parslet {
    private terminal: Terminal;
    private merger: Merger = returnMergedResult;

    constructor(name: string, t: Terminal, m?: Merger) {
        super(name);
        this.merger = m || this.merger;
        this.terminal = t;

    }

    public parse(node: Node, indent?: string): ASTNode {
        let sibbling = node;
        let result: ASTNode;

        //find the first sibbling matching the terminal
        while (sibbling){
            result  = this.terminal.parse(sibbling, indent + ' ');
            if (result) break;
            sibbling = findNextSibbling(sibbling);
        }

        log(indent, this.name, this.terminal.tagName, 'node: ', node?.nodeName, 'match:', JSON.stringify(result));

        if (result && this.nextParslet) {
            const nextResult =  this.nextParslet.parse(this.fnNextNode(node), indent + ' ');
            if (nextResult) {
                result = this.merger(result, nextResult);
            } else {
                log(indent,'no next result' ,this.name);
                result = null;
            }
        }
        log(indent, this.name, 'result: ', JSON.stringify(result));
        return result;
    }


}

export class Children extends NonTerminal {

    public parse(node: Node, indent?: string): ASTNode{

        log(indent + 'CHILDREN:', this.parsable.name, node.nodeName);
        let sibbling = node;

        const result = new ASTNode("Children");
        result.list = [];

        while (sibbling) {
            log(indent + 'list sibbling:', sibbling?.nodeName);

            const listItem = this.parsable.parse(sibbling, indent + '  ');
            if (listItem) {
                result.list.push(listItem);
            }
            sibbling = findNextSibbling(sibbling);

        }
        return result;
    }
}

export class OneOf extends Parslet {

    public options: Parslet[];

    constructor(name: string, options: Parslet[]) {
        super(name);
        this.options = options;
    }

    public parse(node: Node, indent?: string): ASTNode{

        log(indent + 'ONE OFF:', this.options.map(o => o.name).join(','), node.nodeName);
        let result = null;
        let count = 1
        for (let option of this.options || []) {
            log(indent + ' try:', option.name , '#' , count++);
            result = option.parse(node, indent + '  ');
            if (result) {
                break;
            }
       }
       //log(indent,'result:',JSON.stringify(result));
       return result;
    }
}



export class ASTNode {
    public nodeType: string;
    public name: string;
    public child: ASTNode;
    public list: ASTNode[];

    constructor(type: string){
      this.nodeType = type;
    }

    public prop(key, value){
        this[key] = value;
        return this;
    }

    get obj(): any {
        return this as any;
    }
    public merge (other: ASTNode){
        let result = new ASTNode(this.nodeType);
        result =  (Object as any).assign(result, this);
        result =  (Object as any).assign(result, other);
        result.nodeType = this.nodeType;
        return result;
    }

}


export class Grammar {

    public parse(node: Node): ASTNode {

        //Terminals
        const FIELDPROXY     = new Proxy('Field Proxy');
        const fieldElement   = new Terminal("element:fld", fieldHandler);
        const cmpFldElement  = new Terminal("element:comp", cmpFldHandler);
        const arrFldElement  = new Terminal("element:array", arrayFldHandler);
        const classElement   = new Terminal("element:class", classHandler);
        const enumElement    = new Terminal("element:enum", enumElmHandler);
        const schema         = new Terminal("schema");
        const complexType    = new Terminal("complexType");
        const simpleType     = new Terminal("simpleType");
        const complexContent = new Terminal("complexContent");
        const extension      = new Terminal("extension",extensionHandler);

        const enumeration    = new Terminal("enumeration",enumerationHandler);

        const strRestriction = new Terminal("restriction", strRestrictionHandler);
        const intRestriciton = new Terminal("restriction", intRestrictionHandler);
        const classType      = new Terminal("complexType", classHandler);
        const sequence       = new Terminal("sequence");


        // NonTerminals
        const ARRFIELD = match(cmpFldElement).child(complexType).child(sequence).child(arrFldElement);

        const CMPFIELD = match(cmpFldElement, nestedClassMerger).child(complexType).child(sequence).children(FIELDPROXY);

        const FIELD    = oneOf(CMPFIELD, ARRFIELD,  match(fieldElement) ); FIELDPROXY.parslet = FIELD;

        const E_CLASS  = match(classElement).child(complexType).child(sequence, fieldsMerger).children(FIELD);
        const C_CLASS  = match(classType).child(sequence, fieldsMerger).children(FIELD);
        const X_CLASS  = match(classType).child(complexContent).child(extension).child(sequence, fieldsMerger).children(FIELD);
        const ENUMTYPE = match(enumElement, enumMerger).child(simpleType).child(strRestriction).children(match(enumeration));
        const ALIASTYPE= match(enumElement, typeMerger).child(simpleType).child(intRestriciton);
        const TYPES    = oneOf(ALIASTYPE, ENUMTYPE, E_CLASS, C_CLASS, X_CLASS );

        const SCHEMA   = match(schema, typesMerger).children(TYPES);
        const result   = SCHEMA.parse(node, '');
        return result;

    }

}




