/**
 * Represents an HTML node.
 */
class HTMLNode {
   /**
    * Contains the list of "void" HTML tag names (uppercased).
    * 
    * Every tag with one of these names should, in theory, not contain any
    * text content and should not have a closing tag.
    * 
    * For example:
    * - `<br>` parsable, valid
    * - `<br/>` parsable, but invalid (should not have `/`). will be converted to `<br>`
    * - `<br></br>` will not be parsed as intended (two `br` tags), not valid
    * 
    * Tags other than these void tags may not be parsed correctly if they are self-closing or do not contain
    * an end tag.
    * 
    * @readonly
    */
   static voidTagNames = ['AREA','BASE','BR','COL','EMBED','HR','IMG','INPUT','LINK','META','PARAM','SOURCE','TRACK','WBR'];

   //#region Properties

   /**
    * The lowercased name of this tag.
    * @type {string}
    */
   tag;
   /**
    * The uppercased name of this tag.
    * @type {string}
    */
   get tagName() {
      return this.tag.toUpperCase();
   }

   /**
    * A `Map` of attribute names to attribute values. 
    * @type {Map<string, string>}
    */
   attributes;

   /**
    * Contains an ordered list of strings and nodes,
    * representing text and child elements, respectively.
    * @type {(string | HTMLNode)[]}
    */
   allChildren;

   /**
    * All child elements of this node.
    * 
    * Note that this is a getter and generates a new array
    * from `allChildren` each time when called.
    * It is better to cache the array if it will be
    * accessed multiple times.
    */
   get children() {
      return this.allChildren.filter(
         /** @returns {v is HTMLNode} */
         (v) => v instanceof HTMLNode
      );
   }

   /**
    * The number of child elements this node has.
    * 
    * Note that this is a getter and calculates a value
    * from `allChildren` each time when called.
    * It is better to cache the value if it will be
    * accessed multiple times.
    */
   get childElementCount() {
      return this.allChildren.reduce((n, val) => (val instanceof HTMLNode ? n + 1 : n), 0);
   }

   /**
    * The text contained in the current node and all its children.
    * 
    * Note that this does not currently remove or trim any whitespace.
    * @type {string}
    */
   get textContent() {
      return this.allChildren.map(v => (v instanceof HTMLNode ? v.textContent : v)).join('');
   }

   /**
    * A text representation of all child nodes (text and objects) this HTMLNode contains.
    */
   get innerHTML() {
      return this.allChildren.map(v => (v instanceof HTMLNode ? v.outerHTML : escapeForHTML(v))).join('');
   }

   /**
    * A text representation of the current node and all of its child nodes.
    */
   get outerHTML() {
      let inner = this.innerHTML;

      let selfClosing = inner === '' && HTMLNode.voidTagNames.includes(this.tagName);

      let converted = `<${this.tag.toLowerCase()}`;
      converted += [...this.attributes.entries()].map(([name, val]) => ` ${name}="${escapeForHTML(val, true)}"`).join('');

      converted += '>';
      if (!selfClosing) converted += `${inner}</${this.tag.toLowerCase()}>`;

      return converted;
   }

   //#endregion Properties

   /**
    * 
    * @returns The first child of this node, if it exists.
    */
   firstChild() {
      return this.allChildren.find(
         /** @returns {v is HTMLNode} */
         v => v instanceof HTMLNode
      );
   }

   /**
    * 
    * @param {import('parse5').Element} elem 
    */
   constructor(elem) {
      if (!elem || typeof elem !== 'object') throw new TypeError('Value provided was not an object.');

      this.attributes = new Map();
      this.allChildren = [];

      this.tag = elem.nodeName.toLowerCase();

      for (let v of elem.attrs) {
         this.attributes.set(v.name, v.value);
      }
      for (let node of elem.childNodes) {
         if ('value' in node) this.allChildren.push(node.value.replaceAll('\xa0', ' '));
         else if ('tagName' in node) this.allChildren.push(new HTMLNode(node));
      }
   }
}

/**
 * 
 * @param {Map<string, any>} map 
 * @returns {RegExp}
 */
function createRegExp(map) {
   return new RegExp([...map.keys()].map(s => s.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
}

const entityMap = new Map([
   ['<', '&lt;'],
   ['>', '&gt;'],
   ['&', '&amp;']
]);
const entityRegExp = createRegExp(entityMap);
const extendedEntityMap = new Map([
   ['"', '&quot;']
]);
const extendedEntityRegExp = createRegExp(extendedEntityMap);

/**
 * Escapes a string for HTML.
 * 
 * Currently only escapes the characters `<>&`.
 * Escapes the `"` character if `inAttribute` is true.
 * @param {string} str 
 * @param {boolean} [inAttribute=false] Determines whether or not to escape quotes.
 * @returns {string}
 */
function escapeForHTML(str, inAttribute = false) {
   str = str.replaceAll(entityRegExp, (s) => entityMap.get(s) ?? s);
   if (inAttribute) str = str.replaceAll(extendedEntityRegExp, (s) => extendedEntityMap.get(s) ?? s);

   return str;
}

module.exports = HTMLNode;