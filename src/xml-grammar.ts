/**
 * Created by eddyspreeuwers on 12/18/19.
 */

abstract class Parsable {
    public name: string;
    public parent: Parsable;
    abstract parse(node: Node, indent?: string): ASTNode;

    public listOf(p: Parsable) {

        const result = new ListOf(this.name, p);
        result.parent = this;
        return result;
    }

    public holds(p: Parsable) {
        const result =  new Child(this.name, p);
        result.parent = this;
        return result;
    }
    public from(p: Parsable) {
        const result = new From(this.name, p);
        result.parent = this;
        return result;
    }

    constructor(name: string) {
        this.name = name;
    }
}

export class Terminal extends Parsable {
    private localName: string;
    //private node: Node = null;

    constructor(name: string, tagName: string) {
        super(name);
        this.localName = tagName;

    }

    public parse(node: Node, indent?: string): ASTNode {
        console.log(indent + 'Terminal: ',this.localName);
        //let child = findFirstChild(node);
        console.log(indent + 'child: ', node?.nodeName);
        if (xml(node)?.localName === this.localName){
            return new ASTNode(this.localName);
        };
    }


}


class NonTerminal extends Parsable {


    public parsable: Parsable;

    constructor(name: string, p?: Parsable) {
        super(name);
        this.parsable = p;
    }

    public parse(node: Node, indent?: string): ASTNode {
        const result = new ASTNode(this.name);
        console.log(indent + this.name, node?.nodeName);
        return result;
    };

}

export class ListOf extends NonTerminal {

    public parse(node: Node, indent?: string){

        const result = this.parent.parse(node, indent);

        console.log(indent + 'Parent:',this.parent.name);
        console.log(indent + 'ListOf:',this.parsable.name, node.nodeName);



        let child = findFirstChild(node);
        console.log(indent + ' first: ', child?.nodeName);
        let listItem = this.parsable.parse(child, indent + ' ');

        result.list = [];
        console.log(indent + ' next elm:', child.nodeName);

        while (child) {
           result.list.push(listItem);
           listItem = this.parsable.parse(child, indent + ' ');
           child = child.nextSibling;

        }
        console.log(indent + ' result:', result,'\n');
        return result;
    }
}

export class Child extends NonTerminal {

    public parse(node: Node, indent?: string){
        let result = this.parent.parse(node, indent);

        console.log(indent + 'parent:',this.parent?.name);
        console.log(indent + 'Child:',this.parsable.name, node.nodeName);



        const fChild = findFirstChild(node);

        const fc = this.parsable.parse(fChild, indent + ' ');
        if (!fc ) {
            result = null;
        }
        //result.child = fc;
        return result;
    }
}

export class From extends NonTerminal {

    public parse(node: Node, indent?: string){
        let result = this.parent.parse(node, indent);

        console.log(indent + 'parent:',this.parent?.name);
        console.log(indent + 'From:',this.parsable.name, node?.nodeName);


        if (node && this.parsable.parse(node, indent + ' ')) {
             result = this.parent.parse(node, indent);
        };

        console.log(indent + 'result:', result);
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

}

export class Grammar {

    public parse(node: Node): ASTNode {

        const element = new Terminal("element", "element");
        const schema = new Terminal("schema", "schema");
        const complexType = new Terminal("complexType", "complexType");
        const sequence = new Terminal("sequence", "sequence");
        const FIELD  = new NonTerminal("FIELD").from(element);
        const CLASS  = new NonTerminal("CLASS");//.holds(element);//.holds(complexType).holds(sequence);//.listOf(FIELD);
        const START = new NonTerminal("SCHEMA").listOf(CLASS);
        return START.parse(node, '');

    }

}

function findFirstChild(node: Node): Node {
    return findChildren(node)[0];
}

function findChildren(node: Node): Node[] {
    const result: Node[] = [];
    let child = node?.firstChild;
    while (child) {
        if (!/function Text/.test("" + child.constructor)) {
            result.push(child as Node);
        }
        child = child.nextSibling;
    }
    return result;
}

function findTagName(node: Node): string {
    return node['localName'];
}

function xml(n:Node): XMLNode{
    return n as XMLNode;
}

interface XMLNode extends Node {
    localName: string;
}


