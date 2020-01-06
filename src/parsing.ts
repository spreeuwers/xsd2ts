/**
 * Created by eddyspreeuwers on 1/5/20.
 */
import {capFirst, attribs, findFirstChild, xml, log, findNextSibbling, getFieldType} from './xml-utils';

const UNBOUNDED = 'unbounded';


export type FindNextNode = (n: Node) => Node;
export type NodeHandler = (n: Node) => ASTNode;
export type Merger = (r1: ASTNode, r2: ASTNode) => ASTNode;

const returnMergedResult: Merger  = (r1, r2) => r1.merge(r2);
let ns = 'xs';

export function setNamespace(namespace: string) {
    ns = namespace;
}
export function astNode(s:string) {
    return new ASTNode(s);
}

export function astClass(n?: Node) {
    let result = astNode('Class');
    if (n) result.addName(n);
    return result;
}

export function astEnum(n:Node) {
    return astNode('Enum').named(attribs(n).name);
}

export function astEnumValue(n: Node){
    return astNode('EnumValue').prop('value', attribs(n).value);
}

export function astField() {
    return astNode('Class');
}


export function oneOf(...options: Parslet[]){
    return new OneOf('ONE OFF' , options);
}


export function match(t: Terminal, m?: Merger) {
    return new Matcher('MATCH' , t, m);
}

export interface Parsable {
    parse(node: Node, indent?: string): ASTNode;
}


export class ASTNode {
    public nodeType: string;
    public name: string;
    public child: ASTNode;
    public list: ASTNode[];

    constructor(type: string){
        this.nodeType = type;
    }

    public prop(key: string, value: any) {
        this[key] = value;
        return this;
    }

    public named(name:string): ASTNode {
        this.name = name;
        return this;
    }

    public capNamed(name: string): ASTNode {
        this.name = capFirst(name);
        return this;
    }


    public addFields(n:Node): ASTNode {
        return this.prop('fields', [{nodeType: 'Field' , fieldName: attribs(n).name, fieldType: attribs(n).type }]);
    }


    public addName(node: Node, prefix?: string): ASTNode{
        return this.prop('name', (prefix || '') + capFirst(attribs(node).name));
    }

    public addField(node: Node) {

        let type = getFieldType(attribs(node).type);

        this.prop('fieldName', attribs(node).name + ((attribs(node).minOccurs === '0') ? '?' : ''))
            .prop('fieldType', type + ((attribs(node).maxOccurs === UNBOUNDED) ? '[]' : ''));
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

export class ASTClass extends ASTNode {


    constructor(n: Node) {
        super ("Class");
        this.addName(n);
    }

    get nodeType(){
        return 'Class;';
    }

    public static fromNamedElement(n:Node): ASTClass {
        return new ASTClass(n);
    }
}

export abstract class Parslet implements Parsable {
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
        this.label = tmp[1] ?? '_';

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

export class Proxy extends Parslet {

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
            let skip = /(annotation|documentation)/.test(xml(node)?.localName);
            if (!skip) break;
            sibbling = findNextSibbling(sibbling);
        }
        result  = this.terminal.parse(sibbling, indent + ' ');

        log(indent, this.name, this.terminal.tagName, 'node: ', node?.nodeName, 'match:', JSON.stringify(result));

        if (result && this.nextParslet) {
            const nextResult =  this.nextParslet.parse(this.fnNextNode(sibbling), indent + ' ');
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
        return result;
    }
}



