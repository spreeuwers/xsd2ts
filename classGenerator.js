"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var ts_code_generator_1 = require("ts-code-generator");
var xmldom_reborn_1 = require("xmldom-reborn");
var XS_RESTRICTION = "xs:restriction";
var XS_SIMPLE_TYPE = "xs:simpleType";
var XS_SCHEMA = "xs:schema";
var XS_STRING = 'xs:string';
var XS_SEQUENCE = "xs:sequence";
var XS_ELEMENT = "xs:element";
var XS_EXTENSION = "xs:extension";
var XS_COMPLEX_TYPE = "xs:complexType";
var XS_ENUM = "xs:enumeration";
var XS_GROUP = "xs:group";
var XS_ANNOTATION = "xs:annotation";
var CLASS_PREFIX = ".";
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
        var _a, _b, _c, _d, _e;
        this.log(attrName + ':' + ((_b = (_a = node) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.getNamedItem(attrName)));
        return (_e = (_d = (_c = node) === null || _c === void 0 ? void 0 : _c.attributes) === null || _d === void 0 ? void 0 : _d.getNamedItem(attrName)) === null || _e === void 0 ? void 0 : _e.value;
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
    ClassGenerator.prototype.traverse = function (node, parentClassDef, parent, indent) {
        var _this = this;
        var _a, _b, _c;
        //console.log(node.name);
        var classDef = parentClassDef;
        indent = indent || "";
        var stopDescent = false;
        var fileDef = this.fileDef;
        var nodeName = this.findAttrValue(node, 'name');
        this.log('nodename:' + nodeName);
        var abstract = this.findAttrValue(node, 'abstract');
        var parentName = this.findAttrValue(parent, 'name');
        var nodeBase = this.findAttrValue(node, 'base');
        var nodeType = this.findAttrValue(node, 'type');
        var minOccurs = this.findAttrValue(node, 'minOccurs');
        var maxOccurs = this.findAttrValue(node, 'maxOccurs');
        var firstChild = ((_a = node) === null || _a === void 0 ? void 0 : _a.children) ? node.children[0] : null;
        var childName = this.nodeName(firstChild);
        console.log(indent + 'node.tagName:' + node.tagName);
        switch (node.tagName) {
            case XS_GROUP:
                console.log(XS_GROUP);
                if (node.attributes && node.attributes.getNamedItem('ref')) {
                    var ref = node.attributes.getNamedItem('ref');
                    classDef.addProperty({
                        name: 'group_' + ref,
                        type: 'group_' + ref,
                        scope: "protected"
                    });
                    break;
                }
            case XS_COMPLEX_TYPE:
                console.log(indent + XS_COMPLEX_TYPE);
                if (nodeName) {
                    var className = nodeName;
                    var isAbstract = !!abstract;
                    if (nodeName === XS_GROUP) {
                        className = 'group_' + className;
                    }
                    fileDef.addClass({ name: className });
                    classDef = fileDef.getClass(className);
                    classDef.isAbstract = isAbstract;
                    classDef.isExported = true;
                    this.log('class: ' + className);
                }
                break;
            case XS_SIMPLE_TYPE:
                console.log(indent + "XS_SIMPLE_TYPE");
                //make a typedef for string enums
                if (parentName === XS_SCHEMA) {
                    var simpleType = "export type " + nodeName + " ";
                    var child_1 = this.findFirstChild(node); //children[0];
                    var options_1 = [];
                    var childName_1 = this.nodeName(child_1);
                    var childBase = this.findAttrValue(child_1, 'base');
                    if (child_1 && child_1.attributes) {
                        this.log('  export typ: ' + simpleType);
                        if (child_1.tagName === XS_RESTRICTION) {
                            this.log('  restriction: ' + simpleType);
                            //Array.prototype.slice.call(child.children,0).filter(
                            this.findChildren(child_1).filter(function (c) { return (c.tagName === XS_ENUM); }).forEach(function (c) {
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
                }
                break;
            case XS_EXTENSION:
                console.log(indent + "XS_EXTENSION");
                this.log('node  base: ' + nodeBase);
                classDef.addExtends(nodeBase);
                break;
            case XS_ELEMENT:
                console.log(indent + "XS_ELEMENT");
                var fldName = nodeName;
                var fldType = nodeType;
                var child = this.findFirstChild(node);
                var skipField = false;
                var arrayPostfix = (maxOccurs === "unbounded") ? "[]" : "";
                if (minOccurs === "0") {
                    fldName += "?";
                }
                while (((_b = child) === null || _b === void 0 ? void 0 : _b.tagName) === XS_ANNOTATION || /function Text/.test("" + ((_c = child) === null || _c === void 0 ? void 0 : _c.constructor))) {
                    console.log(indent + " XS_ANNOTATION");
                    child = child.nextSibling;
                    //console.log(child);
                }
                if (child && child.tagName === XS_SIMPLE_TYPE) {
                    console.log(indent + " XS_SIMPLE_TYPE");
                    fldType = XS_STRING;
                }
                //check if there is a complextype defined within the element
                //and retrieve the element type in this element
                if (child && child.tagName === XS_COMPLEX_TYPE) {
                    console.log(indent + " XS_COMPLEX_TYPE");
                    child = this.findFirstChild(child);
                    if (child.tagName === XS_SEQUENCE) {
                        console.log(indent + "  XS_SEQUENCE");
                        child = this.findFirstChild(child);
                        if (child && child.tagName === XS_ELEMENT && child.attributes) {
                            var type = this.findAttrValue(child, "type");
                            console.log(indent + "   XS_ELEMENT", child.attributes.length, type, this.findAttrValue(child, 'name'));
                            console.log(indent + '   nested typedef: ' + fldType, this.findAttrValue(child, 'maxOccurs'));
                            if (this.findAttrValue(child, 'maxOccurs') === "unbounded") {
                                arrayPostfix = "[]";
                                fldType = type;
                                console.log(indent + "array");
                            }
                            else {
                                fldType = fldName[0].toUpperCase() + fldName.substring(1);
                                fileDef.addClass({ name: fldType }).addProperty({
                                    name: this.nodeName(child),
                                    type: this.getFieldType(type),
                                    scope: "protected"
                                });
                                console.log(indent + "   addClass: " + fldType);
                            }
                            this.log('nested typedef: ' + fldType);
                            stopDescent = true;
                        }
                    }
                }
                console.log(indent + '  field: ' + fldName, arrayPostfix);
                if (fldName && classDef) {
                    //is the field is of type string array then we add a prefix (s)
                    var fieldNamePostFix = (arrayPostfix === '[]' && fldType === XS_STRING) ? this.pluralPostFix : '';
                    if (arrayPostfix === '[]' && fldType === XS_STRING) {
                        //console.log('  field: ', fldName, '['+ fldType + ']', arrayPostfix, this.pluralPostFix);
                        console.log(indent + "   field: ", fldName, '  fieldNamePostFix: ', fieldNamePostFix);
                    }
                    classDef.addProperty({
                        name: fldName,
                        type: this.getFieldType(fldType) + arrayPostfix,
                        scope: "protected"
                    });
                }
                break;
        }
        if (!stopDescent) {
            var elms = this.findChildren(node);
            console.log(indent + 'nrofchildren:' + elms.length);
            elms.forEach(function (child) { return _this.traverse(child, classDef, node, indent + " "); });
        }
    };
    ClassGenerator.prototype.makeSortedFileDefinition = function (sortedClasses) {
        var _this = this;
        console.log('makeSortedFileDefinition ');
        var outFile = ts_code_generator_1.createFile({ classes: [] });
        for (var ns in this.importMap) {
            console.log('ns ', ns);
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
                    if (c.name.indexOf('group_') === 0) {
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
            console.log('depth:', depth);
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
            c.getPropertiesAndConstructorParameters().forEach(function (p) {
                _this.addProtectedPropToClass(classDef, p);
            });
            return;
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
