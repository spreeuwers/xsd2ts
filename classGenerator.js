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
        var _a, _b, _c;
        return (_c = (_b = (_a = node) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.getNamedItem(attrName)) === null || _c === void 0 ? void 0 : _c.value;
    };
    ClassGenerator.prototype.nodeName = function (node) {
        return this.findAttrValue(node, 'name');
    };
    ClassGenerator.prototype.childName = function (node) {
        var _a;
        return this.findAttrValue((_a = node) === null || _a === void 0 ? void 0 : _a.children[0], 'name');
    };
    ClassGenerator.prototype.generateClassFileDefinition = function (xsd, pluralPostFix, verbose) {
        var _this = this;
        if (pluralPostFix === void 0) { pluralPostFix = 's'; }
        this.fileDef = ts_code_generator_1.createFile({ classes: [] });
        var xmlDom = new xmldom_reborn_1.DOMParser().parseFromString(xsd, 'application/xml');
        //const xmlDoc = {root:xmlRoot};//parse(xsd);
        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;
        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        //this.log(JSON.stringify(xmlDoc, null, ' '));
        this.log('-------------------------------------------------------------------------------------');
        if (xmlDom.documentElement) {
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
     * Recusrsive function to retrieve all types from the XSD
     * @param node
     * @param parentClassDef
     * @param parent
     */
    ClassGenerator.prototype.traverse = function (node, parentClassDef, parent) {
        var _this = this;
        //console.log(node.name);
        var classDef = parentClassDef;
        var stopDescent = false;
        var fileDef = this.fileDef;
        var nodeName = this.findAttrValue(node, 'name');
        var abstract = this.findAttrValue(node, 'abstract');
        var parentName = this.findAttrValue(parent, 'name');
        var nodeBase = this.findAttrValue(parent, 'base');
        var nodeType = this.findAttrValue(node, 'type');
        var minOccurs = this.findAttrValue(node, 'minOccurs');
        var firstChild = node.children[0];
        var childName = this.nodeName(firstChild);
        switch (node.tagName) {
            case XS_GROUP:
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
                //make a typedef for string enums
                if (parentName === XS_SCHEMA) {
                    var simpleType = "export type " + nodeName + " ";
                    var child_1 = node.children[0]; //children[0];
                    var options_1 = [];
                    var childName_1 = this.nodeName(child_1);
                    var childBase = this.findAttrValue(child_1, 'base');
                    if (child_1 && child_1.attributes) {
                        this.log('  export typ: ' + simpleType);
                        if (childName_1 === XS_RESTRICTION) {
                            this.log('  restriction: ' + simpleType);
                            Array.prototype.slice.call(child_1.children, 0).filter(function (c) { return c.name === XS_ENUM; }).forEach(function (c) {
                                options_1.push("\"" + c.attributes.value + "\"");
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
                this.log('node  base: ' + nodeBase);
                classDef.addExtends(nodeBase);
                break;
            case XS_ELEMENT:
                var fldName = nodeName;
                var fldType = nodeType;
                var child = node.children[0];
                var skipField = false;
                var arrayPostfix = '';
                if (minOccurs === "0") {
                    fldName += "?";
                }
                if (this.nodeName(child) === XS_SIMPLE_TYPE) {
                    fldType = XS_STRING;
                }
                //check if there is a complextype defined within the element
                //and retrieve the element type in this element
                if (this.nodeName(child) === XS_COMPLEX_TYPE) {
                    child = child.children[0];
                    if (this.nodeName(child) === XS_SEQUENCE) {
                        child = child.children[0];
                        if (this.nodeName(child) === XS_ELEMENT && child.attributes) {
                            var type = this.findAttrValue(child, 'type');
                            this.log('nested typedef: ' + fldType);
                            if (this.findAttrValue(child, 'maxOccurs') === "unbounded") {
                                arrayPostfix = "[]";
                                fldType = type;
                            }
                            else {
                                fldType = fldName[0].toUpperCase() + fldName.substring(1);
                                fileDef.addClass({ name: fldType }).addProperty({
                                    name: this.nodeName(child),
                                    type: this.getFieldType(type),
                                    scope: "protected"
                                });
                            }
                            this.log('nested typedef: ' + fldType);
                            stopDescent = true;
                        }
                    }
                }
                this.log('  field: ' + fldName);
                if (fldName && classDef) {
                    //is the field is of type string array then we add a prefix (s)
                    var fieldNamePostFix = (arrayPostfix === '[]' && fldType === XS_STRING) ? this.pluralPostFix : '';
                    if (arrayPostfix === '[]' && fldType === XS_STRING) {
                        //console.log('  field: ', fldName, '['+ fldType + ']', arrayPostfix, this.pluralPostFix);
                        console.log('  field: ', fldName, '  fieldNamePostFix: ', fieldNamePostFix);
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
            Array.prototype.slice.call(node.children, 0).forEach(function (child) { return _this.traverse(child, classDef, node); });
        }
    };
    ClassGenerator.prototype.makeSortedFileDefinition = function (sortedClasses) {
        var _this = this;
        var outFile = ts_code_generator_1.createFile({ classes: [] });
        for (var ns in this.importMap) {
            outFile.addImport({ moduleSpecifier: this.importMap[ns], starImportName: ns });
        }
        var depth = 0;
        var max_depth = 1;
        while (depth <= max_depth) {
            sortedClasses.forEach(function (c) {
                var hDepth = _this.findHierachyDepth(c, _this.fileDef);
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
            depth++;
        }
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
        var result = 0;
        var superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        while (superClassName) {
            result++;
            c = f.getClass(superClassName);
            superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
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
