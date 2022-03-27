# aurora-library-parser
A NodeJS project to convert the Aurora World Library documents into program-readable JSON.

This project needs [NodeJS and NPM](https://nodejs.org/en/download/) (bundled with Node) installed. Using the Node version 16.14.2 (LTS)
or higher is recommended, as it has not been tested with earlier versions. The default version of NPM (8.5.0 or higher) will work.
It also needs the [parse5](https://www.npmjs.com/package/parse5) package, which can be installed by running `npm i`.

### Scripts
There are several scripts included for convenience that can be run with NPM using `npm run <script-name>`.
 - `download_zips` will download all 8 library documents as .zip files from Google Docs and place them into the `files/ZipFiles` folder.
 - `build_zips` will extract the zip files in `files/ZipFiles` into individual folders in `files/documents`.
 - `build_all` will run `download_zips` and then `build_zips`, downloading and extracting them in one step.
 - `test:images` will print out images that either included in the parsed JSON output or on disk, but not present in both.
 - `clean_files` will clean up the generated, extracted, and downloaded document files. It needs arguments passed into it in a
 format such as `npm run clean_files -- --all`. Note that this syntax will not work inside of Powershell, but will work inside of the Windows
 Command Prompt (cmd.exe). It can also be run through Node directly by using `node tests/cleanFiles.js <arguments>`.
 - `start`, `npm start`, or `node .` will start the program and parse the extracted document files into JSON, which
 will be located at `files/documents/<doc name>/converted.json`.

For a TL;DR, `npm run build_all` will download and extract the newest version of the library documents
and `npm start` will convert those library documents into JSON files.

### JSON Output Format
The `librarySchema.json` file is a JSON schema describing the format of the parsed library documents. If Visual Studio Code is used to open
up the project, `.vscode/settings.json` is configured to use that schema automatically for those files.

Each file is an array of category objects, which each have a `header` field, which is the name of the category, and a `questions` field, which
is an array of asks.

#### Category object:
 - The `header` field is the name of the category.
 - The `questions` field is an array of asks that fit into this category.

#### Ask object:
 - The `question` field holds information about the original question being asked (see [Question object](#question-object)).
 - The `answers` field is an array of answers to the question. Usually, each bullet point means one entry in the array.
 - The `selfReplies` field is for parts of the answer to the question that had a greater level of indentation. Typically,
lists (numbered or with bullet points) end up here.
    - Each of the entries in this field will have an `index` field describing where this part of the answer is located relative to the other answers.
 - The `subAsks` field is an array of asks chaining off of or related to the original question.
 - The `index` field describes the ask's placement in the category's questions (if it was a top-level ask) or its placement
in the answers to the ask it chained off of.
 - Most top-level asks (i.e. those that are directly underneath a category, not under another question) will have the last
element in the `answers` field be a link to the question itself (from Discord, Tumblr, etc.).

#### Question object:
 - The `asker` field is the name of the user who asked the question.
 - The `query` field is what that user was asking.
 - The `attachments` field is an array of images (as filenames) and any additional text.
 - The `context` field is a string with some context about the question that was not self-explanatory. It may not be included.

Images are formatted as `images/<filename>`, referring to a specific image in the images folder extracted from the zipped document.
Google Docs names these as something like `image1.png` or `image5.gif`.  
Links are formatted using Markdown syntax (`[displayed text](link-here)`). Many times, the displayed text is the same as the
text of the link itself, so it will look something like `[https://discord.com/...](https://discord.com/...)`.

Currently, other text styles such as italics and bold are ignored.
