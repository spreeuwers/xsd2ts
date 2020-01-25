/**
 * Created by eddyspreeuwers on 12/26/19.
 */


export function log(...parms: any) {
    console.log.apply(console, parms);
}

export function findFirstChild(node: Node): Node {
    node = node?.firstChild;
    if (node && node.nodeType === node.TEXT_NODE) {
        node = findNextSibbling(node);
    }
    return node;
}

export function findNextSibbling(node: Node): Node {
    let result = node?.nextSibling as Node;
    if (result && result.nodeType == node.TEXT_NODE) {
        result = findNextSibbling(result);
    }
    //console.log('found', result?.nodeName);
    return result;
}



export function findChildren(node: Node){
    const result:Node[] = [];
    let child = findFirstChild(node);
    while (child) {
        result.push(child);
        child = findNextSibbling(child);
    }
    return result;
}


export function xml(n:Node): IXMLNode{
    return n as IXMLNode;
}

export interface IXMLNode extends Node {
    localName: string;
}

export function capFirst(s: string) {
    if (s && s[0]){
        return s[0].toUpperCase() + s.substr(1);
    }
    return s;
}


export interface IAttributes extends Node {
    name: string;
    type: string;
    base: string;
    value: string;
    ref:string;
    minOccurs:string;
    maxOccurs:string;
}

export function attribs(node: Node): IAttributes {
    const attr = (node as HTMLElement)?.attributes;
    //console.log('getNamedItem', attr);
    const result = {
        name: attr.getNamedItem('name')?.value,
        type: attr.getNamedItem('type')?.value,
        base: attr.getNamedItem('base')?.value,
        value: attr.getNamedItem('value')?.value,
        ref: attr.getNamedItem('ref')?.value,
        minOccurs: attr.getNamedItem('minOccurs')?.value,
        maxOccurs: attr.getNamedItem('maxOccurs')?.value
    };
    return result as IAttributes;
}



