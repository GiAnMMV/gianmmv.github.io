const fs = require('fs');
const {load: cheerioLoad} = require('cheerio');
const { load: ymlLoad } = require('js-yaml');
const { marked } = require('marked');

const EDIT_PUZZLE_URL = 'https://logic-masters.de/Raetselportal/Eigene/einstellen.php';

function ymlFromSlug(slug) {
  return ymlLoad(fs.readFileSync(`./_puzzles/${slug}.md`,'utf-8')
    .trim().slice(0, -3));
}

async function sessionFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Cookie': `lm_data=${process.env.LMD_COOKIE_ID}`
  };

  return await fetch(url, { ...options, headers });
}

function generateHtml(slug, imgCode) {
  const {title, sudokupad_url: url, rules} = ymlFromSlug(slug);

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
  const solution = JSON.parse(fs.readFileSync(`./assets/data/puzzles/${slug}.json`, 'utf-8')).metadata.solution;
  
  const rcb = indication.charAt(0);
  const number = parseInt(indication.slice(1)) - 1;
  switch (rcb) {
    case 'r':
      return [
        solution.slice(number*9, (number+1)*9),
        `Row ${number+1}, left to right.`
      ];
    case 'c':
      return [
        [...solution].filter((_, i) => i >= 1 && (i - 1) % 9 === 0).join(''),
        `Column ${number+1}, top to bottom.`
      ];
    case 'b':
      const off = Math.floor(number / 3) * 27 + number % 3 * 3;
      return [
        solution.slice(off, off+3) + solution.slice(off+9, off+12) + solution.slice(off+18, off+21),
        `${number === 4 ? 'Middle box' : `Box ${number+1}`}, in reading order.`
      ];
  }
}

function extractForm($form, $) {
  const payload = {};

  $form.find('input, textarea, select').each((_, element) => {
    const $el = $(element);
    const name = $el.attr('name');

    if (!name) return;

    const tagName = element.tagName.toLowerCase();
    const type = $el.attr('type') ? $el.attr('type').toLowerCase() : '';
    let value = $el.attr('value') || '';

    if (type === 'checkbox') {
      if ($el.is(':checked') || $el.attr('checked') !== undefined) {
        value = $el.attr('value') || '1';
      } else {
        return;
      }
    }
    if (tagName === 'select') {
      const $selectedOption = $el.find('option[selected], option:selected').first();
      if ($selectedOption.length > 0) {
        value = $selectedOption.attr('value') || '';
      } else {
        const $firstOption = $el.find('option').first();
        value = $firstOption.length > 0 ? ($firstOption.attr('value') || '') : '';
      }
    } else if (tagName === 'textarea') {
      value = $el.text() || '';
    }

    payload[name] = value;
  });

  return payload;
}

async function getPuzzlePayload(lmd_id = null) {
  if (!lmd_id)
    return {
      Sudoku_JaNein: 'Ja',
      name: '',
      htmlcode: '',
      codedescr: '',
      htmlcode_en: '',
      codedescr_en: '',
      code: '',
      dif: '3',
      frei: 'ja',
      day: '06',
      month: '11',
      year: '2026',
      hour: '16',
      min: '23',
      sec: '34',
      freetags: '',
      einstellen: 'Create'
    };

  const url = EDIT_PUZZLE_URL + `?id=${lmd_id}`;

  const pageResponse = await sessionFetch(url);
  const pageHtml = await pageResponse.text();
  const $ = cheerioLoad(pageHtml);
  const $formHtml = $('form').first();
  
  return extractForm($formHtml, $);
}

async function postPuzzlePayload(lmd_id = null, payload = {}) {
  const url = EDIT_PUZZLE_URL + (lmd_id ? `?id=${lmd_id}` : '');

  const postResponse = await sessionFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(payload)
  });
  console.log('Status code:', postResponse.status);
}

async function editRequest(lmd_id = null, callback = (pl) => [pl, '']) {
  const payload = await getPuzzlePayload(lmd_id);

  const [editedPayload, comment] = callback({...payload});

  if (JSON.stringify(payload) !== JSON.stringify(editedPayload)) {
    if ('comment' in payload)
      editedPayload.comment = comment;
    await postPuzzlePayload(lmd_id, editedPayload);
  } else {
    console.log('No difference found; action skipped.');
  }
  
  return editedPayload;
}

async function editRequestFromSlug(slug, callback = null) {
  const lmd_id = ymlFromSlug(slug).lmd_id;
  if (callback === null)
    return await editRequest(lmd_id);
  return await editRequest(lmd_id, callback);
}

(async () => {console.log(await getPuzzlePayload(ymlFromSlug('pear').lmd_id));})();
console.log(generateHtml('pear', '0015VO'));