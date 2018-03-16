# xsd2ts
converting an xsd to typscript template classes

example:

create an npm project with package.json content:

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

create a src folder

create a typescript file in this folder with following content:

import {generateTemplateClassesFromXSD} from "xsd2ts";
generateTemplateClassesFromXSD('./yourXsdFile.xsd');

then:
  run ts-gen script //generates a folder generated with index.ts file
  run makelib script  //compiles the index.ts file and henerates declaration
  run npm publish

Now you can you the npm lib in your project
