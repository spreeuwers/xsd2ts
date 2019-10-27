"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var ts_code_generator_1 = require("ts-code-generator");
var xmldom_reborn_1 = require("xmldom-reborn");
var xsdTypes;
(function (xsdTypes) {
    xsdTypes["XS_STRING"] = "xs:string";
    xsdTypes["XS_ENUM"] = "xs:enumeration";
})(xsdTypes || (xsdTypes = {}));
var XS_SCHEMA = "xs:schema";
var XS_RESTRICTION = "xs:restriction";
var XS_SEQUENCE = "xs:sequence";
var XS_ELEMENT = "xs:element";
var XS_EXTENSION = "xs:extension";
var XS_COMPLEX_TYPE = "xs:complexType";
var XS_SIMPLE_TYPE = "xs:simpleType";
var XS_GROUP = "xs:group";
var XS_ANNOTATION = "xs:annotation";
var XS_DOCUMENTATION = "xs:documentation";
var XS_ATTRIBUTE = "xs:attribute";
var UNKNOWN = "Unknown";
var GROUP_PREFIX = 'group_';
var CLASS_PREFIX = ".";
var State = /** @class */ (function () {
    function State(s) {
        var _this = this;
        Object.keys(s || {}).forEach(function (key) { return _this[key] = s[key]; });
    }
    return State;
}());
var ClassGenerator = /** @class */ (function () {
    function ClassGenerator(dependencies, class_prefix) {
        if (class_prefix === void 0) { class_prefix = CLASS_PREFIX; }
        this.class_prefix = class_prefix;
        //private file: FileDefinition;
        //private classes: { [key: string]: FileDefinition } = {};
        this.fileDef = ts_code_generator_1.createFile({ classes: [] });
        this.verbose = false;
        this.pluralPostFix = 's';
        this.importMap = [];
        this.types = [];
        this.dependencies = dependencies || {};
        console.log(JSON.stringify(this.dependencies));
    }
    ClassGenerator.prototype.nsResolver = function (ns) {
        //this.importStatements.push(`import * as ${ns} from "${this.dependencies[ns]}";\n`);
        this.importMap[ns] = this.dependencies[ns] || "ns";
        //console.log(ns, this.dependencies[ns]);
    };
    ClassGenerator.prototype.findAttrValue = function (node, attrName) {
        var _a, _b, _c;
        //this.log(attrName + ':' + node?.attributes?.getNamedItem(attrName));
        return (_c = (_b = (_a = node) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.getNamedItem(attrName)) === null || _c === void 0 ? void 0 : _c.value;
    };
    ClassGenerator.prototype.nodeName = function (node) {
        return this.findAttrValue(node, 'name');
    };
    ClassGenerator.prototype.childName = function (node) {
        var _a;
        return this.findAttrValue((_a = node) === null || _a === void 0 ? void 0 : _a.children[0], 'name');
    };
    ClassGenerator.prototype.findChildren = function (node) {
        var _a;
        var result = [];
        var child = (_a = node) === null || _a === void 0 ? void 0 : _a.firstChild;
        while (child) {
            if (!/function Text/.test("" + child.constructor)) {
                result.push(child);
            }
            child = child.nextSibling;
        }
        return result;
    };
    ClassGenerator.prototype.findFirstChild = function (node) {
        return this.findChildren(node)[0];
    };
    ClassGenerator.prototype.arrayfy = function (nodes) {
        return Array.prototype.slice.call(nodes || [], 0);
    };
    ClassGenerator.prototype.generateClassFileDefinition = function (xsd, pluralPostFix, verbose) {
        var _this = this;
        if (pluralPostFix === void 0) { pluralPostFix = 's'; }
        var _a;
        this.fileDef = ts_code_generator_1.createFile({ classes: [] });
        var xmlDom = new xmldom_reborn_1.DOMParser().parseFromString(xsd, 'application/xml');
        //const xmlDoc = {root:xmlRoot};//parse(xsd);
        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;
        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        //this.log(xmlDom);
        //this.log(JSON.stringify(xmlDoc, null, ' '));
        this.log('-------------------------------------------------------------------------------------');
        if ((_a = xmlDom) === null || _a === void 0 ? void 0 : _a.documentElement) {
            //console.log('start'+ xmlDom?.documentElement.firstChild.nextSibling);
            //console.log('------------------------------------------------------');
            this.traverse(xmlDom.documentElement);
        }
        var sortedClasses = this.fileDef.classes.sort(function (a, b) { return a.name.localeCompare(b.name); });
        console.log('-------------------------------generated classes-------------------------------------');
        console.log('Nr of classes generated: ', sortedClasses.length);
        sortedClasses.forEach(function (c) { return _this.log(c.name); });
        console.log('--------------------------------------------------------------------------------------');
        return this.makeSortedFileDefinition(sortedClasses);
    };
    ClassGenerator.prototype.log = function (msg) {
        if (this.verbose) {
            console.log(msg);
        }
    };
    /**
     * Recursive function to retrieve all types from the XSD
     * @param node
     * @param parentClassDef
     * @param parent
     */
    ClassGenerator.prototype.traverse = function (node, state, parent, indent) {
        var _this = this;
        var _a, _b, _c, _d, _e;
        //console.log(node.name);
        //let classDef = parentClassDef;
        if (!((_a = node) === null || _a === void 0 ? void 0 : _a.tagName)) {
            console.log(indent + "<!--   comment    -->");
            return "";
        }
        indent = indent || "";
        state = new State(state);
        var superClassName;
        //let arrayPostfix='';
        //let newField:{name:string, type:string, parent: string};
        //let newClass:{name:string, super:string, abstract: boolean};
        var fileDef = this.fileDef;
        var nodeName = this.findAttrValue(node, 'name');
        //const parentName = this.findAttrValue(parent,'name');
        var nodeType = this.findAttrValue(node, 'type');
        var minOccurs = this.findAttrValue(node, 'minOccurs');
        var maxOccurs = this.findAttrValue(node, 'maxOccurs');
        var firstChild = ((_b = node) === null || _b === void 0 ? void 0 : _b.children) ? node.children[0] : null;
        //const childName = this.nodeName(<HTMLElement>firstChild);
        console.log(indent + ("<" + ((_c = node) === null || _c === void 0 ? void 0 : _c.tagName) + " name=\"" + nodeName + "\" type=\"" + nodeType + "\">"));
        var createField = false;
        //console.log(indent, node?.tagName, nodeName);
        function capfirst(s) {
            if (s === void 0) { s = ''; }
            var _a, _b;
            return ((_a = s[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) + ((_b = s) === null || _b === void 0 ? void 0 : _b.substring(1));
        }
        state.path = (state.path || '') + ((_d = node) === null || _d === void 0 ? void 0 : _d.tagName.replace('xs:', '/'));
        console.log(indent, ' path', state.path);
        switch (node.tagName) {
            case XS_SCHEMA:
                state.className = "Schema";
                this.createClass(state.className, indent);
                break;
            case XS_EXTENSION:
                //console.log(indent+"XS_EXTENSION");
                //this.log('node  base: ' + superClassName);
                //superClassName = nodeBase;
                //classDef.addExtends(nodeBase);
                superClassName = this.findAttrValue(node, 'base');
                (_e = fileDef.getClass(state.className)) === null || _e === void 0 ? void 0 : _e.addExtends(superClassName);
                break;
            case XS_ANNOTATION:
                break;
            case XS_SEQUENCE:
                break;
            case XS_RESTRICTION:
                if (state.fieldName) {
                    state.fieldType = this.findAttrValue(node, 'base');
                }
                break;
            case XS_DOCUMENTATION:
                break;
            case XS_ATTRIBUTE:
            case XS_GROUP:
                console.log(indent, 'XS_GROUP');
                if (nodeName) {
                    state.className = GROUP_PREFIX + nodeName;
                    this.createClass(state.className, indent);
                    break;
                }
            case XS_SIMPLE_TYPE:
                console.log(indent + "XS_SIMPLE_TYPE");
                //make a typedef for string enums
                var typeName = (nodeName) ? nodeName : capfirst(state.fieldName);
                var simpleType = "export type " + typeName + " ";
                var child = this.findFirstChild(node); //children[0];
                var options_1 = [];
                var childName = this.nodeName(child);
                var childBase = this.findAttrValue(child, 'base');
                if (child && child.attributes) {
                    this.log('  export type: ' + simpleType);
                    if (child.tagName === XS_RESTRICTION) {
                        this.log('  restriction: ' + simpleType);
                        //Array.prototype.slice.call(child.children,0).filter(
                        this.findChildren(child).filter(function (c) { return (c.tagName === xsdTypes.XS_ENUM); }).forEach(function (c) {
                            var value = _this.findAttrValue(c, 'value');
                            options_1.push("\"" + value + "\"");
                        });
                    }
                }
                if (options_1.length === 0) {
                    options_1.push(this.getFieldType(childBase));
                }
                //convert to typedef statement
                this.types.push(simpleType + '= ' + options_1.join(' | ') + ';');
                this.log('  export types: ' + this.types);
                break;
            case XS_COMPLEX_TYPE:
                console.log(indent + 'XS_COMPLEX_TYPE');
                if (nodeName) {
                    state.className = capfirst(nodeName);
                }
                else {
                    //when there is no name attribute take the parent fieldName
                    state.parentClass = state.className;
                    state.parentName = state.fieldName;
                    state.className = capfirst(state.fieldName);
                }
                this.createClass(state.className, indent);
                break;
            case XS_ELEMENT:
                //console.log(indent+"XS_ELEMENT");
                state.fieldName = nodeName;
                state.fieldType = nodeType || capfirst(state.fieldName || "");
                var requiredPostfix = ((minOccurs === "0") ? "?" : "");
                var arrayPostfix = (maxOccurs === "unbounded") ? "[]" : "";
                var ref = this.findAttrValue(node, 'ref');
                if (ref) {
                    state.fieldType = GROUP_PREFIX + ref;
                }
                var nrOfElements = this.findChildren(parent).filter(function (c) { return c.tagName === XS_ELEMENT; }).length;
                console.log(indent, 'elm siblings:', parent.tagName, nrOfElements);
                var isArrayClass = nrOfElements === 1 && arrayPostfix;
                //nested field with nested class
                if (isArrayClass) {
                    console.log(indent, 'isArrayClass:', isArrayClass);
                    var fieldName = state.parentName + ((minOccurs === "0") ? "?" : "");
                    this.adjustField(state.parentClass, fieldName, nodeType, arrayPostfix, indent);
                    this.fileDef.classes = this.fileDef.classes.filter(function (c) { return c.name !== state.className; });
                }
                else {
                    console.log(indent, 'createField:', state);
                    this.createField(state, arrayPostfix, requiredPostfix, indent);
                }
        }
        ////////////////////////////////////////////////////////////////
        var elms = this.findChildren(node);
        //console.log(indent + 'nrofchildren:'+ elms.length);
        //traverse should return a className if needed
        //let showState = new State(state);
        //delete(showState.path);
        //console.log(indent, ' state before descent: ', JSON.stringify(showState));
        var createdFields = elms.map(function (child) { return _this.traverse(child, state, node, indent + " "); });
        //showState = new State(state);
        //delete(showState.path);
        //console.log(indent, ' state after descent: ', JSON.stringify(showState));
        /////////////////////////////////////////////////////////////////
        // if (state.className ){
        //
        //     const classDef = this.createClass(fileDef, state.className, indent);
        //     if (superClassName){
        //         classDef.addExtends(superClassName);
        //     }
        //      //classDef.isAbstract = isAbstract;
        //
        //
        // }
        //&& newField.parent
        //console.log('className: ', className)
        // let createdField = null;
        // if (state.fieldName){
        //     if (!state.className){
        //        this.createClass(fileDef, UNKNOWN, indent);
        //        state.className = UNKNOWN;
        //     }
        //     console.log(indent, 'defining field: ', state.fieldName, 'on', state.className);
        //     //let classDef = fileDef.getClass(className);
        //     let fldName = state.fieldName;
        //     let fldType = this.getFieldType(state.fieldType) + arrayPostfix;
        //     let classDef = fileDef.getClass(state.className);
        //     let property = classDef?.getProperty(fldName);
        //
        //     if (!property) {
        //         property = classDef?.addProperty({name: fldName, type: fldType, scope: "protected"});
        //     }
        //
        //     console.log('created field:',fldName, 'on class: ',state.className, ' with type: ', fldType);
        //     console.log(indent,'prop: ', property?.name, property?.type?.text);
        //     createdField = property?.name;
        // }
        // console.log(indent + `</${node.tagName}>//${nodeName}`);
        // return createdField;
    };
    ClassGenerator.prototype.createField = function (state, arrayPostfix, requiredPoastfix, indent) {
        var _a, _b, _c, _d, _e, _f, _g;
        var fldName = state.fieldName + requiredPoastfix;
        var fldType = this.getFieldType(state.fieldType) + arrayPostfix;
        console.log('createing field:', fldName, 'on class: ', state.className, ' with type: ', fldType);
        var classDef = (_a = this.fileDef) === null || _a === void 0 ? void 0 : _a.getClass(((_b = state) === null || _b === void 0 ? void 0 : _b.className) || UNKNOWN);
        var property = (_c = classDef) === null || _c === void 0 ? void 0 : _c.getProperty(fldName);
        if (!property) {
            property = (_d = classDef) === null || _d === void 0 ? void 0 : _d.addProperty({ name: fldName, type: fldType, scope: "protected" });
        }
        console.log('created field:', fldName, 'on class: ', state.className, ' with type: ', fldType);
        console.log(indent, 'prop: ', (_e = property) === null || _e === void 0 ? void 0 : _e.name, (_g = (_f = property) === null || _f === void 0 ? void 0 : _f.type) === null || _g === void 0 ? void 0 : _g.text);
    };
    ClassGenerator.prototype.adjustField = function (className, fldName, fieldType, arrayPostfix, indent) {
        var _a, _b;
        var fldType = this.getFieldType(fieldType) + arrayPostfix;
        var classDef = this.fileDef.getClass(className);
        (_b = (_a = classDef) === null || _a === void 0 ? void 0 : _a.getProperty(fldName)) === null || _b === void 0 ? void 0 : _b.setType(fldType);
    };
    /////////////////////////////////////////////////////////////////////////
    ClassGenerator.prototype.createClass = function (name, indent) {
        var classDef = this.fileDef.getClass(name);
        if (!classDef) {
            console.log(indent, 'defining class: ', name);
            classDef = this.fileDef.addClass({ name: name });
            classDef.isExported = true;
        }
        return classDef;
    };
    ClassGenerator.prototype.makeSortedFileDefinition = function (sortedClasses) {
        var _this = this;
        //console.log('makeSortedFileDefinition ');
        var outFile = ts_code_generator_1.createFile({ classes: [] });
        for (var ns in this.importMap) {
            //console.log('ns ',ns);
            outFile.addImport({ moduleSpecifier: this.importMap[ns], starImportName: ns });
        }
        var depth = 0;
        var max_depth = 1;
        //console.log('max_depth ',max_depth);
        while (depth <= max_depth) {
            //console.log('depth ');
            sortedClasses.forEach(function (c) {
                //console.log('forEach ', c);
                var hDepth = _this.findHierachyDepth(c, _this.fileDef);
                //console.log('hDepth ', hDepth);
                if (hDepth > max_depth) {
                    max_depth = hDepth;
                }
                _this.log(c.name + '\t' + hDepth);
                if (hDepth === depth) {
                    if (c.name.indexOf(GROUP_PREFIX) === 0) {
                        return;
                    }
                    outFile.addClass({ name: c.name });
                    var classDef_1 = outFile.getClass(c.name);
                    classDef_1.isExported = true;
                    classDef_1.isAbstract = c.isAbstract;
                    c.extendsTypes.forEach(function (t) { return classDef_1.addExtends(t.text); });
                    c.getPropertiesAndConstructorParameters().forEach(function (prop) {
                        _this.addProtectedPropToClass(classDef_1, prop);
                    });
                    var constructor = classDef_1.addMethod({ name: 'constructor' });
                    constructor.scope = "protected";
                    constructor.addParameter({ name: "props?", type: c.name });
                    constructor.onWriteFunctionBody = function (writer) {
                        if (c.extendsTypes.length) {
                            writer.write("super();\n");
                        }
                        writer.write("this[\"@class\"] = \"" + _this.class_prefix + c.name + "\";\n");
                        writer.write('(<any>Object).assign(this, <any> props);');
                    };
                }
            });
            //console.log('depth:', depth);
            depth++;
        }
        console.log('ready');
        return outFile;
    };
    ClassGenerator.prototype.addProtectedPropToClass = function (classDef, prop) {
        var _this = this;
        var type = prop.type.text;
        if (/^group_/.test(type)) {
            var c = this.fileDef.getClass(type);
            if (c) {
                c.getPropertiesAndConstructorParameters().forEach(function (p) {
                    _this.addProtectedPropToClass(classDef, p);
                });
                return;
            }
        }
        classDef.addProperty({
            name: prop.name,
            type: prop.type.text,
            defaultExpression: (prop.defaultExpression) ? prop.defaultExpression.text : null,
            scope: "protected"
        });
    };
    ClassGenerator.prototype.findHierachyDepth = function (c, f) {
        var _a, _b;
        var result = 0;
        var superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        while (superClassName) {
            //console.log('superClassName',c,superClassName)
            result++;
            c = f.getClass(superClassName);
            superClassName = (_b = (_a = c) === null || _a === void 0 ? void 0 : _a.extendsTypes[0]) === null || _b === void 0 ? void 0 : _b.text;
        }
        return result;
    };
    ClassGenerator.prototype.getFieldType = function (type) {
        var result = type;
        switch (type) {
            case "xs:string":
                result = "string";
                break;
            case "xs:float":
                result = "number";
                break;
            case "xs:double":
                result = "number";
                break;
            case "xs:integer":
                result = "number";
                break;
            case "xs:int":
                result = "number";
                break;
            case "xs:boolean":
                result = "boolean";
                break;
            case "xs:dateTime":
                result = "Date";
                break;
            case "xs:date":
                result = "Date";
                break;
            case "xs:long":
                result = "number";
                break;
            case "xs:decimal":
                result = "number";
                break;
            case "xs:base64Binary":
                result = "string";
                break;
        }
        if (result) {
            if (result.indexOf(':') > 0) {
                var ns = result.split(':')[0];
                this.nsResolver(ns);
                console.log("namespace", ns);
            }
            return result.replace(':', '.');
        }
        else {
            return 'any';
        }
    };
    return ClassGenerator;
}());
exports.ClassGenerator = ClassGenerator;
