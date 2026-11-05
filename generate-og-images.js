const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { marked } = require('marked');
const { load: ymlLoad } = require('js-yaml');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const puzzles = fs.readdirSync('./_puzzles/');

async function generateOGImage(slug, browser) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    try {
        await page.setViewport({ width: 1200, height: 630 });

        const cleanSvg = fs.readFileSync(`./assets/images/${slug}.svg`, 'utf-8').trim();
        const yml = ymlLoad(fs.readFileSync(`./_puzzles/${slug}.md`, 'utf-8').trim().slice(0, -3));

        const rules_html = marked(yml["rules"].map(r => `- **${r["name"]}:** ` + r["desc"].replaceAll('\n', '\n    ')).join("\n"));

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
                        color: #1a1a1a;
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

        const outputPath = `./assets/images/${slug}-og.png`;
        
        await page.screenshot({ 
            path: outputPath, 
            clip: { x: 0, y: 0, width: 1200, height: 630 } 
        });

        console.log(`Image created: ${outputPath}`);
    } finally {
        if (context)
            await context.close();
    }
}

async function main() {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true
    });
    
    try {
        for (const p of puzzles) {
            const slug = p.replace(/\.md$/, '');
            await generateOGImage(slug, browser);
        }
    } finally {
        await browser.close();
    }
}

main();