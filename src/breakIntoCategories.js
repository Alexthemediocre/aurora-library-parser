const parse5 = require('parse5');
const HTMLNode = require('./HTMLNode');
const fs = require('fs');

const config = {
   boldClassId: ''
};

/**
 * @typedef {{asker: string, query: string, attachments: string[], context?: string}} Question
 * @typedef {{question: Question, answers: string[], subAsks: Ask[], selfReplies: Reply[], index: number}} Ask
 * @typedef {{index: number, content: string}} Reply
 * @typedef {{header: string, questions: Ask[]}} Category
 */

//#region Node utility methods

/**
 * Returns the selector text for the first rule to make text bold.
 * 
 * Can also be found by looking in the text of `head > style` for the
 * regular expression `/(?<=\.)[^.]+?(?=\{font-weight:700\})/`.
 * Would match the `c9` in `.c9{font-weight:700}`.
 * @param {HTMLNode} baseNode The <html> element of the page.
 * @returns {string}
 */
function findBoldSelector(baseNode) {
   let head = baseNode.children.find(v => v.tagName === 'HEAD');
   let style = head?.children.find(v => v.tagName === 'STYLE');

   if (!style) throw new Error('Could not find style element.');

   let selector = style.textContent.match(/(?<=\.)[^.]+?(?=\{font-weight:700\})/)?.[0];
   if (!selector) throw new Error('No bold selector found');
   return selector;
}

/**
 * Returns the indentation depth, as an integer, based off of the number in the class.
 * @param {HTMLNode} elem 
 * @returns {number}
 */
function getDepth(elem) {
   return +(elem.attributes.get('class')?.split(' ')[1]?.split('-').at(-1) ?? NaN) + +(elem.tagName === 'OL');
}

//#endregion Node utility methods

//#region Node converters

/**
 * Returns whether an element is valid to be parsed into a `Question`.
 * @param {HTMLNode} elem 
 * @returns {boolean}
 */
function isQuestion(elem) {
   let children = elem.children;
   //let childElementCount = elem.childElementCount;
   //if (childElementCount !== 1 && childElementCount !== 2) return false;
   if (children.length > 2) return false;

   let child = children[0];
   if (child.tagName !== 'LI') return false;

   let [author, ...others] = child.children;
   if (!author || author.tagName !== 'SPAN') return false;
   if (author.attributes.get('class') !== config.boldClassId) return false;

   /*let joined = others.map(v => stripHTML(v.textContent)).join('');
   if (!joined.startsWith(': ') && !joined.startsWith(':\n')) return false;*/

   let joined = others.reduce((str, v) => {
     if (str.length >= 2) return str;
     return str + stripHTML(v.textContent);
   }, '');
   if (!joined.startsWith(': ') && !joined.startsWith(':\n')) return false;

   return true;
}

/**
 * Parses an element into a `Question`. Can include context.
 * @param {HTMLNode} elem 
 * @returns {Question}
 */
function convertToQuestionObject(elem) {
   // whether there's context segment available or not
   let addContext = false;
   let contextToAdd = "";

   let baseElemChildren = elem.children;
   if (baseElemChildren.length === 2) {
      let e = baseElemChildren[1];
      if (e.tagName === 'LI') {
         addContext = true;
         contextToAdd = formatAndTrim(stripHTML(e.innerHTML));
      }
   }

   let children = baseElemChildren[0].children.filter(v => v.tagName === 'SPAN');

   let contentArr = children.slice(1).flatMap(val => {
      let children = val.children;
      if (children.length && !children.every(v => v.tagName === 'BR')) {
         return children.map(v => v.attributes.get('src') ?? stripHTML(v.innerHTML));
      }
      return stripHTML(val.innerHTML);
   });

   let addColonBackIn = false;
   //if (contentArr[0].match(/^:(?:.|\n)?$/)) {
   if (/^:(?:.|\n)?$/.test(contentArr[0])) {
      addColonBackIn = true;
      contentArr.splice(0, 3 - contentArr[0].length);
   }

   let firstImageIndex = contentArr.length;

   if (contentArr[0]?.startsWith('images/')) {
      let startInd = contentArr.findIndex(s => !s.startsWith('images/'));
      let imgArr = contentArr.splice((startInd < 0 ? startInd : 0), startInd);

      let newInd = contentArr.findIndex(s => s.startsWith('images/'));
      if (newInd < 0) newInd = contentArr.length;
      contentArr.splice(newInd, 0, ...imgArr);
      firstImageIndex = newInd;
   }
   else {
      let ind = contentArr.findIndex(v => v.startsWith('images/'));
      if (ind >= 0) firstImageIndex = ind;
   }

   if (addColonBackIn) {
      firstImageIndex++;
      contentArr.unshift(': ');
   }

   /** @type {Question} */
   let question = {
      asker: formatAndTrim(stripHTML(children[0].innerHTML)),
      query: formatAndTrim(contentArr.slice(0, firstImageIndex).join('').substring(2), true), //remove ": "
      attachments: contentArr.slice(firstImageIndex).map(v => formatAndTrim(v, true))
   };

   if (addContext) question.context = contextToAdd;
   return question;
}

