# xsd2ts
Tool for converting xsd files to typescript template classes


#tutorial:

Create an npm project(folder) with a package.json file with content:
````
{
  "name": "template-ts",
  "version": "0.1.0",
  "description": "generated template classes for xsd",
  "main": "index.js",
  "scripts": {
    "ts-gen": "ts-node ./src/generate.ts",
    "makelib": "tsc -p ./src/generated",
    "setup": "npm install"
  },
  "repository": {
    "type": "github",
    "url": "https://github.com/path/to/repo.git"
  },
  "author": "your name",
  "license": "GPL",
  "dependencies": {
    "ts-loader": "2.2.2",
    "ts-node": "3.3.0",
    "typescript": "3.9.9",
    "xsd2ts": "0.3.8"
  }
}

````

Replace the value 'template-ts' for the name property 
by your own package name. 
Create a src folder inside this project folder.
Create a typescript file named 'generate.ts' in this folder 
and add the following content:

````
import {generateTemplateClassesFromXSD} from "xsd2ts";
generateTemplateClassesFromXSD('./yourXsdFile.xsd');

````
When dependencies must be included you can specify these as follows:
````
import {generateTemplateClassesFromXSD} from "xsd2ts";
generateTemplateClassesFromXSD('./dependency.xsd'); 
generateTemplateClassesFromXSD('./yourXsdFile.xsd', {libname, './dependency'});
````
The libname should equal the namespace for this dependency to generate the right import statements


You can specify a dependency for the default namespace with the third parameter
when you omit this parameter it will deault to the name "xmlns"
````
import {generateTemplateClassesFromXSD} from "xsd2ts";
generateTemplateClassesFromXSD('./dependency.xsd'); 
generateTemplateClassesFromXSD('./yourXsdFile.xsd', {defaultns, './dependency'},defaultns);
````
Extra logging can be turned on by calling verbose() 
 
 ````
 import {generateTemplateClassesFromXSD,verbose} from "xsd2ts";
 verbose();
 generateTemplateClassesFromXSD('./dependency.xsd');
  
 ````

Generate a folder 'src/generated' with index.ts file by executing:
    
    npm run ts-gen
  
Compile the generated index.ts file and generate declaration file by executing:
    
    npm run makelib 
    
Then publish your npm package:
  
    npm publish

Now you can use the npm lib in other npm projects by installing it:

    npm install --save <your npm package name>


Remark: There was an error in version 3.1: it did not emit an index.ts
