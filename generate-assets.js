const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const { marked } = require('marked');
const { load: ymlLoad } = require('js-yaml');

const { getPuzzleId } = require('./assets/js/puzzle-converter.js');

const puzzlesDir = path.join(__dirname, '_puzzles');
const jsonDir = path.join(__dirname, 'assets/data/puzzles');
const imgDir = path.join(__dirname, 'assets/images');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WIDTH = 1200;
const HEIGHT = 630;

const allSlugs = fs.readdirSync(puzzlesDir)
  .filter(f => f.endsWith('.md'))
  .map(f => f.replace(/\.md$/, ''));

function getChangedSlugs() {
  try {
    let output = execSync('git diff --name-only', { encoding: 'utf-8' });
    //if (!output.trim()) {
    //  output = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' });
    //}
    const changedFiles = output.split('\n').filter(Boolean);

    const linkSlugs = new Set();
    const ogSlugs = new Set();

    changedFiles.forEach(file => {
      if (file.startsWith('assets/data/puzzles/') && file.endsWith('.json')) {
        linkSlugs.add(path.basename(file, '.json'));
      }
      if (file.startsWith('_puzzles/') && file.endsWith('.md')) {
        ogSlugs.add(path.basename(file, '.md'));
      }
      if (file.startsWith('assets/images/') && file.endsWith('.svg')) {
        ogSlugs.add(path.basename(file, '.svg'));
      }
    });

    return {
      linkSlugs: Array.from(linkSlugs).filter(slug => allSlugs.includes(slug)),
      ogSlugs: Array.from(ogSlugs).filter(slug => allSlugs.includes(slug))
    };
  } catch (e) {
    return null
  }
}

async function getShortLink(jsonData) {
  try {
    const response = await fetch('https://sudokupad.app/admin/createlink', {
      method: 'POST',
      body: '{"puzzle":"' + getPuzzleId(jsonData) + '"}'
    }).then(h => h.json());
    if (response.result === "success" && response.shortid)
      return "https://sudokupad.app/" + response.shortid;
    else {
      console.log(response.result);
      throw new Error("No short URL could be generated")
    }
  } catch (err) {
    console.error("Failed to generate short URL:", err);
    return null;
  }
}

async function processSingleLink(slug) {
  const mdPath = path.join(puzzlesDir, slug + '.md');
  const jsonPath = path.join(jsonDir, slug + '.json');

  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) return;

  console.log(`[Link] Generating short link for ${slug}...`);
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const shortUrl = await getShortLink(jsonData);

  if (shortUrl) {
    let mdContent = fs.readFileSync(mdPath, 'utf8');
    if (mdContent.includes('sudokupad_url:')) {
      mdContent = mdContent.replace(/^sudokupad_url:.*/mg, `sudokupad_url: ${shortUrl}`);
    } else {
      mdContent = mdContent.replace(/^rules:/m, `sudokupad_url: ${shortUrl}\nrules:`);
    }
    fs.writeFileSync(mdPath, mdContent, 'utf8');
  }
}

async function generateOGImage(slug, browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    await page.setViewport({ width: WIDTH, height: HEIGHT });

    const cleanSvg = fs.readFileSync(path.join(imgDir, slug + '.svg'), 'utf-8').trim();
    const yml = ymlLoad(fs.readFileSync(path.join(puzzlesDir, slug + '.md'), 'utf-8').trim().slice(0, -3));

    const rules_html = marked(yml.rules.map(r => `- **${r.name}:** ` + r.desc.replaceAll('\n', '\n    ')).join("\n"));

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            background: #fff;
            margin: 0; padding: 2rem; width: 1200px; height: 630px;
            font-family: Arial, sans-serif; box-sizing: border-box;
            font-size: 1.25em;
          }
          h1 { margin-block: .25em; }
          .container { display: flex; }
          .left-col { width: 500px; display: flex; justify-content: center; }
          .left-col svg { width: 100%; height: auto; display: block; }
          .right-col { width: 700px; display: flex; justify-content: center; }
        </style>
      </head>
      <body>
        <h1>${yml['title']}</h1>
        <div class="container">
          <div class="left-col">
            ${cleanSvg}
          </div>
          <div class="right-col">
            ${rules_html}
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(fullHtml);

    const outputPath = path.join(imgDir, slug + '-og.png');

    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }
    });

    console.log(`Image created: ${outputPath}`);
  } finally {
    if (context)
      await context.close();
  }
}


async function main() {
  const rawArgs = process.argv.slice(2);
  const flags = new Set(rawArgs.filter(arg => arg.startsWith('--')));
  const positionalArgs = rawArgs.filter(arg => !arg.startsWith('--'));

  const isOgOnly = flags.has('--og-only');
  const isLinkOnly = flags.has('--link-only');
  if (isOgOnly && isLinkOnly) {
    throw new Error("Specified flags are exclusive.");
  }


  let linkSlugsToProcess = [];
  let ogSlugsToProcess = [];

  if (positionalArgs.length === 0) {
    const changed = getChangedSlugs();
    if (changed) {
      linkSlugsToProcess = changed.linkSlugs;
      ogSlugsToProcess = changed.ogSlugs;
    } else {
      linkSlugsToProcess = allSlugs;
      ogSlugsToProcess = allSlugs;
    }
  } else if (positionalArgs[0] === '.') {
    linkSlugsToProcess = allSlugs;
    ogSlugsToProcess = allSlugs;
  } else {
    linkSlugsToProcess = positionalArgs;
    ogSlugsToProcess = positionalArgs;
  }

  if (isOgOnly) {
    linkSlugsToProcess = [];
  } else if (isLinkOnly) {
    ogSlugsToProcess = [];
  }

  if (linkSlugsToProcess.length > 0) {
    for (const slug of linkSlugsToProcess) {
      await processSingleLink(slug);
    }
  }

  if (ogSlugsToProcess.length > 0) {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true
    });

    try {
      for (const slug of ogSlugsToProcess) {
        await generateOGImage(slug, browser);
      }
    } finally {
      await browser.close();
    }
  }

  if (linkSlugsToProcess.length === 0 && ogSlugsToProcess.length === 0) {
    console.log("Nothing to update.");
  }
}

main().catch(console.error);