/**
 * Given a `HTMLUListElement` or a `HTMLOListElement`, processes its contents
 * into an array of strings.
 * 
 * Intended to parse answers and self-replies to a question.
 * @param {HTMLNode} elem 
 * @returns {string[]}
 */
function expandAndFormatReplies(elem) {
   let isOrdered = elem.tagName === 'OL';
   let start = +(elem.attributes.get('start') ?? 1);

   return elem.children.flatMap((e, index) => {
      if (e.tagName !== 'LI') return [];

      let childArray = e.children;

      /** @type {HTMLNode[]} */
      let imgArr = [];
      let allImages = childArray.every(v => {
         if (v.tagName !== 'SPAN') return false;

         let firstChild = v.firstChild();
         if (firstChild?.tagName === 'IMG') {
            imgArr.push(firstChild);
            return true;
         }
      });

      if (allImages) {
         return imgArr.map((img, ind) => formatAndTrim(
            img.attributes.get('src') ?? stripHTML(childArray[ind].textContent),
            true
         ));
      }

      let contained = childArray[0];
      if (contained?.tagName !== 'SPAN') return [];

      let img = contained.firstChild();
      if (img?.tagName === 'IMG') {
         return formatAndTrim(img.attributes.get('src') ?? stripHTML(e.innerHTML), true);
      }
      else return formatAndTrim((isOrdered ? `${start + index}. ` : '') + stripHTML(e.innerHTML), true);
   });
}

//#endregion Node converters

//#region String utility methods

/**
 * Escapes the backslash character and the characters in `avoidedChars`
 * to be used in markdown.
 * @param {string} str 
 * @param {string} [avoidedChars=''] Characters to treat as control characters and escape. Should not include '\\', that is already handled.
 * @returns {string}
 */
function formatForMarkdown(str, avoidedChars = '') {
   let buffer = '';

   let escCount = 0;

   for (let c of str) {
      if (avoidedChars.includes(c)) {
         if (escCount % 2 === 0) escCount++;
         buffer += '\\'.repeat(escCount) + c;
         escCount = 0;
         continue;
      }

      if (c === '\\') escCount++;
      else if (escCount) {
         if (escCount % 2 === 0) escCount++;
         buffer += '\\'.repeat(escCount);
         escCount = 0;
      }

      buffer += c;
   }

   return buffer;
}

/**
 * Removes the proxy on links added automatically by Google on the documents
 * @param {string} str 
 * @returns {string}
 */
function stripProxyURL(str) {
   if (!/^https:\/\/(?:www\.)?google\.com/.test(str)) return str;

   if (!str.includes('?')) return str;
   let qParam = str.substring(str.indexOf('?') + 1).split('&').find(s => s.startsWith('q='));
   if (!qParam) return str;

   return decodeURIComponent(qParam.substring(2));
}

/**
 * Formats `<a>` elements into a `[display text](link)` markdown style format,
 * replaces `<br>` elements with `\n` characters, and removes all other HTML tags.
 * It also processes certain HTML entities.
 * @param {string} str 
 * @returns {string}
 */
