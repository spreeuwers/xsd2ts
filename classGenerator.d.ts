/**
 * Created by Eddy Spreeuwers at 11 march 2018
 */
import { FileDefinition } from "ts-code-generator";
export declare class ClassGenerator {
    private fileDef;
    private verbose;
    types: string[];
    generateClassFileDefinition(xsd: string, verbose?: boolean): FileDefinition;
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
