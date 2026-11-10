const fs = require('fs');
const { load: cheerioLoad } = require('cheerio');
const { load: ymlLoad, dump: ymlDump } = require('js-yaml');
const { marked } = require('marked');
const { Resvg } = require('@resvg/resvg-js');

const { ymlFromSlug, writeYml } = require('./generate-assets.js');

const EDIT_PUZZLE_URL = 'https://logic-masters.de/Raetselportal/Eigene/einstellen.php';
const UPLOAD_IMAGE_URL = 'https://logic-masters.de/Dateien/index.php';

async function sessionFetchCheerio(url, options = {}) {
  const postResponse = await sessionFetch(url, { ...options });
  const $ = cheerioLoad(await postResponse.text());

  if ($('form.login').length > 0)
    throw new Error("You're not logged in!");

  return $;
}

async function sessionFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Cookie': `lm_data=${process.env.LMD_COOKIE_ID}`
  };

  const postResponse = await fetch(url, { ...options, headers });
  if (!postResponse.ok)
    throw new Error(`HTTP request failed with status ${postResponse.status}`);

  return postResponse;
}

function generateHtml(slug, imgCode) {
  const { title, sudokupad_url: url, rules } = ymlFromSlug(slug);

  const rules_html = marked(rules.map(r => `- **${r.name}:** ` + r.desc.replaceAll('\n', '\n    ')).join("\n"))
    .replaceAll(/<(p|li)>/g, '<$1 style="max-width:100%">');

  const html = `
    <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;">
      <div style="flex:1 1 300px;max-width:416px;">
        <a title="${title} by GiAnMMV" href="${url}">
          <img:${imgCode} style="width:100%;height:auto;display:block;" alt="${title}" />
        </a>
      </div>
      <div style="flex:2 1 300px;min-width:0;">
        <h3 style="margin-top:0;">Rules:</h3>
          ${rules_html}
        <hr/>
        <div style="text-align:center;">
          <a title="${title} by GiAnMMV" href="${url}" style="display:inline-block;padding:10px 24px;border-radius:999px;background:#0056b3;color:#fff;font-weight:bold;text-decoration:none;">Play in SudokuPad</a>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin:1em;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
      <a href="https://gianmmv.github.io/puzzles/" title="GiAnMMV's Puzzles" style="color:#0056b3;font-weight:bold;text-decoration:none;margin:10px 0px;">← More puzzles by GiAnMMV</a>
      <a href="https://gianmmv.github.io/puzzles/random/?from=${slug}" title="Random Puzzle..." style="display:inline-block;padding:10px 24px;border-radius:999px;background:#0056b3;color:#fff;font-weight:bold;text-decoration:none;background-image:linear-gradient(in hsl longer hue 45deg, red 0 100%);">Random Puzzle</a>
    </div>`;

  return html
    .replace(/^\s+|\s+$/gm, '')
    .replace(/[\r\n]+/g, '');
}

function solutionCode(slug, indication) {
  const puzzle = JSON.parse(fs.readFileSync(`./assets/data/puzzles/${slug}.json`, 'utf-8'));
  const solution = puzzle.metadata.solution;
  const w = puzzle.cells[0].length;
  const boxes = puzzle.regions
    .map(box => box.map(c => c[0] * w + c[1]).sort((a, b) => a - b))
    .sort((a, b) => a[0] - b[0]);

  const rcb = indication.charAt(0);
  const number = parseInt(indication.slice(1)) - 1;
  switch (rcb) {
    case 'r':
      return [
        solution.slice(number * w, (number + 1) * w),
        `Row ${number + 1}, left to right.`
      ];
    case 'c':
      return [
        [...solution].filter((_, i) => i % w === number).join(''),
        `Column ${number + 1}, top to bottom.`
      ];
    case 'b':
      return [
        [...solution].filter((_, i) => boxes[number].includes(i)).join(''),
        `${number === (boxes.length - 1) / 2 ? 'Central box' : `Box ${number + 1}`}, in reading order.`
      ];
  }
}

function extractForm($form) {
  return Object.fromEntries(
    $form.serializeArray().map(item => [item.name, item.value])
  );
}

function extractPuzzleForm($form) {
  const payload = extractForm($form);

  return {
    htmlcode: payload.htmlcode || undefined,
    codedescr: payload.codedescr || undefined,
    code: [payload.code, payload.codedescr_en],
    dif: parseInt(payload.dif),
    date: (payload.frei === 'ja') ? (
      `${payload.year}-${payload.month.padStart(2, 0)}-${payload.day.padStart(2, 0)} ` +
      `${payload.hour.padStart(2, 0)}:${payload.min.padStart(2, 0)}:${payload.sec.padStart(2, 0)}`
    ) : null,
    labels: Object.keys(payload)
      .reduce((res, l) => {
        const match = l.match(/(?<=^label_)\d+$/);
        if (match) res.push(parseInt(match[0]));
        return res;
      }, []),
    tags: payload.freetags.split(/\s*,\s*/)
  }
}

