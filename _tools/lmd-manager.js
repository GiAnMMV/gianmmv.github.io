const fs = require('fs');
const path = require('path');
const { load: cheerioLoad } = require('cheerio');
const { marked } = require('marked');
const { Resvg } = require('@resvg/resvg-js');
const { setTimeout } = require('timers/promises');

const { ymlFromSlug, writeYml } = require('./generate-assets.js');

const ROOT_DIR = path.resolve(__dirname, '..');

const EDIT_PUZZLE_URL = 'https://logic-masters.de/Raetselportal/Eigene/einstellen.php';
const UPLOAD_IMAGE_URL = 'https://logic-masters.de/Dateien/index.php';

async function sessionFetchCheerio(url, options = {}) {
  const postResponse = await sessionFetch(url, { ...options });
  const $ = cheerioLoad(await postResponse.text());

  if ($('form.login').length > 0)
    throw new Error("You're not logged in!");

  return $;
}

let fetchTimer = Date.now();
async function sessionFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Cookie': `lm_data=${process.env.LMD_COOKIE_ID}`
  };

  await setTimeout(fetchTimer - Date.now());

  const postResponse = await fetch(url, { ...options, headers });
  if (!postResponse.ok)
    throw new Error(`HTTP request failed with status ${postResponse.status}`);

  fetchTimer = Date.now() + 5000;

  return postResponse;
}

const TERMS = {
  '': {
    rules: 'Rules',
    sudokupad: 'Play in SudokuPad',
    more: name => `More puzzles by ${name}`,
    random: 'Random Puzzle'
  },
  de: {
    rules: 'Regeln',
    sudokupad: 'In SudokuPad spielen', 
    more: name => `Weitere Rätsel von ${name}`,
    random: 'Zufälliges Rätsel'
  }
};
function generateHtml(slug, imgCode, yml = ymlFromSlug(slug), lang = '') {
  const {
    title,
    sudokupad_url: url,
    [['rules', lang].filter(Boolean).join('_')]: rules
  } = yml;
  if (!rules) return;

  const escapedTitle = title
    .replaceAll('&', "&amp;")
    .replaceAll('<', "&lt;")
    .replaceAll('>', "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const rules_html = marked(rules.map(r => `- **${r.name}:** ` + r.desc.replaceAll('\n', '\n    ')).join('\n'))
    .replace(/<(p|li)>/g, '<$1 style="max-width:100%">');

  return `
    <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;">
      <div style="flex:1 1 300px;max-width:416px;">
        <a title="${escapedTitle} by GiAnMMV" href="${url}">
          <img:${imgCode} style="width:100%;height:auto;display:block;" alt="${escapedTitle}" />
        </a>
      </div>
      <div style="flex:2 1 300px;min-width:0;">
        <h3 style="margin-top:0;">${TERMS[lang].rules}:</h3>
          ${rules_html}
        <hr/>
        <div style="text-align:center;">
          <a title="${escapedTitle} by GiAnMMV" href="${url}" style="display:inline-block;padding:10px 24px;border-radius:999px;background:#0056b3;color:#fff;font-weight:bold;text-decoration:none;">${TERMS[lang].sudokupad}</a>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin:1em;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
      <a href="https://gianmmv.github.io/puzzles/" title="GiAnMMV's Puzzles" style="color:#0056b3;font-weight:bold;text-decoration:none;margin:10px 0px;">← ${TERMS[lang].more('GiAnMMV')}</a>
      <a href="https://gianmmv.github.io/puzzles/random/?from=${slug}" title="Random Puzzle..." style="display:inline-block;padding:10px 24px;border-radius:999px;background:#0056b3;color:#fff;font-weight:bold;text-decoration:none;background-image:linear-gradient(in hsl longer hue 45deg, red 0 100%);">${TERMS[lang].random}</a>
    </div>`
    .replace(/^\s+|\s+$/gm, '')
    .replace(/[\r\n]+/g, '');
}

function solutionCode(slug, indication) {
  const puzzle = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, '_tools', 'sudokupad', slug + '.json'), 'utf-8'));
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
        `Row ${number + 1}, left to right.`,
        `Zeile ${number + 1}, von links nach rechts.`
      ];
    case 'c':
      return [
        [...solution].filter((_, i) => i % w === number).join(''),
        `Column ${number + 1}, top to bottom.`,
        `Spalte ${number + 1}, von oben nach unten.`
      ];
    case 'b':
      return [
        [...solution].filter((_, i) => boxes[number].includes(i)).join(''),
        `${number === (boxes.length - 1) / 2 ? 'Central box' : `Box ${number + 1}`}, in reading order.`,
        `${number === (boxes.length - 1) / 2 ? 'Mittelblock' : `Block ${number + 1}`}, in Leserichtung.`
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
    codedescr: payload.codedescr || undefined,
    codedescr_en: payload.codedescr_en ?? '',
    code: payload.code ?? '',
    dif: parseInt(payload.dif),
    date: (payload.frei === 'ja') ? (
      `${payload.year}-${payload.month.padStart(2, 0)}-${payload.day.padStart(2, 0)} ` +
      `${payload.hour.padStart(2, 0)}:${payload.min.padStart(2, 0)}:${payload.sec.padStart(2, 0)}`
    ) : '',
    labels: Object.keys(payload)
      .reduce((res, l) => {
        const match = l.match(/(?<=^label_)\d+$/);
        if (match) res.push(parseInt(match[0]));
        return res;
      }, []),
    tags: payload.freetags.split(/\s*,\s*/)
  }
}

