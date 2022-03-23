const fs = require('fs');
const nameArr = fs.readdirSync('files/documents');

console.group('File sizes:');
console.log();

for (let folder of nameArr) {
   let stats = fs.statSync(`files/documents/${folder}/converted.json`);

   console.group(folder);
   console.log('%o KB (%d B)', Math.floor(stats.size / 1000), stats.size);
   console.groupEnd();
}

console.groupEnd();
