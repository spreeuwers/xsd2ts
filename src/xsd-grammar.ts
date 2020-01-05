/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {attribs , capFirst} from './xml-utils';
import { ASTNode,Proxy, NodeHandler, Terminal, Merger, astNode, match, oneOf} from './parsing';


const fieldHandler: NodeHandler = (n) => (attribs(n).type) ? astNode('Field').addField(n) : null;


const topFieldHandler: NodeHandler = (n) => /xs:/.test(attribs(n).type) ? astNode('Class')
    .prop('name', 'Unknown')
    .prop('fields', [{nodeType: 'Field' , fieldName: attribs(n).name, fieldType: attribs(n).type }]) : null;

const attrHandler: NodeHandler = (n) =>  astNode('Field').addField(n);


const arrayFldHandler: NodeHandler = (n) => (attribs(n).type && attribs(n).maxOccurs === "unbounded") ? astNode('Field')
    .addField(n) : null;



const cmpFldHandler: NodeHandler = (n) => astNode('Field')
    .prop('fieldName', attribs(n).name)
    .prop('fieldType', capFirst(attribs(n).name))

const classHandler: NodeHandler = (n) => (attribs(n).type) ? null : astNode('Class').addName(n);
const enumElmHandler: NodeHandler = (n) => (attribs(n).type) ? null : astNode('Enum').prop('name', attribs(n).name);
const enumerationHandler: NodeHandler = (n) => (attribs(n).value) ?  astNode('EnumValue').prop('value', attribs(n).value):null;
const extensionHandler: NodeHandler = (n) => astNode('Extesnsion').prop('extends', attribs(n).base);

const intRestrictionHandler: NodeHandler = (n) => /integer/.test(attribs(n).base) ?  astNode('AliasType').prop('value', 'integer'): null;
const strRestrictionHandler: NodeHandler = (n) => /string/.test(attribs(n).base) ?  astNode('EnumType').prop('value', 'string'): null;


const namedGroupHandler: NodeHandler = (n) => (attribs(n).name) ?  astNode('Class').prop('name','group_' + attribs(n).name): null;
const refGroupHandler: NodeHandler = (n) => (attribs(n).ref) ?  astNode('Fields').prop('ref','group_' + attribs(n).ref):null



const typesMerger: Merger  = (r1, r2) => {r1.obj.types = r2.list; return r1; };
const fieldsMerger: Merger  = (r1, r2) => {r1.obj.fields = r2.list; return r1; };
const enumMerger: Merger = (r1, r2) => {r1.nodeType = 'Enumeration'; r1.obj.values = r2.list; return r1; };
const typeMerger: Merger = (r1, r2) => {r1.nodeType = 'AliasType'; r1.obj.type = r2.obj.value; return r1; };


//const subclassMerger

//const returnChildResult: Merger  = (r1, r2) => r2;
const nestedClassMerger: Merger  = (r1, r2) => {r1.nodeType='Field';r1.obj.subClass= {name: r1.obj.fieldType, list: r2.list}; return r1; };



export class XsdGrammar {

    public parse(node: Node): ASTNode {

        //Terminals
        const FIELDPROXY     = new Proxy('Field Proxy');
        const fieldElement   = new Terminal("element:fld", fieldHandler);
        const cmpFldElement  = new Terminal("element:comp", cmpFldHandler);
        const arrFldElement  = new Terminal("element:array", arrayFldHandler);
        const classElement   = new Terminal("element:class", classHandler);
        const topFldElement  = new Terminal("element:topFld", topFieldHandler);
        const enumElement    = new Terminal("element:enum", enumElmHandler);
        const attributeGroup = new Terminal("attributeGroup:attrGrp", namedGroupHandler);
        const schema         = new Terminal("schema");
        const namedGroup     = new Terminal("group:named", namedGroupHandler);
        const refGroup       = new Terminal("group:ref", refGroupHandler);
        const complexType    = new Terminal("complexType");
        const simpleType     = new Terminal("simpleType");
        const complexContent = new Terminal("complexContent");
        const extension      = new Terminal("extension",extensionHandler);

        const enumeration    = new Terminal("enumeration",enumerationHandler);

        const strRestriction = new Terminal("restriction", strRestrictionHandler);
        const intRestriciton = new Terminal("restriction", intRestrictionHandler);
        const classType      = new Terminal("complexType", classHandler);
        const attribute      = new Terminal("attribute", attrHandler);
        const sequence       = new Terminal("sequence");


        // NonTerminals
        const ARRFIELD = match(cmpFldElement).child(complexType).child(sequence).child(arrFldElement);

        const CMPFIELD = match(cmpFldElement, nestedClassMerger).child(complexType).child(sequence).children(FIELDPROXY);
        const REFGROUP = match(refGroup);
        const FIELD    = oneOf(CMPFIELD, ARRFIELD,  match(fieldElement), REFGROUP ); FIELDPROXY.parslet = FIELD;
        const A_CLASS  = match(classElement).child(complexType).children(match(attribute));

        const E_CLASS  = match(classElement).child(complexType).child(sequence, fieldsMerger).children(FIELD);
        const C_CLASS  = match(classType).child(sequence, fieldsMerger).children(FIELD);
        const X_CLASS  = match(classType).child(complexContent).child(extension).child(sequence, fieldsMerger).children(FIELD);
        const G_CLASS  = match(attributeGroup).children(match(attribute));

        const R_CLASS  = match(classType).child(refGroup);
        const F_CLASS  = match(topFldElement);
        const N_GROUP  = match(namedGroup).child(sequence, fieldsMerger).children(FIELD);
        const ENUMTYPE = match(enumElement, enumMerger).child(simpleType).child(strRestriction).children(match(enumeration));
        const ALIASTYPE= match(enumElement, typeMerger).child(simpleType).child(intRestriciton);
        const TYPES    = oneOf(ALIASTYPE, ENUMTYPE, E_CLASS, C_CLASS, X_CLASS, N_GROUP, R_CLASS, F_CLASS, G_CLASS, A_CLASS );

        const SCHEMA   = match(schema, typesMerger).children(TYPES);
        const result   = SCHEMA.parse(node, '');
        return result;

    }

}




