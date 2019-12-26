/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {findFirstChild, findNextChild, attribs, xml} from './xml-utils';

type NodeHandler = (n: Node) => ASTNode;
const fieldHandler: NodeHandler = (n) => new ASTNode('Field').prop('fieldName', attribs(n).name).prop('type', attribs(n).type);
const classHandler: NodeHandler = (n) => new ASTNode('Class').prop('name', attribs(n).name);

type Merger = (r1: ASTNode, r2: ASTNode) => ASTNode;
const returnMergedResult: Merger  = (r1, r2) => (Object as any).assign(r2, r1);
const schemaMerger: Merger  = (r1, r2) => {(r1 as any).classes = r2.list; return r1; };
const returnChildResult: Merger  = (r1, r2) => r2;

function log(...parms: any) {
    console.log.apply(console, parms);
}

abstract class Parsable {
    public name: string;
    public parent: Parsable;
    public next: Parsable;

    constructor(name: string) {
        this.name = name;
    }

    public abstract parse(node: Node, indent?: string): ASTNode;

    //Add child at and of child chain recursively
    public addNext(p: Parsable) {
        if (this.next) {
            this.next.addNext(p);
        } else {
            this.next = p;
        }
    }

    public children(p: Parsable) {

        const next = new ListOf(this.name, p);
        this.addNext(next);
        return this;
    }


    public child(t: Terminal, m?: Merger) {
        const next = new Child('EAT' , t, m);
        this.addNext(next);
        return this;
    }

    public oneOf(...options: Parsable[]){
        const next = new OneOf('ONE OFF' , options);
        this.addNext(next);
        return this;
    }


}

export class Terminal extends Parsable {

    private nodeHandler = (n) => new ASTNode(this.name);

    constructor(tagName: string, handler?: NodeHandler) {
        super(tagName);
        this.nodeHandler = handler || this.nodeHandler;
    }

    public parse(node: Node, indent?: string): ASTNode{
        let result = null;
        log(indent + 'Terminal: ', this.name, 'node: ', node?.nodeName);
        if (xml(node)?.localName === this.name){
            result =  this.nodeHandler(node);
        }
        return result;
    }


}

export class Child extends Parsable {
    private terminal: Terminal;
    private merger: Merger = returnMergedResult;

    constructor(name: string, t: Terminal, m?: Merger) {
        super(name);
        this.merger = m || this.merger;
        this.terminal = t;

    }

    public parse(node: Node, indent?: string): ASTNode {
        let result  = this.terminal.parse(node, indent + ' ');
        log(indent, this.name, 'node: ', node?.nodeName, 'match:', result);

        if (result && this.next) {

            log(indent, 'match on:' , this.name);
            const nextResult =  this.next.parse(findFirstChild(node), indent + ' ');
            if (nextResult) {
                result = this.merger(result, nextResult);
            }
        }
        return result;
    }


}


class NonTerminal extends Parsable {


    public parsable: Parsable;

    constructor(name: string, p?: Parsable) {
        super(name);
        this.parsable = p;
    }

    public parse(node: Node, indent?: string): ASTNode {
        let result = new ASTNode(this.name);
        log(indent + this.name, node?.nodeName);
        const child = this.next?.parse(node, indent + ' ') ;

        if (child){
            result.child = child;
        } else {
            result = null;
        }
        return result;
    };

}

class Parent extends Parsable {


    public merger: Merger = returnMergedResult;

    constructor(name: string, m?: Merger) {
        super(name);
        this.merger = m || this.merger;
    }

    public parse(node: Node, indent?: string): ASTNode {
        let result = new ASTNode(this.name);
        log(indent + this.name, node?.nodeName);
        const nextResult = this.next?.parse(node, indent + ' ') ;

        if (nextResult){
            result = this.merger(result, nextResult);
        } else {
            result = null;
        }
        return result;
    };

}


export class ListOf extends NonTerminal {

    public parse(node: Node, indent?: string): ASTNode{

        log(indent + 'LISTOF:', this.parsable.name, node.nodeName);
        let sibbling = node;

        const result = new ASTNode("items");
        result.list = [];

        while (sibbling) {
            log(indent + 'list sibbling:', sibbling?.nodeName);

            const listItem = this.parsable.parse(sibbling, indent + '  ');
            if (listItem) {
                result.list.push(listItem);
            }
            sibbling = findNextChild(sibbling);

        }
        return result;
    }
}

export class OneOf extends Parsable {

    public options: Parsable[];

    constructor(name: string, options: Parsable[]) {
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

}


export class Grammar {

    public parse(node: Node): ASTNode {

        //Terminals
        const fieldElement  = new Terminal("element", fieldHandler);
        const classElement  = new Terminal("element", classHandler);
        const schema        = new Terminal("schema");
        const complexType   = new Terminal("complexType");
        const classType     = new Terminal("complexType",classHandler);
        const sequence      = new Terminal("sequence");


        //NonTerminals
        const FIELD   = new Parent("FIELD").child(fieldElement);

        const P_CLASS  = new Parent("CLASS", returnChildResult);
        const E_CLASS  = P_CLASS.child(classElement, returnMergedResult);
        const CLASS1   = E_CLASS.child(complexType).child(sequence).children(FIELD);

        const CLASS2   = P_CLASS.child(classType).child(sequence).children(FIELD);
        const CLASS    = P_CLASS.oneOf(CLASS1, CLASS2);

        const SCHEMA  = new Parent("SCHEMA", schemaMerger)
        const START   = SCHEMA.child(schema).children(CLASS);
        const result  = START.parse(node, '');
        return result;

    }

}




