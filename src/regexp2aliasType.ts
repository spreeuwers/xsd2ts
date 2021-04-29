/**
 * Created by eddyspreeuwers on 4/24/21.
 */
import {log} from "./xml-utils";
import max = require("lodash/fp/max");
import last = require("lodash/fp/last");


export const digits = '0123456789';
export const a2z = 'abcdefghijklmnopqrstuvwxyz';
export const A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const leestekens = '~§±!@#$%^&*()-_=+[]{}|;:.,\'"'.split('').sort().join('');
export const allW = digits + A2Z + a2z ;
export const allC = digits + A2Z + a2z + leestekens;
const CHAR_TYPE = 'char';
const MAX_OPTIONS_LENGTH = 1000;

const SPECIALS = {
    '\\d': digits,
    '\\w': allW,
    '\\.': '.',
    '\\-': '-',
    '\\[': '[',
    '\\]': ']',
    '\\{': '{',
    '\\}': '}',
    '\\*': '*',
    '\\+': '+',
    '\\^': '^',
    '\\?': '?',
    '.'  : allC,
    '\\\\': '\\\\',
};



export function buildVariants(optionVariants: any, series: string[], maxLength: number) {
    const newOptionVariants: {[key: string]: number} = {};
    (optionVariants || []).forEach((ov) => {
        (series || []).forEach(s => {
            if ((maxLength || 10000) >= (ov + s).length) {
                newOptionVariants[ov + s] = 1;
            } else  {
                newOptionVariants[ov] = 1;
            }
        });
    });

    return Object.keys(newOptionVariants).sort();

}

export function makeVariants(optionVariants: any, series: string, maxLength: number) {
    return buildVariants(optionVariants, series.split(''), maxLength);
}



function invertSeries(res: string) {
    return allC.split('').filter(e => res.indexOf(e) < 0).join('');
}
function expandRange(start: string, end: string) {
    return start + allW.split(start).reverse().shift().split(end).shift() + end;
}
export function range(index: number, pattern: string): [string, number] {
    let result = '';
    const part = pattern.substring(index);

    let matches = part.match(/\^?(\w-\w)/);
    console.log('    range matches:', matches);
    if (matches && matches.index === 0) {
        const [start, end] = matches[1].split('-');
        console.log('    start:', start, 'end', end);
         //select all chars in the range from all chars available
        let res = expandRange(start, end);
         //invert selection by filtering out the res chars from all chars
        if (part.indexOf('^') === 0) {
            res = invertSeries(res);
        }
        result += res;
        index += matches[0].length;
    }
    console.log('    range:', result);
    return [result, index];
}

