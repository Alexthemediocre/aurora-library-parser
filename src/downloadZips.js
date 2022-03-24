const fs = require('fs');
const https = require('https');

/**
 * @type {Map<string, string>}
 */
const docMap = new Map([
   ['Tertiary Characters',  '17LIQ8hvPPuFYUO46B4pdiwqOsTDltCH8_cwcsUljC40'],
   ['Species',              '1taRif_bEUyI6M1kL4i504SEFYsyls77JQ6Z0JifENxA'],
   ['Secondary Characters', '1gYX6PWzAztBS75515kMrU3_X4FJNhkb9wWp43IvY2sU'],
   ['Primary Characters',   '125XoEhA7_XYS5Jde7LSdFoVInQVGGml7gajmQxcZWqA'],
   ['Places',               '10b7z_Yze6GgLmzpGdmPbmKX9R9KZBJ98-u_a6CIryjE'],
   ['Miscellaneous',        '1ec4chRGV2LfoAiOLlKm7sF3PfTNnfOyUN_lalHTGAeg'],
   ['Magic and Souls',      '1xv0yZiQ9t3ngz9xFuaovnmRbvv6n4vWQDJI7htG_ssI'],
   ['Higher Beings',        '1bCDhBGrNKyrGQj7kEky-1hJHjkVFig0cK-6wteg-PfQ']
]);

/**
 * @param {string} writePath The folder that the file should be saved in.
 * @param {string} name The name that the file should be saved as.
 * @param {string} id The id of the document.
 */
function downloadDocument(writePath, name, id) {
   if (!writePath.endsWith('/') && !writePath.endsWith('\\')) writePath += '/';

   https.get(`https://docs.google.com/feeds/download/documents/export/Export?id=${id}&exportFormat=zip`, (res) => {
      let stream = fs.createWriteStream(`${writePath}${name}`);

      if (res.statusCode && res.statusCode.toString().startsWith('3')) {
         if (res.headers.location) https.get(res.headers.location, (res) => res.pipe(stream));
         else {
            console.log(`Trying to get document ${name} (${id}): redirected without a location`);
            stream.destroy();
         }
      }
      else res.pipe(stream);
   });
}

/**
 * 
 * @param {string} writePath The folder that the files should be saved in.
 * @param {number} delay The amount of time to wait before making a new request, in milliseconds.
 */
function saveAllDocuments(writePath, delay = 1000) {
   let iter = docMap.entries();
   let interval = setInterval(() => {
      let res = iter.next();
      if (res.done) {
         clearInterval(interval);
         return;
      }

      downloadDocument(writePath, res.value[0] + '.zip', res.value[1]);
   }, delay);
}

if (!fs.existsSync('files/ZipFiles')) fs.mkdirSync('files/ZipFiles', {recursive: true});
saveAllDocuments('files/ZipFiles');