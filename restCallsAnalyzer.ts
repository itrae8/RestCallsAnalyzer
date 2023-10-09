//Important mettre "module": "CommonJS" dans tscongif.json
//Exemple call : "npx ts-node ./scripts/restCallsAnalyzer.ts urlEx,urlOi"
import tsFileStruct = require("ts-file-parser");
import Excel = require('exceljs');
import * as path from 'path';

//requires
//const ts = require('typescript');
const fs = require('fs');
const glob = require("glob");

//scipt args
const environments = process.argv[2].split(',');

//models
interface Method {
  file: string;
  method: string;
  methodContent: string;
}

interface MethodByEnv {
  env: string;
  methods: Method[];
}

//functions
var getFiles = function (src: any, callback: any) {
  glob(src + '/**/*service.ts', callback);
};

function getFilesAsync() {
  return new Promise<string[]>((resolve) => {
    getFiles('src', function (err: any, fileNames: string[]) {
      resolve(fileNames.filter(fileName => fileName.includes("service.ts")));
    });
  })
}

async function main() {

  //Récupération de tous les fichiers services du projet
  var serviceFilePaths: string[] = await getFilesAsync();

  var jsonParseResults: tsFileStruct.Module[] = [];

  var methodsByEnvs: MethodByEnv[] = environments.map(env => { return { env: env, methods: [] } });

  serviceFilePaths.forEach(filePath => {

    var decls = fs.readFileSync(filePath).toString();
    // Parse de toutes les classes services
    var jsonStructure: tsFileStruct.Module = tsFileStruct.parseStruct(decls, {}, filePath);

    jsonParseResults.push(jsonStructure);

    methodsByEnvs.forEach((methodsByEnv: MethodByEnv) => {

      jsonStructure.classes[0].methods.forEach((method: tsFileStruct.MethodModel) => {

        // On récupère seulement les méthodes contenant les variables d'environnement recherchées
        if (method.text.includes(methodsByEnv.env)) {
          // Suppression des retours chariots et des espaces quand il y en a plus que 2
          methodsByEnv.methods.push({ file: filePath, method: method.name, methodContent: method.text.replace(/[\n\r]+/g, '').replace(/\s{2,10}/g, ' ') });
        }

      });
    });


  })

  fs.writeFile('./scripts/rawResult.json', JSON.stringify(jsonParseResults), 'utf8', function (err: Error) {
    if (err) throw err;
  });

  fs.writeFile('./scripts/methods.json', JSON.stringify(methodsByEnvs), 'utf8', function (err: Error) {
    if (err) throw err;
  });

  // Excel
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Liste des requête REST par API');

  const columns = [
    { key: 'file', header: 'Fichier' },
    { key: 'method', header: 'Méthode' },
    { key: 'methodContent', header: 'Code' }
  ];

  worksheet.columns = columns;

  methodsByEnvs.forEach((methodsByEnv: MethodByEnv) => {
    worksheet.addRow([methodsByEnv.env]);
    methodsByEnv.methods.forEach(method => {
      worksheet.addRow(method);
    })
  })



  const exportPath = path.resolve(__dirname, 'RequetesRESTParAPI.xlsx');

  await workbook.xlsx.writeFile(exportPath);


}

main();