export function char(index: number, pattern: string): [string, number] {
    let result = '';
    const part = pattern.substring(index);
    const matches = part.match(/\^?(\w|<|>|!|#"%|&|=|_)/);
    //console.log('char matches:', matches);
    if (matches && matches.index === 0) {
        //console.log('char:', matches[1]);
        result += (pattern[index] === '^') ? invertSeries(matches[1]) : matches[1];
        index += matches[0].length;
    }
    console.log('    char:', result);
    return [result, index];
}

export function repeat(index: number, pattern: string): [string, number] {
    let result = '';
    const part = pattern.substring(index);
    const matches = part.match(/\{(\d+)(,\d+)?\}/);
    console.log('char matches:', matches);
    if (matches && matches.index === 0) {
        //console.log('char:', matches[1]);
        let min = matches[1];
        let max = matches[2] || (','+matches[1]);
        result = [min, max].join('');
        index  += matches[0].length;
    }
    console.log('  repeat:', result);
    return [result, index];
}

export function specials(index: number, pattern: string): [string, number] {
    let result = '';
    let part = pattern.substring(index);
    //console.log('idx, pattern:', index, pattern);
    for (let t in SPECIALS) {
        if (part.indexOf(t) === 0) {
            console.log('    special found:', t);
            result = SPECIALS[t];
            index += t.length;
            break;
        }
    }
    console.log('    specials:', result);
    return [result, index];
}


export function series(index: number, pattern: string): [string, number] {

    if (pattern[index] !== '[') {
        return ['', index];
    }
    const offset = index;
    let  [r, i] = ['', 0];
    let result = '';
    index++;
    while (pattern[index] !== ']') {


        [r, i] = specials(index, pattern);
        if (r) {
            result += r;
            index = i;
            continue;
        }

        [r, i] = range(index, pattern);
        if (r) {
            result += r;
            index = i;
            continue;
        }

        [r, i] = char(index, pattern);
        if (r) {
            result += r;
            index = i;
            continue;
        }

        if (index >= pattern.length){
            return ['', offset];
        }
        //console.log('series subresult:', result, index , pattern.length);
        break;
    }
    if (pattern[index] === ']'){
        index++;
    }
    console.log('   series result:', result, index , pattern.length);
    return [result, index];
}



export function variants( pattern: string, index = 0, maxLength = 10): [string[], number]  {
    console.log('   variants pattern:', index, pattern, pattern[index]);
    const offset = index;
    let  [r, i] = ['', 0];
    let result = null;
    let options = [''];
    let startOptionIndex = 0;
    let lastOptionType = null;
    while (pattern[index] !== '|' && pattern[index] !== ')' && index < pattern.length) {
        console.log('    while variant:', result, options, pattern );

        [r, i] = specials(index, pattern);
        if (r) {
            startOptionIndex = options.length;
            options = makeVariants(options, r, maxLength);
            index = i;
            result = r;
            lastOptionType = 'special';
            continue;
        }

        [r, i] = series(index, pattern);
        if (r) {
            startOptionIndex = options.length;
            options = makeVariants(options, r, maxLength);
            index = i;
            result = r;
            lastOptionType = 'series';
            continue;
        }
        //console.log('na series:', result, options );

        [r, i] = char(index, pattern);

        if (r) {
            startOptionIndex = options.length;
            options = makeVariants(options, r, maxLength);
            index = i;
            result = r;
            lastOptionType = CHAR_TYPE;
            continue;
        }


        //dectect {1} construct
        [r, i] = repeat(index, pattern);

        if (r) {
            const [min, max] = r.split(',').map(s => +s);

            options = options.map(o => o.substring(0, o.length - 1));
            const orgLength = options[options.length - 1].length;
            //options = options.map(o => o.substring(0, o.length - 1));
            const chars = result.split('');
            chars.unshift('');
            while (options[options.length - 1].length < Math.min(maxLength, (1+max)) && options.length < MAX_OPTIONS_LENGTH){
                //console.log('    buildVariants options:', options, result, Math.min(maxLength, +max), options[options.length - 1].length, r);
                options = buildVariants(options, chars, maxLength);
            }
            options = options.filter(o => o.length >= orgLength + min);
            index = i;
            continue;
        }
        let c = pattern[index];
        if ((c === '*'  || c === '+' || c === '?') && result !== null) {
            if (c === '*'|| c === '?') {
                options = options.map(o => o.substring(0, o.length - 1));
            }
            const chars = result.split('');
            chars.unshift('');
            while (options[options.length - 1].length < maxLength && options.length < MAX_OPTIONS_LENGTH){
                console.log('    buildVariants options:', options, result, maxLength, options[options.length - 1].length);
                options = buildVariants(options, chars, maxLength);
                if (c=== '?'){
                    break; // 0 or 1 time
                }
            }
            index++;
            continue;
        }

        break;

    }
    result = (offset === index) ? null : options;
    console.log('   variants result:', result, 'next:', pattern[index]);
    // if (pattern[index] === '|'){
    //     index++;
    // }
    return [result, index];
}

export function option(pattern: string, index = 0,  maxLength = 10): [string[], number]  {
    console.log('  options pattern:', index, pattern, pattern[index]);
    const offset = index;
    let  [r, i] = [null, 0];
    let result = null;

    while (index < pattern.length) {
        console.log('  while option:', result, pattern[index], 'subpattern:', pattern.substring(index));
        [r, i] = variants(pattern, index);
        if (r) {
            if (!result) result = [];
            result = result.concat(r);
            index = i;
            continue;
        }
        if (pattern[index] === '|' ) {
            console.log('     new option:', result, pattern[index],  pattern.substring(index + 1));
            break;
        }
        break;
    }
    console.log('    options result:', result, 'next:', pattern[index]);

    // if (pattern[index] === '|') {
    //     index++;
    // }
    return [result, index];
}

export function group(pattern: string, index = 0,  maxLength = 10): [string[], number]  {

    console.log(' groups pattern:', index, pattern);
    if (pattern[index] !== '(') {
        console.log(' groups result:', null, pattern[index]);
        return [null, index];
    }
    const offset = index;
    let  [r, i] = [null, 0];
    let result = null;
    let options = [];
    index++;
    while (index < pattern.length) {
        //console.log('  while group:', result, options, index, pattern[index]);
        [r, i] = option(pattern, index);
        if (r) {
            options = options.concat(r);
            index = i;
            result = r;
            continue;
        }
        //console.log('  while group after option:', result, options, index, pattern[index]);
        if (pattern[index] == '|') {
            //console.log('     new group option:', result, pattern[index],  pattern.substring(index + 1));
            index++;
            continue;
        }
        if (pattern[index] !== ')') {
            console.log(' groups result:', null, pattern[offset]);
            return [null, offset];
        }
        break;
    }

    if (pattern[index] !== ')') {
        return [null, offset];
    }
    result = (options.length > 0) ? options : null;
    index++;
    console.log(' groups result:', result, pattern[index]);
    return [result, index];
}

export function expression(pattern: string, index = 0,  maxLength = 10): [string[], number]  {
    console.log('expression pattern:', index, pattern);

    let  [r, i] = [null, 0];
    let result = null;
    let options = [];
    let startIndex = 0;
    while ( index < pattern.length) {

        if (pattern[index] === '|') {
            startIndex = options.length;
            log('------option |', options, startIndex);
            index++;
        }

        //console.log(' while expression1 before group:', 'result:', result, 'options:', options, pattern[index], startIndex);
        [r, i] = group(pattern, index);
        if (r) {
            const lastOptions = options.filter( (e,i,a) => i >= startIndex);
            //log('   expression group: r:', r, 'result:', result, 'options:', options, pattern[index], startIndex, 'lastOptions:',lastOptions);

            //remember index of start of options in group
            //startIndex = options.length;

            if (lastOptions.length === 0){
                options = options.concat(r);
            } else {
                //log('   group buildVariants:', lastOptions, startIndex, options, r);
                options = buildVariants(lastOptions, r, maxLength);
            }
            index = i;
            result = r;
            continue;
        }

        //console.log(' expression before option:', result, options, pattern[index]);

        [r, i] = option(pattern, index);
        if (r) {
            //console.log('expression option:', r);
            const lastOptions = options.filter( (e,i,a) => i >= startIndex);
            //console.log('expression option/lastOptions:', lastOptions);
            if (lastOptions.length === 0) {
                options = options.concat(r);
            } else {
                //console.log('   option buildVariants:', lastOptions, startIndex, options);
                options = buildVariants(lastOptions, [r[0]], maxLength);
            }
            index = i;
            result = r;
            continue;
        }

        let c = pattern[index];

        console.log('c', c);
;        if ((c === '*'  || c === '+') && result !== null) {
            console.log('  expression * or +:', result);
            let lastOptions = options.filter( (e,i,a) => i >= startIndex);
            const firstOptions = options.filter( (e,i,a) => i < startIndex);
            if (c === '*') {
                lastOptions = lastOptions.map( o => o.substring(0, o.length - 1));
            }
            console.log('  buildVariants first & lastOptions:', firstOptions, lastOptions, options);
            const chars = result;
            chars.unshift('');
            while (lastOptions[lastOptions.length - 1].length < maxLength && lastOptions.length < MAX_OPTIONS_LENGTH){
                //console.log('    buildVariants options:', options, result, maxLength, options[options.length - 1].length);
                lastOptions = buildVariants(lastOptions, chars, maxLength);
            }
            options = firstOptions.concat(lastOptions);
            index++;
            continue;
        }
        //must be handled otherwise break
        console.log('no match:', i, pattern[i]);
        break;

    }
    result = options;
    //console.log('expression result:', result);
    index++;
    console.log(' expression result:', result, 'rest:', pattern[index]);
    return [result, index];
}

export function regexpPattern2typeAlias(pattern: string, base: string, attr?: object): string {
    let result = '';
    let maxInt = (attr && /\d+/.test(attr['maxInclusive'])) ? parseInt(attr['maxInclusive']) : undefined;
    let minInt = (attr && /\d+/.test(attr['minInclusive'])) ? parseInt(attr['minInclusive']) : undefined;
    let maxLength = (attr &&/\d+/.test(attr['maxLength'])) ? parseInt(attr['maxLength']): undefined;
    console.log('maxLength:', maxLength);
    const [v, i] = expression(pattern, 0, maxLength);

    if (!v){
        return base;
    }
    let options = v || [];
    console.log('alias options:', options);
    if (base === 'string'){
        result = options
            .filter(n => !maxLength || ('' + n).length <= maxLength)
            .map(o => `"${o.replace('"', '\\"')}"`).join('|');
        //log('string result :', result);
    } else if (base === 'number'){
        result = options
            .filter( o => /\d\.?\d*/.test(o))
            //.map( o => {console.log(0);return o;})
            .map(s =>  +s)
            .filter(n => !maxLength || ('' + n).length <= maxLength)
            .filter(n => (!maxInt || n <= maxInt))
            .filter(n => (!minInt || n >= minInt))
            .filter( (n, i, a) => a.indexOf(n) === i) //ontdubbelen
            .join('|').replace(/\|+/g, '|');


    } else {
        result = base;
    }
    if (result.length > 500){
        result = base;
    }
    log('alias result :', result);

    return result || base;
}



