const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { getPuzzleId } = require('./assets/js/puzzle-converter.js');

const puzzlesDir = path.join(__dirname, '_puzzles');
const jsonDir = path.join(__dirname, 'assets/data/puzzles');
const cacheFile = path.join(__dirname, '.puzzle-cache.json');

let cache = {};
if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
}

async function getShortLink(jsonData) {
    try {
        const response = await fetch('https://sudokupad.app/admin/createlink', {
            method: 'POST',
            body: '{"puzzle":"' + getPuzzleId(jsonData) + '"}'
        }).then(h => h.json());
        if (response.result === "success" && response.shortid)
            return "https://sudokupad.app/" + response.shortid;
        else{
            console.log(response.result);
            throw new Error("No short URL could be generated")
        }
    } catch (err) {
        console.error("Failed to generate short URL:", err);
        return null;
    }
}

async function processPuzzles() {
    const files = fs.readdirSync(puzzlesDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
        const mdPath = path.join(puzzlesDir, file);
        const slug = file.replace(/\.md$/, '');
        const jsonPath = path.join(jsonDir, `${slug}.json`);

        if (!fs.existsSync(jsonPath)) continue;

        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        const hash = crypto.createHash('md5').update(jsonContent).digest('hex');

        if (cache[slug] && cache[slug].hash === hash && cache[slug].shortUrl) {
            console.log(`[Cache Hit] Skipping API call for ${slug}`);
            continue;
        }

        console.log(`[Modified/New] Generating short link for ${slug}...`);
        const jsonData = JSON.parse(jsonContent);
        const shortUrl = await getShortLink(jsonData);

        if (shortUrl) {
            cache[slug] = { hash, shortUrl };

            let mdContent = fs.readFileSync(mdPath, 'utf8');
            if (mdContent.includes('sudokupad_url:')) {
                mdContent = mdContent.replace(/sudokupad_url:.*/g, `sudokupad_url: "${shortUrl}"`);
            } else {
                mdContent = mdContent.replace(/^---$/m, `---\nsudokupad_url: "${shortUrl}"`);
            }
            fs.writeFileSync(mdPath, mdContent, 'utf8');
        }
    }

    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

processPuzzles();