async function uploadPuzzle(slug, params = {}, yml = ymlFromSlug(slug)) {
  let url = EDIT_PUZZLE_URL;

  const payload = {};

  if (!(slug in lmdData))
    lmdData[slug] = {};
  const storedParams = lmdData[slug];

  if (!('img_id' in storedParams))
    await uploadImage(slug, yml);

  const createMode = !('id' in storedParams);
  if (!createMode)
    url += `?id=${storedParams.id}`

  const DEFAULTS = {
    codedescr_en: '',
    code: '',
    dif: 3,
    date: '',
    labels: [4],
    tags: ['Sudoku']
  };

  let extractedPayload = null;
  const fromExtractedPayload = async (k) => {
    if (createMode) return;
    if (extractedPayload === null)
      extractedPayload = extractPuzzleForm((await sessionFetchCheerio(url))('form').first());
    return extractedPayload[k];
  };

  for (key in DEFAULTS) {
    params[key] = params[key] ?? storedParams[key] ?? (await fromExtractedPayload(key)) ?? DEFAULTS[key];
  }

  if (storedParams.generate_code)
    params.generate_code = storedParams.generate_code;

  if (params.generate_code) {
    [params.code, params.codedescr_en, params.codedescr] = solutionCode(slug, params.generate_code);
  }

  if (createMode)
    payload.Sudoku_JaNein = params.tags.includes('Sudoku') ? 'Ja' : 'Nein';
  payload.name = yml.title;
  payload.htmlcode = generateHtml(slug, storedParams.img_id, yml, 'de') ?? '';
  payload.codedescr = payload.htmlcode
    ? params.codedescr ?? storedParams.codedescr ?? await fromExtractedPayload('codedescr') ?? ''
    : '';
  payload.htmlcode_en = generateHtml(slug, storedParams.img_id, yml);
  payload.codedescr_en = params.codedescr_en;
  payload.code = params.code;
  payload.dif = params.dif.toString();
  ((d) => {
    if (d === '')
      payload.frei = 'nein';
    else {
      payload.frei = 'ja';
      payload.day = d.getDate().toString().padStart(2, 0);
      payload.month = (d.getMonth() + 1).toString().padStart(2, 0);
      payload.year = d.getFullYear().toString();
      payload.hour = d.getHours().toString().padStart(2, 0);
      payload.min = d.getMinutes().toString().padStart(2, 0);
      payload.sec = d.getSeconds().toString().padStart(2, 0);
    }
  })(new Date(params.date));
  params.labels.forEach((l) => payload[`label_${l}`] = '1');
  payload.freetags = params.tags.join(', ');
  payload.comment = params.comment;
  payload.einstellen = createMode ? 'Create' : 'Change';

  const $ = await sessionFetchCheerio(url, {
    method: 'POST',
    body: ((formData) => {
      Object.keys(payload).forEach(k =>
        formData.append(k, payload[k])
      );
      return formData;
    })(new FormData())
  });
  const $formHtml = $('form').first();
  if (createMode) {
    const match = $formHtml.attr('action').match(/(?<=id=)[\dA-Z]{6}(?!\S)/gm);
    if (match){
      storedParams.id = match[0];
      yml.lmd_id = match[0];
      writeYml(yml, slug);
    } else {
      throw new Error('Puzzle ID not found, something went wrong.');
    }
  }

  const warning = $('.rp_wichtig').text();
  if (warning) console.log(warning);

  Object.assign(storedParams, extractPuzzleForm($formHtml));
}

async function uploadImage(slug, yml = ymlFromSlug(slug)) {
  let url = UPLOAD_IMAGE_URL;

  try {
    const fileBuffer = new Resvg(fs.readFileSync(path.join(ROOT_DIR, 'assets', 'images', slug + '.svg')), {
      font: { loadSystemFonts: true }
    }).render().asPng();

    const fileBlob = new Blob([fileBuffer], { type: 'image/png' });

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
      const note = $('.note').text();
      console.log(note);
      lmdData[slug].img_id = note.match(/:\s*([\dA-Z]{6})\s*$/)[1];
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn('Image not found. Skipping...');
    } else {
      throw e;
    }
  }
}

const LMD_DATA_PATH = path.join(__dirname, 'lmd-data.json');
const lmdData = JSON.parse(fs.readFileSync(LMD_DATA_PATH));
async function main() {
  const rawArgs = process.argv.slice(2);
  const slug = rawArgs[0];
  try {
    if (rawArgs[1] === '--update-image')
      await uploadImage(slug);
    else if (rawArgs[1] === '--update-puzzle') {
      if (rawArgs.length > 1)
        await uploadPuzzle(slug, { comment: rawArgs[2] });
      else
        await uploadPuzzle(slug);
    }
  } catch (e) {
    console.error(e);
  }

  const KEYS = [
    "id",
    "img_id",
    "codedescr",
    "codedescr_en",
    "code",
    "dif",
    "date",
    "labels",
    "tags"
  ];

  const lmdData_ordered = Object.keys(lmdData).sort().reduce(
    (obj, key) => {
      obj[key] = Object.fromEntries(KEYS.map(k => [k, lmdData[key][k]]));
      return obj;
    }, {});

  fs.writeFileSync(
    LMD_DATA_PATH,
    JSON.stringify(lmdData_ordered, null, 2)
      .replace(/\r?\n/g, '\r\n')
  );
}
main().catch(console.error);