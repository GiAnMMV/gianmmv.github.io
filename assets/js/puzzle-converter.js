LZipper = function() {
    const fcc = String.fromCharCode;
    function data16to8Bit(str) {
        for (var c, res = "", len = str.length, i = 0; i < len; i++)
            c = str.charCodeAt(i),
            res = (res += String.fromCharCode(c >> 8 & 255)) + String.fromCharCode(255 & c);
        return res
    }
    function compress(data) {
        function dec(numBits, v, noShift) {
            for (var m = noShift ? 0xffffffffff : 1, i = 0; i < numBits; i++)
                val = val << 1 | v & m,
                15 === pos ? (pos = 0,
                str += fcc(val),
                val = 0) : pos++,
                noShift ? v = 0 : v >>= 1
        }
        if (null == data || "" === data)
            return "";
        for (var wc, numBits, pos, c, len = data.length, dic = {}, w = (w = "",
        ""), enlargeIn = numBits = 2, dictSize = 3, str = "", val = pos = 0, ii = 0; ii < len; ii += 1)
            void 0 === dic[c = data.charAt(ii)] && (dic[c] = {
                size: dictSize++,
                create: !0
            }),
            w = void 0 !== dic[wc = w + c] ? wc : (dic[w].create ? (w.charCodeAt(0) < 256 ? (dec(numBits, 0),
            dec(8, w.charCodeAt(0))) : (dec(numBits, 1, !0),
            dec(16, w.charCodeAt(0))),
            0 === --enlargeIn && (enlargeIn = Math.pow(2, numBits),
            numBits++),
            dic[w].create = !1) : dec(numBits, dic[w].size),
            0 === --enlargeIn && (enlargeIn = Math.pow(2, numBits),
            numBits++),
            void 0 !== dic[wc] ? dic[wc].size = dictSize++ : dic[wc] = {
                size: dictSize++,
                create: !1
            },
            String(c));
        for ("" !== w && (dic[w].create ? (w.charCodeAt(0) < 256 ? (dec(numBits, 0),
        dec(8, w.charCodeAt(0))) : (dec(numBits, 1, !0),
        dec(16, w.charCodeAt(0))),
        0 === --enlargeIn && (enlargeIn = Math.pow(2, numBits),
        numBits++),
        dic[w].create = !1) : dec(numBits, dic[w].size),
        0 === --enlargeIn) && (enlargeIn = Math.pow(2, numBits),
        numBits++),
        dec(numBits, 2); ; ) {
            if (val <<= 1,
            15 == pos) {
                str += fcc(val);
                break
            }
            pos++
        }
        return str
    }
    return {
        compact64: str => btoa(data16to8Bit(compress(str))),
    }
}()


const clearEmptyArrays = o => (
    Array.isArray(o)
        ? o.forEach(v => clearEmptyArrays(v))
        : null !== o && "object" == typeof o && Object.keys(o).forEach(key => {
            clearEmptyArrays(o[key]);
            Array.isArray(o[key]) && 0 === o[key].length && delete o[key];
        }),
    o
);

const mapProps = (o, map) => (
    Array.isArray(o)
        ? o.forEach(v => mapProps(v, map))
        : null !== o && "object" == typeof o && Object.keys(o).forEach(key => {
            if (void 0 !== map[key]) {
                if (void 0 !== o[map[key]]) {
                    throw new Error("Prop mapping collision from " + key + ": " + o[key] + " to " + map[key] + ": " + o[map[key]]);
                }
                o[map[key]] = o[key];
                delete o[key];
                key = map[key];
            }
            mapProps(o[key], map);
        }),
    o
);

const mapValues = (o, mapFunc) => (
    Array.isArray(o)
        ? o.forEach((v, idx) => o[idx] = mapValues(v, mapFunc))
        : null !== o && "object" == typeof o
            ? Object.keys(o).forEach(key => o[key] = mapValues(o[key], mapFunc))
            : o = mapFunc(o),
    o
);

const zipQuotes = str => str.replace(/\'/g, "\\'").replace(/"/g, "'");

const propMap = {
    color: "c",
    cages: "ca",
    center: "ct",
    borderColor: "c1",
    backgroundColor: "c2",
    cells: "ce",
    cellSize: "cs",
    arrows: "a",
    overlays: "o",
    underlays: "u",
    width: "w",
    height: "h",
    value: "v",
    videos: "vd",
    lines: "l",
    rounded: "r",
    regions: "re",
    fontSize: "fs",
    thickness: "th",
    headLength: "hl",
    wayPoints: "wp",
    title: "t",
    text: "te",
    duration: "d",
    d: "d2"
};

const Zipper = {
    propMap,
    zip: jsonStr => {
        "string" != typeof jsonStr && (jsonStr = JSON.stringify(jsonStr));
        jsonStr = JSON.parse(jsonStr);
        return clearEmptyArrays(jsonStr),
        mapProps(jsonStr, propMap),
        mapValues(jsonStr, v => v = "string" == typeof v && String(parseInt(v)) === v ? parseInt(v) : v),
        jsonStr = JSON.stringify(jsonStr).replace(/([\,\{\[])\"([a-zA-Z0-9]+)\"\:/gm, "$1$2:").replace(/([\,\{\[]){}(?=[,\}\]])/gm, "$1").replace(/(:)false([,\}\]])/gm, "$1f$2").replace(/(:)true([,\}\]])/gm, "$1t$2").replace(/(:)"#000000"([,\}\]])/gm, "$1#0$2").replace(/(:)"#FFFFFF"([,\}\]])/gm, "$1#F$2").replace(/(:)"#([0-9a-fA-F]{6})"([,\}\]])/gm, "$1$2$3"),
        zipQuotes(jsonStr)
    }
};

function convertJsonToUrl(jsonData) {
    return "https://sudokupad.app/scl" + encodeURIComponent(LZipper["compact64"](Zipper.zip(jsonData)));
}
