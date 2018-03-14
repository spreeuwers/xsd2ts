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
    private nsResolver(ns);
    constructor(dependencies?: Map<string, string>, class_prefix?: string);
    generateClassFileDefinition(xsd: string, pluralPostFix?: string, verbose?: boolean): FileDefinition;
    private log(msg);
    /**
     * Recusrsive function to retrieve all types from the XSD
     * @param node
     * @param parentClassDef
     * @param parent
     */
    private traverse(node, parentClassDef?, parent?);
    private makeSortedFileDefinition(sortedClasses);
    private addProtectedPropToClass(classDef, prop);
    private findHierachyDepth(c, f);
    private getFieldType(type);
}
