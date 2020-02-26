"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var ts_code_generator_1 = require("ts-code-generator");
var xmldom_reborn_1 = require("xmldom-reborn");
var parsing_1 = require("./parsing");
var xml_utils_1 = require("./xml-utils");
var xsd_grammar_1 = require("./xsd-grammar");
var XMLNS = 'xmlns';
var definedTypes;
var COLON = ":";
var GROUP_PREFIX = 'group_';
var XSD_NS = "http://www.w3.org/2001/XMLSchema";
var CLASS_PREFIX = ".";
var defaultSchemaName = 'Schema';
var groups = {};
var ns2modMap = {};
var namespaces = { default: "", xsd: "xs" };
function capfirst(s) {
    if (s === void 0) { s = ""; }
    var _a, _b;
    return ((_a = s[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) + ((_b = s) === null || _b === void 0 ? void 0 : _b.substring(1));
}
function lowfirst(s) {
    if (s === void 0) { s = ""; }
    var _a, _b;
    return ((_a = s[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) + ((_b = s) === null || _b === void 0 ? void 0 : _b.substring(1));
}
function choiceBody(m, names) {
    var name = m.attr.ref || m.attr.fieldName;
    var result = names.filter(function (n) { return n !== name; }).map(function (n) { return "delete((this as any)." + n + ");"; }).join('\n');
    return result + ("\n(this as any)." + name + " = arg;\n");
}
function addNewImport(fileDef, ns) {
    if (fileDef.imports.filter(function (i) { return i.starImportName === ns; }).length === 0) {
        fileDef.addImport({ moduleSpecifier: ns2modMap[ns], starImportName: ns });
    }
}
function addClassForASTNode(fileDef, astNode, indent) {
    if (indent === void 0) { indent = ''; }
    var _a, _b, _c;
    var c = fileDef.addClass({ name: capfirst(astNode.name) });
    if (astNode.nodeType === 'Group') {
        c.isAbstract = true;
        // astNode.fields = astNode.list || [];
    }
    if ((_a = astNode.attr) === null || _a === void 0 ? void 0 : _a.base) {
        c.addExtends(capfirst(astNode.attr.base));
    }
    xml_utils_1.log(indent + 'created: ', astNode.name, ', fields: ', (_c = (_b = astNode) === null || _b === void 0 ? void 0 : _b.children) === null || _c === void 0 ? void 0 : _c.length);
    var fields = (astNode.children || []).filter(function (f) { return f; });
    fields.filter(function (f) { return f.nodeType === "Fields"; }).forEach(function (f) {
        xml_utils_1.log(indent + 'adding named fields:', f.name);
        //fields = fields.concat(groups[f.attr.ref].children);
        c.addExtends(capfirst(f.attr.ref));
    });
    fields.filter(function (f) { return f.nodeType === "Reference"; }).forEach(function (f) {
        var _a;
        xml_utils_1.log(indent + 'adding fields for Reference: ', f.attr.ref);
        var typePostFix = (f.attr.array) ? "[]" : "";
        var namePostFix = (f.attr.array) ? "?" : "";
        var _b = (/:/.test(f.attr.ref)) ? (_a = f.attr.ref) === null || _a === void 0 ? void 0 : _a.split(':') : [null, f.attr.ref], ns = _b[0], localName = _b[1];
        var refName = localName + namePostFix;
        var refType = ((ns) ? ns + '.' : '') + capfirst(localName + typePostFix);
        c.addProperty({ name: refName, type: refType, scope: "protected" });
    });
    fields.filter(function (f) { return f.nodeType === "choice"; }).forEach(function (f) {
        var _a, _b;
        var names = (_a = f.children) === null || _a === void 0 ? void 0 : _a.map(function (i) { return i.attr.fieldName || i.attr.ref; });
        xml_utils_1.log(indent + 'adding methods for choice', names.join(','));
        (_b = f.children) === null || _b === void 0 ? void 0 : _b.forEach(function (m) {
            var method = c.addMethod({ name: m.attr.fieldName || m.attr.ref, returnType: 'void', scope: 'protected' });
            method.addParameter({ name: 'arg', type: m.attr.fieldType || capfirst(m.attr.ref) });
            method.onWriteFunctionBody = function (w) { w.write(choiceBody(m, names)); };
            // log('create class for:' ,m.ref, groups);
        });
        xml_utils_1.log(indent + 'added methods', c.methods.map(function (m) { return m.name; }).join(','));
    });
    fields.filter(function (f) { return f.nodeType === "Field"; }).forEach(function (f) {
        xml_utils_1.log(indent + 'adding field:', { name: f.attr.fieldName, type: f.attr.fieldType });
        var xmlns = "";
        var fldType = f.attr.fieldType;
        var typeParts = f.attr.fieldType.split('.');
        if (typeParts.length === 2) {
            xmlns = typeParts[0];
            //fldType = typeParts[1];
            addNewImport(fileDef, xmlns);
        }
        // whenever the default namespace (xmlns) is defined and not the xsd namspace
        // the types without namsespace must be imported and thus prefixed with a ts namespace
        //
        var undefinedType = definedTypes.indexOf(fldType) < 0;
        xml_utils_1.log('defined: ', fldType, undefinedType);
        if (undefinedType && namespaces.default && namespaces.default !== XSD_NS) {
            fldType = parsing_1.getFieldType(f.attr.type, XMLNS);
        }
        c.addProperty({ name: f.attr.fieldName, type: fldType, scope: "protected" });
        xml_utils_1.log(indent + 'nested class', f.attr.fieldName, JSON.stringify(f.attr.nestedClass));
        if (f.attr.nestedClass) {
            addClassForASTNode(fileDef, f.attr.nestedClass, indent + ' ');
        }
    });
}
var ClassGenerator = /** @class */ (function () {
    function ClassGenerator(depMap, classPrefix) {
        if (classPrefix === void 0) { classPrefix = CLASS_PREFIX; }
        this.classPrefix = classPrefix;
        this.types = [];
        this.schemaName = "schema";
        this.xmlnsName = "xmlns";
        this.fileDef = ts_code_generator_1.createFile({ classes: [] });
        this.verbose = false;
        this.pluralPostFix = 's';
        this.importMap = [];
        this.dependencies = depMap || {};
        Object.assign(ns2modMap, depMap);
        xml_utils_1.log(JSON.stringify(this.dependencies));
    }
    ClassGenerator.prototype.generateClassFileDefinition = function (xsd, pluralPostFix, verbose) {
        if (pluralPostFix === void 0) { pluralPostFix = 's'; }
        var _a, _b;
        var fileDef = ts_code_generator_1.createFile();
        this.verbose = verbose;
        this.pluralPostFix = pluralPostFix;
        this.log('--------------------generating classFile definition for----------------------------------');
        this.log('');
        this.log(xsd);
        this.log('');
        this.log('-------------------------------------------------------------------------------------');
        if (!xsd) {
            return fileDef;
        }
        var ast = this.parseXsd(xsd);
        if (!ast) {
            return fileDef;
        }
        XMLNS = this.xmlnsName;
        var xsdNsAttr = Object.keys(ast.attr || []).filter(function (n) { return ast.attr[n] === XSD_NS; }).shift();
        var xsdNs = xsdNsAttr.replace(/^\w+:/, '');
        var defNs = ast.attr.xmlns;
        xml_utils_1.log('xsd namespace:', xsdNs);
        xml_utils_1.log('def namespace:', defNs);
        //store namspaces
        namespaces.xsd = xsdNs;
        namespaces.default = defNs;
        if (defNs && (defNs !== XSD_NS))
            addNewImport(fileDef, XMLNS);
        Object.keys(groups).forEach(function (key) { return delete (groups[key]); });
        xml_utils_1.log('AST:\n', JSON.stringify(ast, null, 3));
        // create schema class
        var schemaClass = ts_code_generator_1.createFile().addClass({ name: capfirst(((_a = ast) === null || _a === void 0 ? void 0 : _a.name) || defaultSchemaName) });
        var children = ((_b = ast) === null || _b === void 0 ? void 0 : _b.children) || [];
        definedTypes = children.map(function (c) { return c.name; });
        xml_utils_1.log('definedTypes: ', JSON.stringify(definedTypes));
        children
            .filter(function (t) { return t.nodeType === 'AliasType'; })
            .forEach(function (t) {
            xml_utils_1.log('alias type: ', t.attr.type);
            var typeAlias = fileDef.addTypeAlias({ name: capfirst(t.name), type: parsing_1.getFieldType(t.attr.type, defNs), isExported: true });
            schemaClass.addProperty({ name: lowfirst(t.name), type: capfirst(t.name) });
        });
        fileDef.classes.push(schemaClass);
        children
            .filter(function (t) { return t.nodeType === 'Group'; })
            .forEach(function (t) {
            groups[t.name] = t;
            xml_utils_1.log('storing group:', t.name);
            addClassForASTNode(fileDef, t);
        });
        children
            .filter(function (t) { return t.nodeType === 'Class'; })
            .forEach(function (t) {
            addClassForASTNode(fileDef, t);
            schemaClass.addProperty({ name: lowfirst(t.name), type: t.name });
        });
        children
            .filter(function (t) { return t.nodeType === 'Enumeration'; })
            .forEach(function (t) {
            var enumDef = fileDef.addEnum({ name: t.name });
            t.attr.values.forEach(function (m) { enumDef.addMember({ name: m.attr.value, value: "\"" + m.attr.value + "\"" }); });
            schemaClass.addProperty({ name: lowfirst(t.name), type: t.name });
        });
        var tmp = this.makeSortedFileDefinition(fileDef.classes);
        fileDef.classes = tmp.classes;
        return fileDef;
    };
    // private nsResolver(ns: string): void {
    //     log('nsResolver', ns);
    //     this.importMap[ns] = this.dependencies[ns] || "ns";
    //     log('nsResolver', ns, this.importMap);
    // }
    ClassGenerator.prototype.findAttrValue = function (node, attrName) {
        var _a, _b, _c;
        return (_c = (_b = (_a = node) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.getNamedItem(attrName)) === null || _c === void 0 ? void 0 : _c.value;
    };
    ClassGenerator.prototype.nodeName = function (node) {
        return this.findAttrValue(node, 'name');
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
    ClassGenerator.prototype.parseXsd = function (xsd) {
        var _a;
        var xsdGrammar = new xsd_grammar_1.XsdGrammar(this.schemaName);
        var xmlDom = new xmldom_reborn_1.DOMParser().parseFromString(xsd, 'application/xml');
        var xmlNode = (_a = xmlDom) === null || _a === void 0 ? void 0 : _a.documentElement;
        return xsdGrammar.parse(xmlNode);
    };
    ClassGenerator.prototype.log = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (this.verbose) {
            console.log.apply(console, [message].concat(optionalParams));
        }
    };
    ClassGenerator.prototype.makeSortedFileDefinition = function (sortedClasses) {
        var _this = this;
        //  console.log('makeSortedFileDefinition ');
        var outFile = ts_code_generator_1.createFile({ classes: [] });
        //outFile.addImport({moduleSpecifier: "mod", starImportName: "nspce"});
        for (var ns in this.importMap) {
            xml_utils_1.log('ns ', ns, this.importMap[ns]);
            outFile.addImport({ moduleSpecifier: this.importMap[ns], starImportName: ns });
        }
        var depth = 0;
        var max_depth = 1;
        // console.log('max_depth ',max_depth);
        while (depth <= max_depth) {
            // console.log('depth ');
            sortedClasses.forEach(function (c) {
                var hDepth = _this.findHierachyDepth(c, _this.fileDef);
                if (hDepth > max_depth) {
                    max_depth = hDepth;
                }
                _this.log(c.name + '\t' + hDepth);
                if (hDepth === depth) {
                    if (c.name.indexOf(GROUP_PREFIX) === 0) {
                        // return;
                    }
                    outFile.addClass({ name: c.name });
                    var classDef_1 = outFile.getClass(c.name);
                    classDef_1.methods = c.methods;
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
                        writer.write("this[\"@class\"] = \"" + _this.classPrefix + c.name + "\";\n");
                        writer.write('(<any>Object).assign(this, <any> props);');
                    };
                }
            });
            // console.log('depth:', depth);
            depth++;
        }
        xml_utils_1.log('ready');
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
            defaultExpression: (prop.defaultExpression) ? prop.defaultExpression.text : null,
            name: prop.name,
            scope: "protected",
            type: prop.type.text,
        });
    };
    ClassGenerator.prototype.findHierachyDepth = function (c, f) {
        var _a, _b;
        var result = 0;
        var superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        while (superClassName) {
            result++;
            c = f.getClass(superClassName);
            superClassName = (_b = (_a = c) === null || _a === void 0 ? void 0 : _a.extendsTypes[0]) === null || _b === void 0 ? void 0 : _b.text;
        }
        return result;
    };
    return ClassGenerator;
}());
exports.ClassGenerator = ClassGenerator;
