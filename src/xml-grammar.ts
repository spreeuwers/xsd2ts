/**
 * Created by eddyspreeuwers on 12/18/19.
 */

type NodeHandler = (n: Node) => ASTNode;
var fieldHandler = (n) => new ASTNode('Field').prop('name', attribs(n).name).prop('type', attribs(n).type);

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

    public listOf(p: Parsable) {

        const next = new ListOf(this.name, p);
        this.addNext(next);
        return this;
    }

    public holds(p: Parsable) {
        const next =  new Child(this.name, p);
        this.addNext(next);
        return this;
    }
    public from(p: Parsable) {
        const next = new From(this.name, p);
        this.addNext(next);
        return this;
    }

    public eat(t: Terminal) {
        const next = new Eater('EAT' , t);
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
        console.log(indent + 'Terminal: ', this.name, 'node: ', node?.nodeName);
        if (xml(node)?.localName === this.name){
            result =  this.nodeHandler(node);
        }
        return result;
    }


}

export class Eater extends Parsable {
    private terminal: Terminal;

    constructor(name: string, t: Terminal) {
        super(name);
        this.terminal = t;

    }

    public parse(node: Node, indent?: string): ASTNode {
        let result = null;

        const match = this.terminal.parse(node, indent + ' ');
        console.log(indent, this.name, 'node: ', node?.nodeName, 'match:', match);

        if (match && this.next) {
            console.log(indent, 'match on:' , this.name);
            return this.next.parse(findFirstChild(node), indent + ' ');
        }
        return match;
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
        console.log(indent + this.name, node?.nodeName);
        let child = this.next?.parse(node, indent + ' ') ;

        if (child){
            result.child = child;
        } else {
            result = null;
        }
        return result;
    };

}

export class ListOf extends NonTerminal {

    public parse(node: Node, indent?: string): ASTNode{

        console.log(indent + 'LISTOF:', this.parsable.name, node.nodeName);
        let sibbling = node;

        const result = new ASTNode("items");
        result.list= [];

        while (sibbling) {
            console.log(indent + 'list sibbling:', sibbling?.nodeName);

            const listItem = this.parsable.parse(sibbling, indent + '  ');
            if (listItem) {
                result.list.push(listItem);
                console.log(indent + 'added item:', listItem);
            }
            sibbling = findNextChild(sibbling);

        }
        console.log(indent + 'result:', JSON.stringify(result || '') );
        return result;
    }
}

export class Child extends NonTerminal {

    public parse(node: Node, indent?: string): ASTNode {

        const fChild = findFirstChild(node);
        console.log(indent + 'CHILD:',this.parsable.name, fChild?.nodeName ,'parent:', this.parent?.name);
        let result = new ASTNode("CHILD");
        const fc = this.parsable.parse(fChild, indent + ' ');
        if (!fc ) {
           result = null;
        }
        //result.child = fc;
        return result;
    }
}

export class From extends NonTerminal {

    public parse(node: Node, indent?: string):ASTNode{

        console.log(indent + 'FROM:', this.parsable.name, node?.nodeName);

        let result = null;
        if (node)  {
            result= this.parsable.parse(node, indent = '   ');
        }
        console.log(indent + 'FROM result:', result);
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

        const field = new Terminal("element", fieldHandler);
        const element = new Terminal("element");
        const schema = new Terminal("schema");
        const complexType = new Terminal("complexType");
        const sequence = new Terminal("sequence");
        const FIELD  = new NonTerminal("FIELD").eat(field);
        const CLASS  = new NonTerminal("CLASS").eat(element).eat(complexType).eat(sequence).listOf(FIELD);
        const START = new NonTerminal("SCHEMA").eat(schema).listOf(CLASS);
        const result = START.parse(node, '');
        return result;

    }

}


function findFirstChild(node: Node): Node {
    node = node?.firstChild;
    if (node && node.nodeType == node.TEXT_NODE) {
        node = findNextChild(node);
    }
    return node;
}

function findNextChild(node: Node): Node {
    let result = node?.nextSibling as Node;
    if (result && result.nodeType == node.TEXT_NODE) {
        result = findNextChild(result);
    }
    //console.log('found', result?.nodeName);
    return result;
}



function findChildren(node: Node){
    const result:Node[] = [];
    let child = findFirstChild(node);
    while (child) {
        result.push(child);
        child = findNextChild(child);
    }
    return result;
}


function xml(n:Node): XMLNode{
    return n as XMLNode;
}

interface XMLNode extends Node {
    localName: string;
}

interface INamed extends Node {
    name: string;
    type: string
}

function attribs(node: Node): INamed {
    const attr = (node as HTMLElement)?.attributes;
    //console.log('getNamedItem', attr);
    const result = {
        name: attr.getNamedItem('name')?.value,
        type: attr.getNamedItem('type')?.value,
    };
    //console.log('attribs', result);
    return result as INamed;
}


