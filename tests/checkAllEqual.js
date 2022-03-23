const fs = require('fs');

const names = fs.readdirSync('files/documents');
let fileNameExp = /^converted.*\.json$/

names.forEach(folderName => {
   let path = `files/documents/${folderName}/`;
   let fileNamesToCheck = fs.readdirSync(path).filter(s => fileNameExp.test(s));
  
   let [base, ...others] = fileNamesToCheck.map(v => fs.readFileSync(path + v));
   let baseStr = base.toString();

   others.forEach((file, index) => {
      if (baseStr !== file.toString()) {
         console.log(`In folder ${folderName}: file ${fileNamesToCheck[index + 1]} is not equal to file ${fileNamesToCheck[0]}`);
      }
   });
});