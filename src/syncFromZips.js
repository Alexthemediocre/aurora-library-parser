const fs = require('fs');
const child_process = require('child_process');

const nameArr = [
   "Higher Beings",
   "Magic and Souls",
   "Miscellaneous",
   "Places",
   "Primary Characters",
   "Secondary Characters",
   "Species",
   "Tertiary Characters"
];

let zipFolder = 'ZipFiles';

nameArr.forEach(v => {
   let docPath = `files/documents/${v}`;
   let zipPath = `files/${zipFolder}/${v}.zip`;
   if (!fs.existsSync(zipPath)) {
      console.log(process.cwd());
      console.log(zipPath);
      return;
   }

   if (!fs.existsSync(docPath)) fs.mkdirSync(docPath);

   let imagesPath = `${docPath}/images`;
   if (fs.existsSync(imagesPath)) {
      fs.readdirSync(imagesPath).forEach(img => fs.rmSync(`${imagesPath}/${img}`));
   }

   child_process.execFileSync('tar', ['-xf', `../../../${zipPath}`], {cwd: docPath});
});