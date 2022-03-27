const fs = require('fs');

const [, , ...args] = process.argv;
const opts = {
   help: false,
   setAllTrue: false,
   clearZips: false,
   clearDocs: false,
   clearJson: false,
   clearImages: false
};

const filesDir = 'files';
const zipDir = `${filesDir}/ZipFiles`;
const docDir = `${filesDir}/documents`;

let anyChosen = false;
for (let val of args) { // map arguments to options
   let thisOptValid = true;
   switch (val) {
      case 'help':
      case '-h':
      case '--help':
         opts.help = true;
         break;
      case '-a':
      case '--all':
         opts.setAllTrue = true;
         break;
      case '-z':
      case '--zips':
         opts.clearZips = true;
         break;
      case '-d':
      case '--docs':
         opts.clearDocs = true;
         break;
      case '-j':
      case '--json':
         opts.clearJson = true;
         break;
      case '-i':
      case '--imgs':
      case '--images':
         opts.clearImages = true;
         break;
      
      default:
         thisOptValid = false;
         break;
   }

   anyChosen ||= thisOptValid;
}
if (!anyChosen) opts.help = true;

if (opts.help) {
   console.log('Removes generated, extracted, and downloaded files.');
   console.group('Command line options:');

   console.log('[help|-h|--help]\n   Views help.');
   console.log('[-a|--all]\n   Sets all options (other than --help) to true.');
   console.log('[-z|--zips]\n   Clears zip files.');
   console.log('[-d|--docs]\n   Clears document (HTML) files. Ignores JSON files and images.');
   console.log('[-i|--imgs|--images]\n   Clears images. Leaves HTML and JSON files alone.');
   console.log('[-j|--json]\n   Clears generated JSON files. Leaves other document files alone.');

   console.groupEnd();
   process.exit(0);
}

if (opts.setAllTrue) opts.clearZips = opts.clearImages = opts.clearDocs = opts.clearJson = true;

if (opts.clearZips && fs.existsSync(zipDir)) fs.rmSync(zipDir, {recursive: true});

if ((opts.clearDocs || opts.clearJson || opts.clearImages) && fs.existsSync(docDir)) {
   for (let folder of fs.readdirSync(docDir)) {
      let dirPath = `${docDir}/${folder}`;
      if (opts.clearDocs && opts.clearJson && opts.clearImages) { // to make it easy, remove the entire folder
         fs.rmSync(dirPath, {recursive: true});
         continue;
      }

      for (let name of fs.readdirSync(dirPath)) {
         if (opts.clearJson && name.endsWith('.json') || opts.clearDocs && name.endsWith('.html')) {
            fs.rmSync(`${dirPath}/${name}`);
         }
         else if (opts.clearImages && name === 'images') fs.rmSync(`${dirPath}/${name}`, {recursive: true});
      }
   }
}
