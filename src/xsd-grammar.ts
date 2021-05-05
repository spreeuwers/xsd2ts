/**
 * Created by eddyspreeuwers on 12/18/19.
 */
import {attribs , capFirst} from './xml-utils';
import {
    ASTNode, Proxy, AstNodeFactory, Terminal, AstNodeMerger, astNode, match, oneOf, astClass, astField,
    astNamedUntypedElm, astEnumValue,astRestrictions, NEWLINE
} from './parsing';


function makeSchemaHandler(schemaName: string){
    return (n) => new ASTNode("schema").named(schemaName).addAttribs(n);
}

const restrictions = 'pattern,maxLength,length,minInclusive,maxInclusive'.split(',');
const numberRegExp = /(float|integer|double|positiveInteger|negativeInteger|nonNegativeInteger|decimal)/;

const fieldHandler: AstNodeFactory = (n) => (attribs(n).type) ? astNode('Field').addField(n).prop('label4', 'fieldHandler') : null;


//const topFieldHandler: AstNodeFactory = (n) => /xs:/.test(attribs(n).type) ? astClass().addName(n, 'For').addFields(n) : null;
const topFieldHandler: AstNodeFactory = (n) => {
    console.log('topFieldHandler type:', attribs(n).name, attribs(n).type, n.hasChildNodes() );

    //this element must not have any children except annotation and documentation
    let child = n.firstChild;
    while (child) {
        if (child.nodeType == child.ELEMENT_NODE) {
            console.log('  ** :', child.nodeName , attribs(child)?.name, attribs(n).name);

            if ( !/(annotation|documentation)/.test(child.nodeName ) ) {
               return null;
            }
        }
        child = child.nextSibling;
    }

    //return (primitives.test(attribs(n).type) || attribs(n).abstract == 'true') ? astNode('AliasType').addAttribs(n) : null;
    return (attribs(n).type || attribs(n).abstract) ? astNode('AliasType').addAttribs(n).prop('element', 'true') : null;
    //return /\w:/.test(attribs(n).type) ? astNode('AliasType').addAttribs(n) : null;
};

const attrHandler: AstNodeFactory = (n) =>  astNode('Field').addField(n).prefixFieldName('$');


const arrayFldHandler: AstNodeFactory = (n) => (attribs(n).type && attribs(n).maxOccurs === "unbounded") ? astNode('ArrField').addField(n).prop('label1','arrayFldHandler') : null;


const cmpFldHandler: AstNodeFactory = (n) => astField().prop('label2', 'cmpFldHandler').addField(n, capFirst(attribs(n).name));

const classHandler: AstNodeFactory = (n) => (attribs(n).type) ? null : astClass(n).prop('label3','classHandler');
const classElmHandler: AstNodeFactory = (n) => (attribs(n).type) ? null : astClass(n).prop('label3','classElmHandler').prop('element', 'true');

const namedUntypedElmHandler: AstNodeFactory = (n) => (attribs(n).type || !attribs(n).name) ? null : astNamedUntypedElm(n).prop('element', 'true');
const enumerationHandler: AstNodeFactory = (n) => (attribs(n).value) ?  astEnumValue(n): null;
const restrictionHandler: AstNodeFactory = (n) => ( attribs(n).value) ?  astRestrictions(n) : null;

const extensionHandler: AstNodeFactory = (n) => astNode('Extension').addAttribs(n);


const nrRestrictionHandler: AstNodeFactory = (n) => numberRegExp.test(attribs(n).base) ?  astNode('AliasType').prop('value', 'number') : null;
const strRestrictionHandler: AstNodeFactory = (n) => /string/.test(attribs(n).base) ?  astNode('EnumOrAliasType').prop('value', 'string') : null;
const dtRestrictionHandler: AstNodeFactory = (n) => /(dateTime|date)/.test(attribs(n).base) ?  astNode('AliasType').prop('value', 'Date') : null;


const namedGroupHandler: AstNodeFactory = (n) => (attribs(n).name) ?  astNode('Group').named(attribs(n).name) : null;
const namedSimpleTypeHandler: AstNodeFactory = (n) => (attribs(n).name) ?  astNode('SimpleType').named(attribs(n).name) : null;
const refGroupHandler: AstNodeFactory = (n) => (attribs(n).ref) ?  astNode('Fields').prop('ref', attribs(n).ref):null;
const refElementHandler: AstNodeFactory = (n) => (attribs(n).ref) ?  astNode('Reference').addAttribs(n) : null;



