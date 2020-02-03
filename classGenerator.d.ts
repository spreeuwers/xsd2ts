/// <reference types="lodash" />
/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import { FileDefinition } from "ts-code-generator";
export declare class ClassGenerator {
    private classPrefix;
    types: string[];
    schemaName: string;
    xmlnsName: string;
    private fileDef;
    private verbose;
    private pluralPostFix;
    private dependencies;
    private importMap;
    constructor(depMap?: Map<string, string>, classPrefix?: string);
    generateClassFileDefinition(xsd: string, pluralPostFix?: string, verbose?: boolean): FileDefinition;
    private nsResolver;
    private findAttrValue;
    private nodeName;
    private findChildren;
    private findFirstChild;
    private parseXsd;
    private log;
    private makeSortedFileDefinition;
    private addProtectedPropToClass;
    private findHierachyDepth;
}
