"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassGenerator = void 0;
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
var ts_code_generator_1 = require("ts-code-generator");
var xmldom_reborn_1 = require("xmldom-reborn");
var parsing_1 = require("./parsing");
var xml_utils_1 = require("./xml-utils");
var regexp2aliasType_1 = require("./regexp2aliasType");
var xsd_grammar_1 = require("./xsd-grammar");
var XMLNS = 'xmlns';
var definedTypes;
var GROUP_PREFIX = 'group_';
var XSD_NS = "http://www.w3.org/2001/XMLSchema";
var CLASS_PREFIX = ".";
var defaultSchemaName = 'Schema';
var groups = {};
var ns2modMap = {};
var primitive = /(string|number)/i;
var namespaces = { default: "", xsd: "xs" };
var targetNamespace = 's1';
function a2z(p) {
    return (p.toLowerCase() == p) ? regexp2aliasType_1.A2Z.toLowerCase() : regexp2aliasType_1.A2Z;
}
function capfirst(s) {
    var _a;
    if (s === void 0) { s = ""; }
    return ((_a = s[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) + (s === null || s === void 0 ? void 0 : s.substring(1));
}
function lowfirst(s) {
    var _a;
    if (s === void 0) { s = ""; }
    return ((_a = s[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) + (s === null || s === void 0 ? void 0 : s.substring(1));
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
    var _a, _b;
    if (indent === void 0) { indent = ''; }
    var c = fileDef.addClass({ name: capfirst(astNode.name) });
    if (astNode.nodeType === 'Group') {
        c.isAbstract = true;
        // astNode.fields = astNode.list || [];
    }
    if ((_a = astNode.attr) === null || _a === void 0 ? void 0 : _a.base) {
        var superClass = '';
        var _c = astNode.attr.base.split(':'), ns = _c[0], qname = _c[1];
        if (ns === targetNamespace) {
            superClass = capfirst(qname);
        }
        else if (qname) {
            superClass = ns.toLowerCase() + '.' + capfirst(qname);
        }
        else {
            superClass = capfirst(ns);
        }
        c.addExtends(superClass);
    }
    xml_utils_1.log(indent + 'created: ', astNode.name, ', fields: ', (_b = astNode === null || astNode === void 0 ? void 0 : astNode.children) === null || _b === void 0 ? void 0 : _b.length);
    var fields = (astNode.children || []).filter(function (f) { return f; });
    fields.filter(function (f) { return f.nodeType === "Fields"; }).forEach(function (f) {
        xml_utils_1.log(indent + 'adding named fields:', f.name);
        var superClass = '';
        if (f.attr.ref.indexOf(':') >= 0) {
            var _a = f.attr.ref.split(':'), ns = _a[0], qname = _a[1];
            xml_utils_1.log(indent + 'split ns, qname: ', ns, qname);
            if (ns === targetNamespace) {
                superClass = capfirst(qname);
            }
            else {
                superClass = ns.toLowerCase() + '.' + capfirst(qname);
                addNewImport(fileDef, ns);
            }
        }
        else {
            superClass = capfirst(f.attr.ref);
        }
        c.addExtends(superClass);
    });
    fields.filter(function (f) { return f.nodeType === "Reference"; }).forEach(function (f) {
        var _a;
        xml_utils_1.log(indent + 'adding fields for Reference: ', f.attr.ref);
        var typePostFix = (f.attr.array) ? "[]" : "";
        var namePostFix = (f.attr.array) ? "?" : "";
        var _b = (/:/.test(f.attr.ref)) ? (_a = f.attr.ref) === null || _a === void 0 ? void 0 : _a.split(':') : [null, f.attr.ref], ns = _b[0], localName = _b[1];
        var refName = localName + namePostFix;
        var refType = '';
        if (ns === targetNamespace) {
            refType = capfirst(localName + typePostFix);
        }
        else {
            refType = ((ns) ? ns + '.' : '') + capfirst(localName + typePostFix);
        }
        c.addProperty({ name: refName, type: refType, scope: "protected" });
    });
    fields.filter(function (f) { return f.nodeType === "choice"; }).forEach(function (f) {
        var _a, _b;
        var names = (_a = f.children) === null || _a === void 0 ? void 0 : _a.map(function (i) { return i.attr.fieldName || i.attr.ref; });
        xml_utils_1.log(indent + 'adding methods for choice', names.join(','));
        (_b = f.children) === null || _b === void 0 ? void 0 : _b.forEach(function (m) {
            var methodName = m.attr.fieldName || m.attr.ref;
            var method = c.addMethod({ name: methodName, returnType: 'void', scope: 'protected' });
            method.addParameter({ name: 'arg', type: m.attr.fieldType || capfirst(m.attr.ref) });
            method.onWriteFunctionBody = function (w) { w.write(choiceBody(m, names)); };
            method.onBeforeWrite = function (w) { return w.write('//choice\n'); };
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
            fldType = typeParts[1];
            if (xmlns !== targetNamespace) {
                addNewImport(fileDef, xmlns);
            }
        }
        // whenever the default namespace (xmlns) is defined and not the xsd namespace
        // the types without namespace must be imported and thus prefixed with a ts namespace
        //
        var undefinedType = definedTypes.indexOf(fldType) < 0;
        xml_utils_1.log('defined: ', fldType, undefinedType);
        if (undefinedType && namespaces.default && namespaces.default !== XSD_NS && 'xmlns' !== targetNamespace) {
            fldType = parsing_1.getFieldType(f.attr.type, ('xmlns' != targetNamespace) ? XMLNS : null);
        }
        c.addProperty({ name: f.attr.fieldName, type: fldType, scope: "protected" });
        xml_utils_1.log(indent + 'nested class', f.attr.fieldName, JSON.stringify(f.attr.nestedClass));
        if (f.attr.nestedClass) {
            addClassForASTNode(fileDef, f.attr.nestedClass, indent + ' ');
        }
    });
    return c;
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
        this.targetNamespace = 's1';
        this.dependencies = depMap || {};
        Object.assign(ns2modMap, depMap);
        xml_utils_1.log(JSON.stringify(this.dependencies));
    }
    ClassGenerator.prototype.generateClassFileDefinition = function (xsd, pluralPostFix, verbose) {
        if (pluralPostFix === void 0) { pluralPostFix = 's'; }
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
        targetNamespace = Object.keys(ast.attr || []).filter(function (n) { return ast.attr[n] === ast.attr.targetNamespace && (n != "targetNamespace"); }).shift();
        targetNamespace = targetNamespace === null || targetNamespace === void 0 ? void 0 : targetNamespace.replace(/^\w+:/, '');
        xml_utils_1.log('xsd namespace:', xsdNs);
        xml_utils_1.log('def namespace:', defNs);
        xml_utils_1.log('xsd targetnamespace:', targetNamespace);
        var typeAliases = {};
        //store namespaces
        namespaces.xsd = xsdNs;
        namespaces.default = defNs;
        if (defNs && (defNs !== XSD_NS))
            addNewImport(fileDef, XMLNS);
        Object.keys(groups).forEach(function (key) { return delete (groups[key]); });
        xml_utils_1.log('AST:\n', JSON.stringify(ast, null, 3));
        // create schema class
        var schemaClass = ts_code_generator_1.createFile().addClass({ name: capfirst((ast === null || ast === void 0 ? void 0 : ast.name) || defaultSchemaName) });
        var children = (ast === null || ast === void 0 ? void 0 : ast.children) || [];
        definedTypes = children.map(function (c) { return c.name; });
        xml_utils_1.log('definedTypes: ', JSON.stringify(definedTypes));
        children
            .filter(function (t) { return t.nodeType === 'AliasType'; })
            .forEach(function (t) {
            var aliasType = parsing_1.getFieldType(t.attr.type, null);
            xml_utils_1.log('alias type: ', t.name, ': ', t.attr.type, '->', aliasType, '\tattribs:', t.attr);
            if (t.attr.pattern) {
                //try to translate regexp pattern to type aliases as far as possible
                aliasType = regexp2aliasType_1.regexpPattern2typeAlias(t.attr.pattern, aliasType, t.attr);
            }
            if (t.attr.minInclusive && t.attr.maxInclusive) {
                var x1 = parseInt(t.attr.minInclusive);
                var x2 = parseInt(t.attr.maxInclusive);
                var nrs = [];
                if ((x2 - x1) < 100) {
                    for (var n = x1; n <= x2; n++) {
                        nrs.push(n);
                    }
                    aliasType = nrs.join('|');
                }
            }
            var _a = aliasType.split('.'), ns = _a[0], localName = _a[1];
            if (targetNamespace === ns && t.name === localName) {
                xml_utils_1.log('skipping alias:', aliasType);
            }
            else {
                if (ns === targetNamespace) {
                    aliasType = capfirst(localName);
                }
                //skip circular refs
                xml_utils_1.log('circular refs:', aliasType, t.name.toLowerCase() === aliasType.toLowerCase());
                if (t.name.toLowerCase() !== aliasType.toLowerCase()) {
                    if (primitive.test(aliasType)) {
                        aliasType = aliasType.toLowerCase();
                    }
                    //fileDef.addTypeAlias({name: capfirst(t.name), type: aliasType, isExported: true});
                    typeAliases[capfirst(t.name)] = aliasType;
                    //only add elements to scheme class
                }
            }
            if (t.attr.element) {
                schemaClass.addProperty({ name: lowfirst(t.name), type: capfirst(t.name) });
            }
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
            var c = addClassForASTNode(fileDef, t);
            if (t.attr.element) {
                //when th class represents an array en is a top level element then
                //add the class as field to the schemas class and remove the classdef
                if (c.properties.length === 1 && c.properties[0].type.text.indexOf('[]') > 0) {
                    schemaClass.addProperty({ name: lowfirst(t.name), type: c.properties[0].type.text });
                    fileDef.classes = fileDef.classes.filter(function (x) { return x !== c; });
                }
                else {
                    schemaClass.addProperty({ name: lowfirst(t.name), type: capfirst(t.name) });
                }
            }
        });
        children
            .filter(function (t) { return t.nodeType === 'Enumeration'; })
            .forEach(function (t) {
            var enumDef = fileDef.addEnum({ name: xml_utils_1.capFirst(t.name) });
            t.attr.values.forEach(function (m) { enumDef.addMember({ name: m.attr.value, value: "\"" + m.attr.value + "\"" }); });
            if (t.attr.element) {
                schemaClass.addProperty({ name: lowfirst(t.name), type: capfirst(t.name) });
            }
        });
        var tmp = this.makeSortedFileDefinition(fileDef.classes);
        Object.keys(typeAliases).forEach(function (k) {
            fileDef.addTypeAlias({ name: k, type: typeAliases[k], isExported: true });
        });
        fileDef.classes = tmp.classes;
        //const members = fileDef.getMembers();
        //members.forEach(m => fileDef.setOrderOfMember(1, m.));
        return fileDef;
    };
    // private nsResolver(ns: string): void {
    //     log('nsResolver', ns);
    //     this.importMap[ns] = this.dependencies[ns] || "ns";
    //     log('nsResolver', ns, this.importMap);
    // }
    ClassGenerator.prototype.findAttrValue = function (node, attrName) {
        var _a, _b;
        return (_b = (_a = node === null || node === void 0 ? void 0 : node.attributes) === null || _a === void 0 ? void 0 : _a.getNamedItem(attrName)) === null || _b === void 0 ? void 0 : _b.value;
    };
    ClassGenerator.prototype.nodeName = function (node) {
        return this.findAttrValue(node, 'name');
    };
    ClassGenerator.prototype.findChildren = function (node) {
        var result = [];
        var child = node === null || node === void 0 ? void 0 : node.firstChild;
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
        var xsdGrammar = new xsd_grammar_1.XsdGrammar(this.schemaName);
        var xmlDom = new xmldom_reborn_1.DOMParser().parseFromString(xsd, 'application/xml');
        var xmlNode = xmlDom === null || xmlDom === void 0 ? void 0 : xmlDom.documentElement;
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
        var _a;
        var result = 0;
        var superClassName = (c.extendsTypes[0]) ? c.extendsTypes[0].text : '';
        while (superClassName) {
            result++;
            c = f.getClass(superClassName);
            superClassName = (_a = c === null || c === void 0 ? void 0 : c.extendsTypes[0]) === null || _a === void 0 ? void 0 : _a.text;
        }
        return result;
    };
    return ClassGenerator;
}());
exports.ClassGenerator = ClassGenerator;