const childsMerger: AstNodeMerger  = (r1, r2) => {r1.children = r2.children; return r1; };
const ccontSeqAttrMerger: AstNodeMerger = (r1, r2) => {

    r2.children ?.forEach(c => {
        //organize children
        //console.log('c.nodeType', c.nodeType, c);
        if (c.nodeType === 'complexContent') {
            r1.attr.base = c.attr.base;
            r1.children = (r1.children || []).concat(c.children);
        } else if (c.nodeType === 'sequence') {
            r1.children = (r1.children || []).concat(c.children);
        } else if (c.nodeType === 'Field') {
            if (r1.children) r1.children.push(c); else r1.children = [c];
        } else if (c.nodeType === 'Fields') {
            if (r1.children) r1.children.push(c); else r1.children = [c];
        } else {
            console.log('nodeType not handled: ', c.nodeType, c);
        }
    });
    return r1;
};


const enumMerger: AstNodeMerger = (r1, r2) => {r1.nodeType = 'Enumeration'; r1.attr.values = r2.children; return r1; };
const typeMerger: AstNodeMerger = (r1, r2) => {r1.nodeType = 'AliasType'; r1.attr.type = r2.attr.value; return r1; };
const newLine =  (s) => s ? NEWLINE : '';
const patternChildrenMerger: AstNodeMerger = (r1, r2) => {
    if (!r2.children?.length) return null;
    r1.nodeType  = 'AliasType';
    r1.attr.type = r2.attr.value || 'string';

    r2.children?.forEach(c => {
       restrictions.forEach( p=>{
           if (c.attr[p]) {
               r1.attr[p] = c.attr[p];

           }
       });
    });

    return r1;
};
const patternChildMerger: AstNodeMerger = (r1, r2) => {
    r1.nodeType  = 'AliasType';
    r1.attr.type = r2.attr.type || 'string';

    restrictions.forEach(p=>{
        if (r2.attr[p]) {
            r1.attr[p] = r2.attr[p];
        }
    });
    return r1;
};

//const lengthMerger: AstNodeMerger = (r1, r2) => {r1.nodeType = 'AliasType'; r1.attr.type = r2.attr.value;r1.attr.pattern = r2.attr.maxLength; return r1; };

const nestedClassMerger: AstNodeMerger  = (r1, r2) => {r1.nodeType = 'Field'; r1.attr.nestedClass= {name: r1.attr.fieldType, children: r2.children}; return r1; };
const arrayFieldMerger: AstNodeMerger = (r1, r2) => {r2.nodeType = 'Field'; r2.attr.fieldName = r1.attr.fieldName; return r2;};

export type NsHandler = (ns: string) => void;

export class XsdGrammar {

    private schemaName: string;

    public constructor(name: string){
        this.schemaName = name;
    }


