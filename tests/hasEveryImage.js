//@ts-check

const fs = require('fs');

const nameArr = fs.readdirSync('files/documents');
const reg = /(?<=images\/)image(?:\d+)\.(?:png|jpg|gif)/g

/** @type {Map<string, string[]>} */
let fromImgDir = new Map();
/** @type {Map<string, string[]>} */
let extraImages = new Map();

for (let dirName of nameArr) {
   let imageNames = fs.readdirSync(`files/documents/${dirName}/images`);
   let fileText = fs.readFileSync(`files/documents/${dirName}/converted.json`, 'utf-8');
   fromImgDir.set(dirName, imageNames.filter(val => !fileText.includes(val)));

   let foundImages = new Set([...fileText.matchAll(reg)].flat());
   extraImages.set(dirName, [...foundImages.values()].filter(v => !imageNames.includes(v)));
}

console.log("Images on disk that are not part of the file contents:");
console.log([...fromImgDir.entries()]);
console.assert([...fromImgDir.values()].flat().length === 0, "There are 1 or more files on disk that are not a part of the file contents.");

console.log();

console.log("Images parsed from the file that are not on disk:");
console.log([...extraImages.entries()]);
console.assert([...extraImages.values()].flat().length === 0, "There are 1 or more files in the file contents that are not on disk. Check the file contents and the image folders.");