function stripHTML(str) {
   // format links into `[display text](link)` markdown format
   str = str.replaceAll(/<a.*? href="(?<link>.*?)".*?>(?<text>.*?)<\/a>/g, (...args) => {
      /** @type {{link: string, text: string}} */
      let groups = args[args.length - 1];

      let dispText = formatForMarkdown(groups.text, ']()');
      let linkText = stripProxyURL(formatForMarkdown(groups.link, ')'));
      return `[${dispText}](${linkText})`;
   });

   str = str.replaceAll('<br>', '\n').replaceAll(/<.+?>/g, '');
   //str = str.replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
   str = str.replaceAll(/&(?:nbsp|amp|lt|gt);/g, (s) => {
      switch (s) {
         case '&nbsp;': return ' ';
         case '&amp;': return '&';
         case '&lt;': return '<';
         case '&gt;': return '>';

         default: return '';
      }
   });
   // "[ ](http...)[text](link)" => " [text](link)"
   str = str.replaceAll(/\[( +)\]\(.*?\)(\[.*?\]\(.*?\))/g, '$1$2');
   
   return str;
}

/**
 * Replaces certain characters with their more typical ASCII equivalent and trims newlines if specified.
 * @param {string} str 
 * @param {boolean} [trimNewlines=false] Controls whether to trim a single newline from the start and end of the string.
 * @returns {string}
 */
function formatAndTrim(str, trimNewlines = false) {
   if (trimNewlines) {
      if (str.startsWith('\n')) str = str.substring(1);
      if (str.endsWith('\n')) str = str.substring(0, str.length - 1);
   }
   str = str.replaceAll('\u2019', "'");

   return str;
}

//#endregion String utility methods

//#region Question/ask structure utility methods

/**
 * Returns the ask found by "stepping in" to the
 * sub-asks of `baseAsk` up to `depth / 2 - 1` times.
 * 
 * If it steps in too far, it returns the ask found at the previous depth.
 * 
 * The below tree represents an ask and its sub-asks.
 * ```text
 * ask_0_0
 * |
 * +- ask_1_0
 * |  |
 * |  `- ask_2_0
 * |
 * `- ask_1_1
 *    |
 *    +- ask_2_1
 *    |
 *    `- ask_2_2
 * ```
 * `getQuestionWithDepth(ask_0_0, 4)` would return `ask_1_1`.
 * `getQuestionWithDepth(ask_0_0, 6)` would return `ask_2_2`.
 * `getQuestionWithDepth(ask_0_0, 8)` would return `ask_2_2` as well, since `ask_2_2` has no sub-asks.
 * 
 * @param {Ask} baseAsk 
 * @param {number} depth 
 * @returns {Ask} 
 */
function getQuestionWithDepth(baseAsk, depth) {
   depth = Math.floor(depth / 2) - 1;
   
   for (let n = 0; n < depth; n++) {
      baseAsk = baseAsk.subAsks.at(-1) ?? baseAsk;
   }
   return baseAsk;
}

/**
 * Gets the last category in the given list of categories.
 * @param {Category[]} categoryArr The list of categories to get the category from.
 * @param {boolean} [throwOnNoCategories=true] Controls whether to throw when there are no categories or to create a default category.
 * @returns {Category}
 */
function getLastCategory(categoryArr, throwOnNoCategories = true) {
   let cat = categoryArr.at(-1);
   if (!cat) {
      if (throwOnNoCategories) throw new RangeError("No categories present.");

      categoryArr.push(cat = {
         header: "(unknown category)",
         questions: []
      });
   }

   return cat;
}

/**
 * Gets the last ask in the given category.
 * @param {Category} category The category to get the ask from.
 * @param {boolean} [throwOnNoQuestions=true] Controls whether to throw when no questions are found or to create a default question.
 * @returns {Ask}
 */
function getLastAsk(category, throwOnNoQuestions = true) {
   if (!category.questions.length) {
      if (throwOnNoQuestions) {
         throw new RangeError(`No questions found in the given category. \n ${JSON.stringify(category)}`);
      }
      category.questions.push({
         question: {
            asker: "(unknown asker)",
            query: "(unknown query)",
            attachments: []
         },
         answers: [],
         subAsks: [],
         selfReplies: [],
         index: category.questions.length
      });
   }

   return category.questions[category.questions.length - 1];
}