    public parse(node: Node): ASTNode {

        //Terminals
        const FIELDPROXY     = new Proxy('Field Proxy');
        const fieldElement   = new Terminal("element:fld", fieldHandler);
        const cmpFldElement  = new Terminal("element:comp", cmpFldHandler);
        const arrFldElement  = new Terminal("element:array", arrayFldHandler);
        const classElement   = new Terminal("element:class", classElmHandler);
        const topFldElement  = new Terminal("element:topFld", topFieldHandler);
        const eNamedUntyped   = new Terminal("element:namedUntypedElm", namedUntypedElmHandler);

        const attributeGroup = new Terminal("attributeGroup:attrGrp", namedGroupHandler);
        const schema         = new Terminal("schema:Schema", makeSchemaHandler(this.schemaName));
        const namedGroup     = new Terminal("group:named", namedGroupHandler);
        const refGroup       = new Terminal("group:refGrp", refGroupHandler);
        const attrRefGroup   = new Terminal("attributeGroup:attrRefGrp", refGroupHandler);
        const refElement     = new Terminal("element:refElm", refElementHandler);
        const complexType    = new Terminal("complexType");
        const simpleType     = new Terminal("simpleType");
        const namedSimpleType= new Terminal("simpleType", namedSimpleTypeHandler);
        const complexContent = new Terminal("complexContent");
        const extension      = new Terminal("extension", extensionHandler);

        const enumeration    = new Terminal("enumeration:enum",enumerationHandler);

        const strRestriction = new Terminal("restriction:strRestr", strRestrictionHandler);
        const nrRestriction  = new Terminal("restriction:nrRestr", nrRestrictionHandler);
        const dtRestriction  = new Terminal("restriction:dtRestr", dtRestrictionHandler);

        const strPattern     = new Terminal("pattern",   restrictionHandler);
        const strMaxLength   = new Terminal("maxLength", restrictionHandler);
        const strLength      = new Terminal("length",    restrictionHandler);
        const minInclusive   = new Terminal("minInclusive", restrictionHandler);
        const maxInclusive   = new Terminal("maxInclusive", restrictionHandler);
        const classType      = new Terminal("complexType:ctype", classHandler);
        const attribute      = new Terminal("attribute:attr", attrHandler);
        const sequence       = new Terminal("sequence:seq");
        const choice         = new Terminal("choice:Choice");


        // NonTerminals
        const ATTREFGRP= match(attrRefGroup).labeled('ATTRGRP');
        const REFGROUP = match(refGroup).labeled('REF_GROUP');
        const REF_ELM  = match(refElement).labeled('REF_ELEMENT');
        const ATTRIBUTE= match(attribute).labeled('ATTRIBUTE');
        const FLD_ELM  = match(fieldElement).labeled('FIELD_ELM')
        const CHOICE   = match(choice).children(REF_ELM, FIELDPROXY);
        const ARRFIELD = match(cmpFldElement, arrayFieldMerger).child(complexType).child(sequence).child(arrFldElement).labeled('ARRFIELD');

        const CMPFIELD = match(cmpFldElement, nestedClassMerger).child(complexType).child(sequence).children(FIELDPROXY).labeled('CMPFIELD');

        const FIELD    = oneOf(ARRFIELD, CMPFIELD, FLD_ELM, REFGROUP, REF_ELM, CHOICE).labeled('FIELD'); FIELDPROXY.parslet = FIELD;

        const A_CLASS  = match(classElement, childsMerger).child(complexType).children(ATTRIBUTE, CHOICE, ATTREFGRP).labeled('A_CLASS')
        // element class
        const E_CLASS  = match(classElement).child(complexType).child(sequence, childsMerger).children(FIELD).labeled('E_CLASS');
        const Z_CLASS  = match(classElement).empty().labeled('Z_CLASS');

        // group class
        const G_CLASS  = match(attributeGroup).children(match(attribute)).labeled('G_CLASS');

        // coplex type class
        const SEQUENCE = match(sequence, childsMerger).children(FIELD).labeled('SEQUENCE');
        const CCONTENT = match(complexContent).child(extension).child(sequence, childsMerger).children(FIELD).labeled('CCONTENT');

        const R_CLASS  = match(classType, childsMerger).children(REFGROUP, ATTRIBUTE).labeled('R_CLASS');
        //const C_CLASS  = match(classType).childIsOneOf(SEQUENCE, CCONTENT).labeled('C_CLASS');
        const C_CLASS  = match(classType, ccontSeqAttrMerger).children(SEQUENCE, CCONTENT, REFGROUP, ATTRIBUTE).labeled('C_CLASS');

        //extended class
        const X_CLASS  = match(classType).child(complexContent).child(extension).child(sequence, childsMerger).children(FIELD).labeled('X_CLASS');

        //const R_CLASS  = match(classType).child(refGroup);
        const S_CLASS  = match(classType).empty().labeled('EMPTY_CLASS'); //simple empty class
        const F_CLASS  = match(topFldElement).labeled('F_CLASS');
        const N_GROUP  = match(namedGroup).child(sequence, childsMerger).children(FIELD).labeled('N_GROUP');
        const ENUMELM  = match(eNamedUntyped, enumMerger).child(simpleType).child(strRestriction).children(match(enumeration)).labeled('ENUMELM');
        const ENUMTYPE = match(namedSimpleType, enumMerger).child(strRestriction).children(match(enumeration)).labeled('ENUMTYPE');
        const SRESTR   = oneOf(match(strPattern), match(strMaxLength), match(strLength));
        const NRESTR   = oneOf(match(strPattern), match(minInclusive), match(maxInclusive), match(strMaxLength));

        //const ENUM2    = match(namedSimpleType).child(strRestriction).children(match(enumeration)).labeled('ENUMTYPE2');
        //const ALIAS1   = match(eNamedUntyped, typeMerger).child(simpleType).child(nrRestriction).labeled('ALIAS1');
        const ALIAS1   = match(namedSimpleType, typeMerger).child(dtRestriction).labeled('ALIAS1');
        const ALIAS2   = match(namedSimpleType, patternChildrenMerger).child(nrRestriction, childsMerger).children(NRESTR).labeled('ALIAS2');
        const ALIAS3   = match(namedSimpleType, patternChildrenMerger).child(strRestriction, childsMerger).children(SRESTR).labeled('ALIAS3');
        const ALIAS4   = match(eNamedUntyped, patternChildMerger).child(simpleType, patternChildrenMerger).child(strRestriction, childsMerger).children(SRESTR).labeled('ALIAS4');
        const ALIAS5   = match(eNamedUntyped, patternChildMerger).child(simpleType, patternChildrenMerger).child(nrRestriction, childsMerger).children(NRESTR).labeled('ALIAS5');

        const TYPES    = oneOf(ALIAS1,  ALIAS2 , ALIAS3, ALIAS4, ALIAS5, S_CLASS, ENUMELM, ENUMTYPE,  E_CLASS, C_CLASS, X_CLASS,  N_GROUP, G_CLASS, A_CLASS,  R_CLASS, Z_CLASS, F_CLASS);
        const SCHEMA   = match(schema, childsMerger).children(TYPES);
        const result   = SCHEMA.parse(node, '');
        return result;

    }

}




