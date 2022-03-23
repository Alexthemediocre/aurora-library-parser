const fs = require('fs');
const nameArr = fs.readdirSync('files/documents');
const extractData = require('./breakIntoCategories.js');

nameArr.forEach(v => {
   let data = JSON.stringify(extractData(v), undefined, 3);
   fs.writeFileSync(`files/documents/${v}/converted.json`, data);
});

console.log('done');