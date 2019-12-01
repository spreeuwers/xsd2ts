/**
 * Created by eddyspreeuwers on 11/24/19.
 */

import {generateTemplateClassesFromXSD} from "../src/index";


describe("index", () => {
    describe("ClassGenerator simpleClass", () => {
        let xsdFilePath = "test/xsd/element.xsd";
        generateTemplateClassesFromXSD(xsdFilePath);
    })
});

