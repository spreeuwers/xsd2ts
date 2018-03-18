# xsd2ts
converting an xsd to typscript template classes

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
    "typescript": "2.6.1",
    "xsd2ts": "0.0.8"
  }
}

````

Replace the value template-ts for the name property 
by your own package name. 
Create a src folder inside this projct folder
Create a typescript file in this folder with following content:

````
import {generateTemplateClassesFromXSD} from "xsd2ts";
generateTemplateClassesFromXSD('./yourXsdFile.xsd');
````
Generate a folder 'generated' with index.ts file by executing:
    
    npm run ts-gen
  
Compile the index.ts file and generate declaration file by executing:
    
    npm run makelib 
    
Then publish you npm package:
  
    npm publish

Now you can use the npm lib in other npm projects by installing it:

    npm install --save <your npm package name>