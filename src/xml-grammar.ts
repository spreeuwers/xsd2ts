/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {findFirstChild, findNextSibbling, attribs, xml} from './xml-utils';

type FindNextNode = (n: Node) => Node;
type NodeHandler = (n: Node) => ASTNode;
const fieldHandler: NodeHandler = (n) => new ASTNode('Field')
    .prop('fieldName', attribs(n).name)
    .prop('fieldType', attribs(n).type + ((attribs(n).maxOccurs === 'unbounded') ? '[]' : '') );

const classHandler: NodeHandler = (n) => (attribs(n).type) ? null : new ASTNode('Class').prop('name', attribs(n).name);

type Merger = (r1: ASTNode, r2: ASTNode) => ASTNode;
const returnMergedResult: Merger  = (r1, r2) => (Object as any).assign(r2, r1);
const typesMerger: Merger  = (r1, r2) => {r1.obj.types = r2.list; return r1; };
const fieldsMerger: Merger  = (r1, r2) => {r1.obj.fields = r2.list; return r1; };
const fieldMerger: Merger = (r1, r2) => {
    r1.obj.fieldName = r1.obj.fieldName || r2.obj.fieldName;
    r1.obj.fieldType = r2.obj.fieldType;return r1;
};

const returnChildResult: Merger  = (r1, r2) => r2;

function log(...parms: any) {
    console.log.apply(console, parms);
}


function oneOf(...options: Parslet[]){
   return new OneOf('ONE OFF' , options);
}


function match(t: Terminal, m?: Merger) {
    return new Match('MATCH' , t, m);
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
        const next = new Match('MATCH' , t, m);
        this.addNext(next, findFirstChild);
        return this;
    }

    public match(t: Terminal, m?: Merger) {
        const next = new Match('MATCH' , t, m);
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

    public tagName: string
    private nodeHandler = (n) => new ASTNode(this.tagName);

    constructor(tagName: string, handler?: NodeHandler) {
        this.tagName = tagName;
        this.nodeHandler = handler || this.nodeHandler;
    }


    public parse(node: Node, indent?: string): ASTNode {
        let result = null;
        log(indent + 'Terminal: ', this.tagName, 'node: ', node?.nodeName);
        if (xml(node)?.localName === this.tagName){
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

export class Match extends Parslet {
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
            result  = this.terminal.parse(node, indent + ' ');
            if (result) break;
            sibbling = findNextSibbling(sibbling);
        }

        log(indent, this.name, this.terminal.tagName, 'node: ', node?.nodeName, 'match:', JSON.stringify(result));

        if (result && this.nextParslet) {
            const nextResult =  this.nextParslet.parse(this.fnNextNode(node), indent + ' ');
            if (nextResult) {
                result = this.merger(result, nextResult);
            }
        }
        //log(indent, this.name, 'result: ', JSON.stringify(result));
        return result;
    }


}

export class Children extends NonTerminal {

    public parse(node: Node, indent?: string): ASTNode{

        log(indent + 'CHILDREN:', this.parsable.name, node.nodeName);
        let sibbling = node;

        const result = new ASTNode("items");
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

        for (let option of this.options || []) {
            log(indent + ' try:', option.name);
            result = option.parse(node, indent + '  ');
            if (result) {
                break;
            }
       }
       return result;
    }
}



export class ASTNode {
    public name: string;
    public child: ASTNode;
    public list: ASTNode[];

    constructor(name: string){
      this.name = name;
    }

    public prop(key, value){
        this[key] = value;
        return this;
    }

    get obj() : any {
        return this as any;
    }

}


export class Grammar {

    public parse(node: Node): ASTNode {

        //Terminals
        const fieldElement  = new Terminal("element", fieldHandler);
        const classElement  = new Terminal("element", classHandler);
        const enumElement   = new Terminal("element", classHandler);
        const schema        = new Terminal("schema");
        const complexType   = new Terminal("complexType");
        const simpleType    = new Terminal("simpleType");
        const restriction   = new Terminal("restriction");
        const enumeration   = new Terminal("enumeration");
        const classType     = new Terminal("complexType", classHandler);
        const sequence      = new Terminal("sequence");


        //NonTerminals
        const FIELD    = match(fieldElement, fieldMerger).child(complexType).child(sequence).child(fieldElement);
        const E_CLASS  = match(classElement).child(complexType).child(sequence, fieldsMerger).children(FIELD);
        const C_CLASS  = match(classType).child(sequence).children(FIELD);
        const ENUMTYPE = match(enumElement).child(simpleType).child(restriction).children(match(enumElement));
        const TYPES    = oneOf(E_CLASS, C_CLASS, ENUMTYPE);

        const SCHEMA   = match(schema, typesMerger).children(TYPES);
        const result   = SCHEMA.parse(node, '');
        return result;

    }

}