async function uploadPuzzle(slug, params = {}) {
  let url = EDIT_PUZZLE_URL;

  const formData = new FormData();

  const yml = ymlFromSlug(slug);

  if (!(slug in lmdData))
    lmdData[slug] = {};

  if (!('img_id' in lmdData[slug]))
    uploadImage(slug);

  const createMode = !('id' in lmdData[slug]);
  if (!createMode)
    url += `?id=${lmdData[slug].id}`

  const DEFAULTS = {
    code: ['', ''],
    dif: 3,
    date: null,
    labels: [4],
    tags: ['Sudoku'],
  };

  if (!createMode &&
    Object.keys(DEFAULTS).some((key) => (params[key] ?? lmdData[slug][key]) === undefined)
  ) Object.assign(params, extractPuzzleForm((await sessionFetchCheerio(url))('form').first()));

  const { code, dif, date, labels, tags } = Object.keys(DEFAULTS).reduce((acc, key) => {
    acc[key] = params[key] ?? lmdData[slug][key] ?? DEFAULTS[key];
    return acc;
  }, {});

  const comment = params.comment ?? '';

  if (createMode)
    formData.append('Sudoku_JaNein', tags.includes('Sudoku') ? 'Ja' : 'Nein');
  formData.append('name', yml.title);
  formData.append('htmlcode', lmdData[slug].htmlcode || '');
  formData.append('codedescr', lmdData[slug].codedescr || '');
  formData.append('htmlcode_en', generateHtml(slug, lmdData[slug].img_id));
  ((arr) => {
    formData.append('codedescr_en', arr[1]);
    formData.append('code', arr[0]);
  })((typeof code === 'string') ? solutionCode(slug, code) : code);
  formData.append('dif', dif.toString());
  if (date === null)
    formData.append('frei', 'nein');
  else {
    formData.append('frei', 'ja');
    ((d) => {
      formData.append('day', d.getDate().toString().padStart(2, 0));
      formData.append('month', (d.getMonth() + 1).toString().padStart(2, 0));
      formData.append('year', d.getFullYear().toString());
      formData.append('hour', d.getHours().toString().padStart(2, 0));
      formData.append('min', d.getMinutes().toString().padStart(2, 0));
      formData.append('sec', d.getSeconds().toString().padStart(2, 0));
    })(new Date(date));
  }
  labels.forEach((l) => formData.append(`label_${l}`, '1'));
  formData.append('freetags', tags.join(', '));
  formData.append('comment', comment);
  if (createMode)
    formData.append('einstellen', 'Create');
  else
    formData.append('einstellen', 'Change');

  const $ = await sessionFetchCheerio(url, {
    method: 'POST',
    body: formData
  });
  const $formHtml = $('form').first();
  if (createMode) {
    const id = $formHtml.attr('action').match(/(?<=id=)[\dA-Z]{6}(?!\S)/gm)[0];
    lmdData[slug].id = id;
    yml.lmd_id = id;
    writeYml(yml, slug);
  }

  const warning = $('.rp_wichtig').text();
  if (warning) console.warn(warning);

  Object.assign(lmdData[slug], extractPuzzleForm($formHtml));
}

async function uploadImage(slug) {
  let url = UPLOAD_IMAGE_URL;

  const fileBuffer = new Resvg(fs.readFileSync(`./assets/images/${slug}.svg`), {
    font: { loadSystemFonts: true }
  }).render().asPng();

  const fileBlob = new Blob([fileBuffer], { type: 'image/png' });

  const yml = ymlFromSlug(slug);

  if (!(slug in lmdData))
    lmdData[slug] = {};

  const formData = new FormData();
  formData.append('datei', fileBlob, 'image.png');
  formData.append('MAX_FILE_SIZE', '4194304');
  formData.append('name', yml.title);
  formData.append('anmerkung', "I'm the author of this puzzle.");

  if ('img_id' in lmdData[slug]) {
    url += `?id=${lmdData[slug].img_id}`;
    formData.append('new', 'Neue Version hochladen');
    formData.append('status', 'geheim');
  } else {
    formData.append('offen', 'on');
    formData.append('dateiupload', 'Hochladen');
  }

  const $ = await sessionFetchCheerio(url, {
    method: 'POST',
    body: formData
  });

  if (!('img_id' in lmdData[slug])) {
    lmdData[slug].img_id = $('.note').text().match(/:\s*([\dA-Z]{6})\s*$/)[1];
  }
}

const lmdData = JSON.parse(fs.readFileSync('lmd-data.json'));
async function main() {
  const rawArgs = process.argv.slice(2);
  const slug = rawArgs[0];
  if (rawArgs[1] === '--update-image')
    await uploadImage(slug);
  else if (rawArgs[1] === '--update-puzzle') {
    if (rawArgs.length > 1)
      await uploadPuzzle(slug, { comment: rawArgs[2] });
    else
      await uploadPuzzle(slug);
  }

  const lmdData_ordered = Object.keys(lmdData).sort().reduce(
    (obj, key) => {
      obj[key] = lmdData[key];
      return obj;
    }, {});
  fs.writeFileSync('lmd-data.json', JSON.stringify(lmdData_ordered, null, 2));
}
main().catch(console.error);