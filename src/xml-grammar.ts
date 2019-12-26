/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {findFirstChild, findNextChild, attribs, xml} from './xml-utils';

type NodeHandler = (n: Node) => ASTNode;
const fieldHandler: NodeHandler = (n) => new ASTNode('Field')
    .prop('fieldName', attribs(n).name)
    .prop('fieldType', attribs(n).type + ((attribs(n).maxOccurs === 'unbounded') ? '[]' : '') );

const classHandler: NodeHandler = (n) => (attribs(n).type) ? null : new ASTNode('Class').prop('name', attribs(n).name);

type Merger = (r1: ASTNode, r2: ASTNode) => ASTNode;
const returnMergedResult: Merger  = (r1, r2) => (Object as any).assign(r2, r1);
const classesMerger: Merger  = (r1, r2) => {r1.obj.classes = r2.list; return r1; };
const fieldsMerger: Merger  = (r1, r2) => {r1.obj.fields = r2.list; return r1; };

const returnChildResult: Merger  = (r1, r2) => r2;

function log(...parms: any) {
    console.log.apply(console, parms);
}


interface Parsable {
    parse(node: Node, indent?: string): ASTNode;
}
abstract class Parslet implements Parsable {
    public name: string;
    public parent: Parslet;
    public next: Parslet;

    constructor(name: string) {
        this.name = name;
    }

    public abstract parse(node: Node, indent?: string): ASTNode;

    //Add child at and of child chain recursively
    public addNext(p: Parslet) {
        if (this.next) {
            this.next.addNext(p);
        } else {
            this.next = p;
        }
    }

    public children(p: Parslet) {

        const next = new Children(this.name, p);
        this.addNext(next);
        return this;
    }


    public child(t: Terminal, m?: Merger) {
        const next = new Child('CHILD' , t, m);
        this.addNext(next);
        return this;
    }

    public oneOf(...options: Parslet[]){
        const next = new OneOf('ONE OFF' , options);
        this.addNext(next);
        return this;
    }


}

export class Terminal extends Parslet {

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

export class Child extends Parslet {
    private terminal: Terminal;
    private merger: Merger = returnMergedResult;

    constructor(name: string, t: Terminal, m?: Merger) {
        super(name);
        this.merger = m || this.merger;
        this.terminal = t;

    }

    public parse(node: Node, indent?: string): ASTNode {
        let result  = this.terminal.parse(node, indent + ' ');
        log(indent, this.name, this.terminal.name, 'node: ', node?.nodeName, 'match:', result);

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


class NonTerminal extends Parslet {


    public parsable: Parslet;

    constructor(name: string, p?: Parslet) {
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

class Parent extends Parslet {


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
            sibbling = findNextChild(sibbling);

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
        const schema        = new Terminal("schema");
        const complexType   = new Terminal("complexType");
        const classType     = new Terminal("complexType", classHandler);
        const sequence      = new Terminal("sequence");


        //NonTerminals
        const FIELD   = new Parent("FIELD").child(fieldElement).child(complexType).child(sequence).child(fieldElement);

        const P_CLASS  = new Parent("CLASS", returnChildResult);
        const E_CLASS  = new Parent("CLASS", returnChildResult);

        E_CLASS.child(classElement, returnMergedResult);
        E_CLASS.child(complexType).child(sequence, fieldsMerger).children(FIELD);

        const C_CLASS  = new Parent("CLASS", returnChildResult);
        C_CLASS.child(classType, returnMergedResult).child(sequence).children(FIELD);
        const CLASS    =  new OneOf("CLASS", [E_CLASS, C_CLASS]);

        const SCHEMA  = new Parent("SCHEMA", classesMerger)
        const START   = SCHEMA.child(schema).children(CLASS);
        const result  = START.parse(node, '');
        return result;

    }

}