//#endregion Question/ask structure utility methods

/**
 * 
 * @param {string} folderName 
 * @returns {HTMLNode}
 */
function loadHTMLDoc(folderName) {
   const htmlFileName = folderName.replaceAll(' ', '') + '.html';

   let parsed = parse5.parse(fs.readFileSync(`documents/${folderName}/${htmlFileName}`, 'utf-8'));
   const htmlElem = parsed.childNodes.find(v => v.nodeName === 'html');
   if (!htmlElem || !('tagName' in htmlElem)) throw new Error('Could not find base HTML element. ' + htmlFileName);

   const baseElem = new HTMLNode(htmlElem);
   config.boldClassId = findBoldSelector(baseElem);
   return baseElem;
}

/**
 * Parses the data from a given document.
 * @param {string} folderName The name of the folder to extract the data from.
 * @returns {Category[]}
 */
function extractData(folderName) {
   const bodyElem = loadHTMLDoc(folderName).children.find(v => v.tagName === 'BODY');
   
   if (bodyElem == null) throw new Error('Could not find the body element.');

   let isInMiscFile = folderName === 'Miscellaneous';

   /** @type {Category[]} */
   let arr = [];
   let elems = bodyElem.children;

   let inShiftedTree = false;

   elems.forEach((e, index) => {
      // Skips. ugly, but so is the doc formatting
      if (isInMiscFile && e.tagName === 'UL' && index >= 352 && index <= 363) return;

      // Header found, add a category
      if (/^H\d$/.test(e.tagName)) {
         arr.push({
            header: formatAndTrim(stripHTML(e.innerHTML)),
            questions: []
         });
         inShiftedTree = false;
         return;
      }
      if (e.tagName !== 'UL' && e.tagName !== 'OL') return; // don't care about those elements at this level

      let lastCategory = getLastCategory(arr); // current category
      let depth = getDepth(e); // how many times the current element is indented
      if (depth === 0) {
         // found the start of an ask. add the data for the original question
         lastCategory.questions.push({
            question: convertToQuestionObject(e),
            answers: [],
            subAsks: [],
            selfReplies: [],
            index: lastCategory.questions.length
         });
         inShiftedTree = false;
         return;
      }

      if (!inShiftedTree && depth % 2 === 1 || inShiftedTree && depth % 2 === 0) {
         let lastQuestion = getQuestionWithDepth(getLastAsk(lastCategory), depth + 1 + (+inShiftedTree));

         if (isQuestion(e)) {
            inShiftedTree = !inShiftedTree;
            lastQuestion.subAsks.push({
               question: convertToQuestionObject(e),
               answers: [],
               subAsks: [],
               selfReplies: [],
               index: lastQuestion.answers.length + lastQuestion.selfReplies.length + lastQuestion.subAsks.length
            });
            return;
         }

         lastQuestion.answers.push(...expandAndFormatReplies(e));
      }
      else {
         let lastQuestion = getQuestionWithDepth(getLastAsk(lastCategory), depth);
         
         if (isQuestion(e)) {
            let questionObject = convertToQuestionObject(e);

            lastQuestion.subAsks.push({
               question: questionObject,
               answers: [],
               subAsks: [],
               selfReplies: [],
               index: lastQuestion.answers.length + lastQuestion.selfReplies.length + lastQuestion.subAsks.length
            });
         }
         else {
            // failed to parse question (presumably), treat it as a self reply.
            // OR, if it was in a shifted tree, add special handling for it bc it's probably the url
            //(inShiftedTree && depth === 1 ? lastQuestion.answers : lastQuestion.selfReplies).push(...expandAndFormatReplies(e));
            let replies = expandAndFormatReplies(e);

            if (inShiftedTree && depth === 1) lastQuestion.answers.push(...replies);
            else {
               let ind = lastQuestion.answers.length + lastQuestion.selfReplies.length + lastQuestion.subAsks.length;
               /** @type {Reply[]} */
               let withIndexes = replies.map(v => ({content: v, index: ind++}));
               lastQuestion.selfReplies.push(...withIndexes);
            }
            depth--;
         }
      }
   });

   return arr;
}

module.exports = extractData;