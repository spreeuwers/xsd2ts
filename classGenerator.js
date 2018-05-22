"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var ts_code_generator_1 = require("ts-code-generator");
var parse = require("xml-parser");
var XS_RESTRICTION = "xs:restriction";
var XS_SIMPLE_TYPE = "xs:simpleType";
var XS_SCHEMA = "xs:schema";
var XS_STRING = 'xs:string';
var XS_SEQUENCE = "xs:sequence";
var XS_ELEMENT = "xs:element";
var XS_EXTENSION = "xs:extension";
var XS_COMPLEX_TYPE = "xs:complexType";
var XS_ENUM = "xs:enumeration";
var XS_ANNOTATION = "xs:annotation";
var XS_GROUP = "xs:group";
var CLASS_PREFIX = ".";
var UNBOUNDED = "unbounded";
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
    ClassGenerator.prototype.generateClassFileDefinition = function (xsd, pluralPostFix, verbose) {
        var _this = this;
        if (pluralPostFix === void 0) { pluralPostFix = 's'; }
        this.fileDef = ts_code_generator_1.createFile({ classes: [] });
        var xmlDoc = parse(xsd);
        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;
        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        //this.log(JSON.stringify(xmlDoc, null, ' '));
        this.log('-------------------------------------------------------------------------------------');
        if (xmlDoc.root) {
            this.traverse(xmlDoc.root);
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
    ClassGenerator.prototype.traverse = function (node, parentClassDef, parent) {
        var _this = this;
        //console.log(node.name);
        var classDef = parentClassDef;
        var stopDescent = false;
        var fileDef = this.fileDef;
        switch (node.name) {
            case XS_GROUP:
                if (node.attributes && node.attributes.ref) {
                    classDef.addProperty({
                        name: 'group_' + node.attributes.ref,
                        type: 'group_' + node.attributes.ref,
                        scope: "protected"
                    });
                    break;
                }
            case XS_COMPLEX_TYPE:
                if (node.attributes && node.attributes.name) {
                    var className = node.attributes.name;
                    var isAbstract = !!node.attributes.abstract;
                    if (node.name === XS_GROUP) {
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
                if (parent && parent.name === XS_SCHEMA) {
                    var simpleType = "export type " + node.attributes.name + " ";
                    var child_1 = node.children[0];
                    var options_1 = [];
                    if (child_1 && child_1.attributes) {
                        this.log('  export typ: ' + simpleType);
                        if (child_1.name === XS_RESTRICTION) {
                            this.log('  restriction: ' + simpleType);
                            child_1.children.filter(function (c) { return c.name === XS_ENUM; }).forEach(function (c) {
                                options_1.push("\"" + c.attributes.value + "\"");
                            });
                        }
                    }
                    if (options_1.length === 0) {
                        options_1.push(this.getFieldType(child_1.attributes.base));
                    }
                    //convert to typedef statement
                    this.types.push(simpleType + '= ' + options_1.join(' | ') + ';');
                }
                break;
            case XS_EXTENSION:
                var base = node.attributes.base;
                this.log('  base: ' + base);
                classDef.addExtends(base);
                break;
            case XS_ELEMENT:
                var childNr = 0;
                var fldName = node.attributes.name;
                var fldType = node.attributes.type;
                var child = node.children[0];
                var skipField = false;
                var arrayPostfix = '';
                if (node.attributes.minOccurs === "0") {
                    fldName += "?";
                }
                while (child && child.name === XS_ANNOTATION) {
                    child = node.children[childNr++];
                }
                if (!child && node.attributes.maxOccurs === UNBOUNDED) {
                    arrayPostfix = '[]';
                    fldType = this.getFieldType(node.attributes.type);
                    fldName = node.attributes.name + this.pluralPostFix;
                    this.log('unbound; ' + node.attributes.name + ' ' + fldType + arrayPostfix);
                }
                if (child && child.name === XS_SIMPLE_TYPE) {
                    fldType = XS_STRING;
                }
                //check if there is a complextype defined within the element
                //and retrieve the element type in this element
                if (child && child.name === XS_COMPLEX_TYPE) {
                    child = child.children[0];
                    if (child && child.name === XS_SEQUENCE) {
                        child = child.children[0];
                        if (child && child.name === XS_ELEMENT && child.attributes) {
                            this.log('nested typedef: ' + fldType);
                            if (child.attributes.maxOccurs === UNBOUNDED) {
                                arrayPostfix = "[]";
                                fldType = child.attributes.type;
                            }
                            else {
                                fldType = fldName[0].toUpperCase() + fldName.substring(1).replace("?", "");
                                fileDef.addClass({ name: fldType }).addProperty({
                                    name: child.attributes.name,
                                    type: this.getFieldType(child.attributes.type),
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
                    // let fieldNamePostFix = (arrayPostfix === '[]' && fldType === XS_STRING) ? this.pluralPostFix : '';
                    // console.log('  field: ' + fldName + ' '+ arrayPostfix + ' '+ fldType);
                    // if (arrayPostfix === '[]' && fldType === XS_STRING) {
                    //     //console.log('  field: ', fldName, '['+ fldType + ']', arrayPostfix, this.pluralPostFix);
                    //     console.log('  field: ', fldName, '  fieldNamePostFix: ', fieldNamePostFix);
                    // }
                    classDef.addProperty({
                        name: fldName,
                        type: this.getFieldType(fldType) + arrayPostfix,
                        scope: "protected"
                    });
                }
                break;
        }
        if (!stopDescent) {
            node.children.forEach(function (child) { return _this.traverse(child, classDef, node); });
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
