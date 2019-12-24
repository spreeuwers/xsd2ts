/**
 * Created by eddyspreeuwers on 12/18/19.
 */

abstract class Parsable {
    public name: string;
    public parent: Parsable;
    public next: Parsable;

    constructor(name: string) {
        this.name = name;
    }

    public abstract parse(node: Node, indent?: string): [ASTNode, Node];

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


}

export class Terminal extends Parsable {
    private localName: string;

    constructor(name: string, tagName: string) {
        super(name);
        this.localName = tagName;

    }

    public parse(node: Node, indent?: string): [ASTNode, Node] {
        let result = null;
        console.log(indent + 'Terminal: ', this.localName, 'node: ', node?.nodeName);
        if (xml(node)?.localName === this.localName){
            result =  new ASTNode(this.localName);
        }
        return [result, node];
    }


}


class NonTerminal extends Parsable {


    public parsable: Parsable;

    constructor(name: string, p?: Parsable) {
        super(name);
        this.parsable = p;
    }

    public parse(node: Node, indent?: string): [ASTNode, Node] {
        const result = new ASTNode(this.name);
        console.log(indent + this.name, node?.nodeName);
        let [child, token] = this.next?.parse(node,indent + ' ') || [];
        if (child){
            result.child = child;
        }
        return [result, node];
    };

}

export class ListOf extends NonTerminal {

    public parse(node: Node, indent?: string) : [ASTNode, Node] {

        console.log(indent + 'LISTOF:',this.parsable.name, node.nodeName);

        let child = findFirstChild(node);
        console.log(indent + ' first: ', child?.nodeName);
        let [listItem, tkn] = this.parsable.parse(child, indent + '  ') || [];

        const result = new ASTNode("items");
        result.list= [];

        while (child && listItem) {
            console.log(indent + ' item:', child?.nodeName);
            result.list.push(listItem);
            [listItem, tkn] = this.parsable.parse(child, indent + '  ');
            child = findNextChild(node);


        }
        console.log(indent + ' result:', result);
        return [result, node];
    }
}

export class Child extends NonTerminal {

    public parse(node: Node, indent?: string) : [ASTNode, Node] {

        const fChild = findFirstChild(node);
        console.log(indent + 'CHILD:',this.parsable.name, fChild?.nodeName ,'parent:', this.parent?.name);
        let result = new ASTNode("CHILD");
        const [fc, token] = this.parsable.parse(fChild, indent + ' ');
        if (!fc ) {
           result = null;
        }
        //result.child = fc;
        return [result, token];
    }
}

export class From extends NonTerminal {

    public parse(node: Node, indent?: string):[ASTNode, Node]{

        console.log(indent + 'FROM:', this.parsable.name, node?.nodeName);

        let result = null;
        let token = null;
        if (node)  {
            [result, token] = this.parsable.parse(node, indent = '   ');
        }
        console.log(indent + 'FROM result:', result);
        return [result, token];
    }
}



export class ASTNode {
    public name: string;
    public child: ASTNode;
    public list: ASTNode[];


    constructor(name: string){
      this.name = name;
    }

}

export class Grammar {

    public parse(node: Node): ASTNode {

        const element = new Terminal("element", "element");
        const schema = new Terminal("schema", "schema");
        const complexType = new Terminal("complexType", "complexType");
        const sequence = new Terminal("sequence", "sequence");
        const FIELD  = new NonTerminal("FIELD").from(element);
        const CLASS  = new NonTerminal("CLASS").from(element).holds(complexType).holds(sequence);//.listOf(FIELD);
        const START = new NonTerminal("SCHEMA").listOf(CLASS);
        const [result, tkn] = START.parse(node, '');
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
    node = node?.nextSibling;
    if (node && node.nodeType == node.TEXT_NODE) {
        node = findNextChild(node);
    }
    return node;
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


