/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {attribs , capFirst} from './xml-utils';
import {
    ASTNode, Proxy, AstNodeFactory, Terminal, AstNodeMerger, astNode, match, oneOf, astClass, astField,
    astEnum, astEnumValue
} from './parsing';


const fieldHandler: AstNodeFactory = (n) => (attribs(n).type) ? astNode('Field').addField(n) : null;


const topFieldHandler: AstNodeFactory = (n) => /xs:/.test(attribs(n).type) ? astClass().addName(n, 'For').addFields(n) : null;

const attrHandler: AstNodeFactory = (n) =>  astNode('Field').addField(n);


const arrayFldHandler: AstNodeFactory = (n) => (attribs(n).type && attribs(n).maxOccurs === "unbounded") ? astNode('Field').addField(n) : null;


const cmpFldHandler: AstNodeFactory = (n) => astField().prop('fieldName', attribs(n).name).prop('fieldType', capFirst(attribs(n).name));

const classHandler: AstNodeFactory = (n) => (attribs(n).type) ? null : astClass(n);
const enumElmHandler: AstNodeFactory = (n) => (attribs(n).type) ? null : astEnum(n);
const enumerationHandler: AstNodeFactory = (n) => (attribs(n).value) ?  astEnumValue(n): null;
const extensionHandler: AstNodeFactory = (n) => astNode('Extension').prop('extends', attribs(n).base);

const intRestrictionHandler: AstNodeFactory = (n) => /integer/.test(attribs(n).base) ?  astNode('AliasType').prop('value', 'number'): null;
const strRestrictionHandler: AstNodeFactory = (n) => /string/.test(attribs(n).base) ?  astNode('EnumType').prop('value', 'string'): null;


const namedGroupHandler: AstNodeFactory = (n) => (attribs(n).name) ?  astNode('Group').named(attribs(n).name) : null;
const refGroupHandler: AstNodeFactory = (n) => (attribs(n).ref) ?  astNode('Fields').prop('ref', attribs(n).ref):null;
const refElementHandler: AstNodeFactory = (n) => (attribs(n).ref) ?  astNode('Reference').addAtribs(n) : null;



const typesMerger: AstNodeMerger  = (r1, r2) => {r1.children = r2.children; return r1; };
const fieldsMerger: AstNodeMerger  = (r1, r2) => {r1.children = r2.children; return r1; };
//const choiceMerger: AstNodeMerger  = (r1, r2) => (<any>r2.list[0]) as ASTNode ;
const enumMerger: AstNodeMerger = (r1, r2) => {r1.nodeType = 'Enumeration'; r1.attr.values = r2.children; return r1; };
const typeMerger: AstNodeMerger = (r1, r2) => {r1.nodeType = 'AliasType'; r1.attr.type = r2.attr.value; return r1; };

const nestedClassMerger: AstNodeMerger  = (r1, r2) => {r1.nodeType='Field';r1.attr.nestedClass= {name: r1.attr.fieldType, children: r2.children}; return r1; };



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
        const refGroup       = new Terminal("group:refGrp", refGroupHandler);
        const refElement     = new Terminal("element:refElm", refElementHandler);
        const complexType    = new Terminal("complexType");
        const simpleType     = new Terminal("simpleType");
        const complexContent = new Terminal("complexContent");
        const extension      = new Terminal("extension",extensionHandler);

        const enumeration    = new Terminal("enumeration:enum",enumerationHandler);

        const strRestriction = new Terminal("restriction:strRestr", strRestrictionHandler);
        const intRestriciton = new Terminal("restriction:intRestr", intRestrictionHandler);
        const classType      = new Terminal("complexType:ctype", classHandler);
        const attribute      = new Terminal("attribute:attr", attrHandler);
        const sequence       = new Terminal("sequence:seq");
        const choice         = new Terminal("choice:Choice");


        // NonTerminals

        const REFGROUP = match(refGroup).labeled('REF_GROUP');
        const REF_ELM  = match(refElement).labeled('REF_ELEMENT');
        const ATTRIBUTE= match(attribute).labeled('ATTRIBUTE');
        const FLD_ELM  = match(fieldElement).labeled('FIELD_ELM')
        const CHOICE   = match(choice).children(REF_ELM, FIELDPROXY);
        const ARRFIELD = match(cmpFldElement).child(complexType).child(sequence).child(arrFldElement).labeled('ARRFIELD');

        const CMPFIELD = match(cmpFldElement, nestedClassMerger).child(complexType).child(sequence).children(FIELDPROXY).labeled('CMPFIELD');

        const FIELD    = oneOf(CMPFIELD, ARRFIELD,  FLD_ELM, REFGROUP, REF_ELM ).labeled('FIELD'); FIELDPROXY.parslet = FIELD;

        const A_CLASS  = match(classElement, fieldsMerger).child(complexType).children(ATTRIBUTE, CHOICE).labeled('A_CLASS')
        // element class
        const E_CLASS  = match(classElement).child(complexType).child(sequence, fieldsMerger).children(FIELD).labeled('E_CLASS');

        // group class
        const G_CLASS  = match(attributeGroup).children(match(attribute)).labeled('G_CLASS');

        // coplex type class
        const SEQUENCE = match(sequence, fieldsMerger).children(FIELD).labeled('SEQUENCE');
        const CCONTENT = match(complexContent).child(extension).child(sequence, fieldsMerger).children(FIELD).labeled('CCONTENT');

        const R_CLASS  = match(classType, fieldsMerger).children(REFGROUP, ATTRIBUTE).labeled('R_CLASS');
        const C_CLASS  = match(classType).childIsOneOf(SEQUENCE, CCONTENT).labeled('C_CLASS');

        //extended class
        const X_CLASS  = match(classType).child(complexContent).child(extension).child(sequence, fieldsMerger).children(FIELD).labeled('X_CLASS');

        //const R_CLASS  = match(classType).child(refGroup);
        const S_CLASS  = match(classType).empty().labeled('EMPTY_CLASS'); //simple empty class
        const F_CLASS  = match(topFldElement).labeled('F_CLASS');
        const N_GROUP  = match(namedGroup).child(sequence, fieldsMerger).children(FIELD).labeled('N_GROUP');
        const ENUMTYPE = match(enumElement, enumMerger).child(simpleType).child(strRestriction).children(match(enumeration)).labeled('ENUMTYPE');
        const ALIASTYPE= match(enumElement, typeMerger).child(simpleType).child(intRestriciton).labeled('ALIAS');
        const TYPES    = oneOf(ALIASTYPE, S_CLASS, ENUMTYPE, E_CLASS, C_CLASS, X_CLASS, N_GROUP, F_CLASS, G_CLASS, A_CLASS,  R_CLASS );

        const SCHEMA   = match(schema, typesMerger).children(TYPES);
        const result   = SCHEMA.parse(node, '');
        return result;

    }

}




