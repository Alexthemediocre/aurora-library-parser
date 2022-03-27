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
 * @returns {Promise<void>} A promise that resolves once the document has finished being saved to disk.
 */
async function downloadDocument(writePath, name, id) {
   if (!writePath.endsWith('/') && !writePath.endsWith('\\')) writePath += '/';

   return new Promise((resolve, reject) => {
      https.get(`https://docs.google.com/feeds/download/documents/export/Export?id=${id}&exportFormat=zip`, (res) => {
         let stream = fs.createWriteStream(`${writePath}${name}.zip`);

         if (res.statusCode && res.statusCode.toString().startsWith('3')) {
            if (res.headers.location) https.get(res.headers.location, (res) => {
               res.pipe(stream);
               res.on('end', () => resolve());
            });
            else {
               stream.destroy();
               reject(`Trying to get document ${name} (${id}): redirected without a location`);
            }
         }
         else {
            res.pipe(stream);
            res.on('end', () => resolve());
         }
      });
   })
}

/**
 * Returns an iterator of the document name, document ID, and the error encountered, or `undefined`
 * if it was successful.
 * 
 * @param {string} writePath The folder that the files should be saved in.
 * @param {Iterable<[string, string]>} namesToIds An iterable of arrays. The first element of each array is
 * the document name and the second is the ID. An example of this structure is what is returned by `map.entries()`.
 * @param {number} waitTime The amount of time, in milliseconds, to wait between finishing one download and starting another.
 * @returns {AsyncGenerator<[string, string, Error | undefined]>} 
 */
async function* loopDownloads(writePath, namesToIds, waitTime = 1000) {
   for (let arr of namesToIds) {
      /** @type {Error | undefined} */
      let err;
      try {
         await downloadDocument(writePath, arr[0], arr[1]);
      } catch (error) {
         if (error instanceof Error) err = error;
         else error = new Error('Unknown error: ' + JSON.stringify(error));
      }
      yield /** @type {Promise<[string, string, Error | undefined]>} */ (new Promise((res) => {
         setTimeout(() => res([...arr, err]), waitTime);
      }));
   }
}

if (!fs.existsSync('files/ZipFiles')) fs.mkdirSync('files/ZipFiles', {recursive: true});
(async () => {
   for await (let [name, , error] of loopDownloads('files/ZipFiles', docMap.entries())) {
      console.log(`Finished downloading document ${name}. Result:`);
      if (error) console.error(error);
      else console.log('Success');
   }
})();
