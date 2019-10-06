/// <reference types="lodash" />
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import { FileDefinition } from "ts-code-generator";
export declare type namespaceResolver = (ns: string) => void;
export declare class ClassGenerator {
    private class_prefix;
    private fileDef;
    private verbose;
    private pluralPostFix;
    private dependencies;
    private importMap;
    types: string[];
    private nsResolver;
    private findAttrValue;
    private nodeName;
    private childName;
    constructor(dependencies?: Map<string, string>, class_prefix?: string);
    generateClassFileDefinition(xsd: string, pluralPostFix?: string, verbose?: boolean): FileDefinition;
    private log;
    /**
     * Recursive function to retrieve all types from the XSD
     * @param node
     * @param parentClassDef
     * @param parent
     */
    private traverse;
    private makeSortedFileDefinition;
    private addProtectedPropToClass;
    private findHierachyDepth;
    private getFieldType;
}
