/**
 * Created by eddyspreeuwers on 4/24/21.
 */
import {log} from "./xml-utils";
import max = require("lodash/fp/max");
import last = require("lodash/fp/last");


export const digits = '0123456789';
export const a2z = 'abcdefghijklmnopqrstuvwxyz';
export const A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const leestekens = '~§±!@#$%^&*()-_=+[]{}|;:.,';
export const allW = digits + a2z + A2Z;
export const allC = digits + a2z + A2Z + leestekens;
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


function variants2options(optionVariants: string[], options: string[]) {
    if (optionVariants) {
        optionVariants.forEach(ov => {
            options.push(ov);
        });
    }
}

export function range(index: number, pattern: string): [string, number] {
    let result = '';
    const part = pattern.substring(index);

    let matches = part.match(/(\w-\w)/);
    console.log('    range matches:', matches);
    if (matches && matches.index === 0) {
        const [start, end] = matches[1].split('-');
        console.log('    start:', start, 'end', end);
        result += start + allW.split(start).reverse().shift().split(end).shift() + end;
        index += matches[1].length;
    }
    console.log('    range:', result);
    return [result, index];
}

export function char(index: number, pattern: string): [string, number] {
    let result = '';
    const part = pattern.substring(index);
    const matches = part.match(/(\w|<|>)/);
    //console.log('char matches:', matches);
    if (matches && matches.index === 0) {
        //console.log('char:', matches[1]);
        result += matches[1];
        index++;
    }
    console.log('    char:', result);
    return [result, index];
}

export function repeat(index: number, pattern: string): [string, number] {
    let result = '';
    const part = pattern.substring(index);
    const matches = part.match(/\{(\d+)\}/);
    //console.log('char matches:', matches);
    if (matches && matches.index === 0) {
        //console.log('char:', matches[1]);
        result += matches[1];
        index += matches[1].length;
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
            console.log('special found:', t);
            result = SPECIALS[t];
            index += t.length;
            break;
        }
    }
    console.log('   specials:', result);
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
        console.log('series subresult:', result, index , pattern.length);
        break;
    }
    if (pattern[index] === ']'){
        index++;
    }
    console.log('series result:', result, index , pattern.length);
    return [result, index];
}


function makeZeroOrMoreSeries(c: string, maxLength: number): string[] {
    const result = [''];
    while (result[result.length - 1].length <= maxLength) {
        let s = result[result.length - 1];
        result.push(s + c);
    }
    return result;
}




export function variants( pattern: string, index = 0, maxLength = 10): [string[], number]  {
    console.log('   variants pattern:', index, pattern);
    const offset = index;
    let  [r, i] = ['', 0];
    let result = null;
    let options = [''];
    let startOptionIndex = 0;
    let lastOptionType = null;
    while (pattern[index] !== '|' && index < pattern.length) {
        console.log('while variant:', result, options, pattern );

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
        // [r, i] = repeat(index, pattern);
        //
        // if (r) {
        //     options = options.map(o => o.substring(0, o.length - 1));
        //     const chars = result.split('');
        //     chars.unshift('');
        //     while (options[options.length - 1].length < maxLength && options.length < MAX_OPTIONS_LENGTH){
        //         console.log('    buildVariants options:', options, result, maxLength, options[options.length - 1].length);
        //         options = buildVariants(options, chars, maxLength);
        //     }
        //     index++;
        //     continue;;
        // }

        if (pattern[index] === '*'  || pattern[index] === '+') {
            if (pattern[index] === '*') {
                options = options.map(o => o.substring(0, o.length - 1));
            }
            const chars = result.split('');
            chars.unshift('');
            while (options[options.length - 1].length < maxLength && options.length < MAX_OPTIONS_LENGTH){
                console.log('    buildVariants options:', options, result, maxLength, options[options.length - 1].length);
                options = buildVariants(options, chars, maxLength);
            }
            index++;
            continue;
        }

        break;

    }
    result = (offset === index) ? null : options;
    //console.log('variants result:', result);
    if (pattern[index] === '|'){
        index++;
    }
    return [result, index];
}

export function option(pattern: string, index = 0,  maxLength = 10): [string[], number]  {
    console.log('  options pattern:', index, pattern);
    const offset = index;
    let  [r, i] = [null, 0];
    let result = null;

    while (index < pattern.length) {
        //console.log('while option:', result, options);
        [r, i] = variants(pattern, index);
        if (r) {
            if (!result) result = [];
            result = result.concat(r);
            index = i;
            continue;
        }
        if (pattern[index] === '|') {
            index++;
            continue;
        }
        break;
    }
    //console.log('options result:', result);

    if (pattern[index] === '|') {
        index++;
    }
    return [result, index];
}

export function group(pattern: string, index = 0,  maxLength = 10): [string[], number]  {

    console.log(' groups pattern:', index, pattern);
    if (pattern[index] !== '(') {
        return [null, index];
    }
    const offset = index;
    let  [r, i] = [null, 0];
    let result = null;
    let options = [];
    index++;
    while (index < pattern.length) {
        //console.log('while group:', result, options);
        [r, i] = option(pattern, index);
        if (r) {
            options = options.concat(r);
            index = i;
            result = r;
            continue;
        }

        if (pattern[index] !== ')') {
            return [null, offset];
        }
        break;
    }

    if (pattern[index] !== ')') {
        return [null, offset];
    }
    result = (options.length > 0) ? options : null;
    console.log(' groups result:', result);
    index++;
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
            //log('------option |', options, startIndex);
            index++;
        }

        console.log('while expression1:', 'result:', result, 'options:', options, pattern[index], startIndex);
        [r, i] = group(pattern, index);
        if (r) {
            const lastOptions = options.filter( (e,i,a) => i >= startIndex);
            //log('   expression group: r:', r, 'result:', result, 'options:', options, pattern[index], startIndex);

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

        console.log('   expression2:', result, options, pattern[index]);

        [r, i] = option(pattern, index);
        if (r) {
            console.log('expression option:', r);
            const lastOptions = options.filter( (e,i,a) => i >= startIndex);
            if (lastOptions.length === 0) {
                options = options.concat(r);
            } else {
                console.log('   option buildVariants:', lastOptions, startIndex, options);
                options = buildVariants(lastOptions, [r[0]], maxLength);
            }
            index = i;
            result = r;
            continue;
        }


        //must be handled otherwise break
        console.log('no match:', i, pattern[i]);
        break;

    }
    result = options;
    //console.log('expression result:', result);
    index++;
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
            .map(o => `"${o}"`).join('|');
        //log('string result :', result);
    } else if (base === 'number'){
        result = options
            .filter( o => /\d\.?\d*/.test(o))
            //.map( o => {console.log(0);return o;})
            .map(s =>  +s)
            .filter(n => !maxLength || ('' + n).length <= maxLength)
            .filter(n => (!maxInt || n <= maxInt))
            .filter(n => (!minInt || n >= minInt))
            .join('|').replace(/\|+/g, '|');


    } else {
        result = base;
    }
    if (result.length > 500){
        result = base;
    }
    log('result :', result);

    return result || base;
}



export function regexpPattern2typeAlias2(pattern: string, base: string, attr?: object): string {

        const MAX_LENGTH_VARIANTS = 100;
        const digits = '0123456789';
        const a2z = 'abcdefghijklmnopqrstuvwxyz';
        const A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const leestekens = '~§±!@#$%^&*()-_=+[]{}|;:.,';
        const allW = digits + a2z + A2Z;
        const allC = digits + a2z + A2Z + leestekens;
        const seriesMap = {
            escaped: {'.': '.', d: digits, w: allW},
            unescaped: {'.': allC}
        };

        let idx = 0;
        let c = '';
        let result = '';
        const options = [];
        let optionVariants = null;
        //const newOptionVariants = [];
        let option = '';
        let series = '';
        let lastChar = '';
        let escaped = false;
        let inBraces = false;
        let inSeries = false;
        let inRange = false;
        let splitOptions = false;
        let maxInt = (attr && /\d+/.test(attr['maxInclusive'])) ? parseInt(attr['maxInclusive']) : undefined;
        let minInt = (attr && /\d+/.test(attr['minInclusive'])) ? parseInt(attr['minInclusive']) : undefined;
        let maxLength = (attr &&/\d+/.test(attr['maxLength'])) ? parseInt(attr['maxLength']): undefined;

        let modus = 0;
        const MODI = 'START|CHAR|START_VARIANTS|END_VARIANTS|IN_VARIANTS|IN_RANGE|IN_SERIES|NIL_OR_MORE|ONE_OR_MORE'.split('|');
        const START = MODI.indexOf('START');
        const CHAR = MODI.indexOf('CHAR');
        //const ESCAPED = MODI.indexOf('ESCAPED');
        const START_VARIANTS = MODI.indexOf('START_VARIANTS');
        const END_VARIANTS = MODI.indexOf('END_VARIANTS');
        const IN_VARIANTS = MODI.indexOf('IN_VARIANTS');
        const IN_RANGE  = MODI.indexOf('IN_RANGE');
        const IN_SERIES  = MODI.indexOf('IN_SERIES');
        const NIL_OR_MORE = MODI.indexOf('NIL_OR_MORE');
        const ONE_OR_MORE = MODI.indexOf('ONE_OR_MORE');



        if (!pattern) return base;
        while (c = pattern[idx] ) {
            splitOptions = false;
            switch (c) {
                case '\\' :
                    escaped = !escaped;
                    break;
                case '('  :
                    inBraces = !escaped;
                    break;
                case ')'  :
                    inBraces = !escaped;
                    break;
                case '['  :
                    modus = (!escaped) ? START_VARIANTS : CHAR;
                    break;
                case '|'  :
                    splitOptions = !escaped;
                    break;
                case ']'  :
                    modus = (!escaped) ? END_VARIANTS : CHAR;
                    break;
                case '*'  :
                    modus = (!escaped) ? NIL_OR_MORE : CHAR;
                    break;
                case '+'  :
                    modus = (!escaped) ? ONE_OR_MORE : CHAR;
                    break;
                case '-'  :
                    if (modus === IN_VARIANTS){
                        inRange = !escaped;
                    }
                    break;
                case '.'  :
                    modus = (!escaped) ? IN_SERIES  : modus;
                    break;

                case 'd'  :
                    if (modus === IN_VARIANTS){
                        inSeries = !escaped;
                    }
                    break;
                default :
                    modus = (modus === START) ? CHAR : modus;
            }

            if (modus === IN_RANGE) {
                const rangeStart = pattern[idx - 2];
                series += allW.split(rangeStart).reverse().shift().split(c).shift();
                modus = IN_VARIANTS;
            }

            if (modus === IN_VARIANTS) {
                series += c;
            }

            if (modus === CHAR  && !splitOptions){
                option += c;
            }

            if (splitOptions){
                if ( option ){
                    options.push(option);
                    option = '';
                }
                variants2options(optionVariants, options);
                optionVariants = null;
                splitOptions = false;
            }


            if (modus === START_VARIANTS){
                series = '';
                modus = IN_VARIANTS;
                optionVariants = (optionVariants) ? optionVariants : [option];
                option = '';

            }

            if (modus === END_VARIANTS) {
                if (series &&  optionVariants) {
                    optionVariants = makeVariants(optionVariants, series, maxLength);
                }
                modus = CHAR;
            }
            if (modus === ONE_OR_MORE) {
                log('ONE_OR_MORE maxLength', maxLength);
                for (let r = 1; r <= maxLength; r++) {
                    optionVariants = (optionVariants) ? optionVariants : [option];
                    if (series) {
                        optionVariants = makeVariants(optionVariants, series, maxLength);
                    }
                }
            }

            if (modus === NIL_OR_MORE) {
                log('NIL_OR_MORE maxLength', maxLength);
                optionVariants = (optionVariants) ? optionVariants : [option];
                for (let r = 1; r <= maxLength; r++) {
                    if (series) {

                        optionVariants = optionVariants.concat(makeVariants(optionVariants, series, maxLength).filter(e=>optionVariants.indexOf(e)<0));
                    }
                }
            }

            log('# c esc  #m modus series option');
            log(idx, c, escaped, modus, MODI[modus], series, option);
            log(options, optionVariants);
            escaped = (c === '\\') ? escaped : false;
            lastChar = c;
            idx++;
        }

        //////////////////////////////////////////////

        if (option) {
            options.push(option);
        }

        variants2options(optionVariants, options);

        log('# c esc  #m modus series option');
        log(idx, c, escaped, modus, MODI[modus], series, option);
        log(options, optionVariants);//, newOptionVariants);

        if (base === 'string'){
            result = options.map(o => `"${o}"`).join('|');
        } else if (base === 'number'){
            result = options
                .filter(o => /\d\.?\d*/.test(o))
                .filter(o => !/0\d+/.test(o))
                .filter(n => (!maxInt || n <= maxInt))
                .filter(n => (!minInt || n >= minInt))
                .join('|').replace(/\|+/g, '|');


        } else {
            result = base;
        }

        if (result.length > 100000) {
            result = null;
        }
        log('state:', option, options, optionVariants);//, newOptionVariants);

        console.log('\n' , pattern, '=>' , result, '\n');

        return result || base;
    }




//
// export function regexpPattern2typeAliasOld(pattern: string, base: string, attr?: object): string {
//     let result = '';
//     let escaped = false;
//     let charModus = false;
//     let options = [];
//     let optionVariants = null;
//     let inRange = false;
//     let rangeStart = null;
//     let newOptionVariants = [];
//     let option  = '';
//     let lastChar = '';
//     let repeat = false;
//     let wasEscaped =false;
//     let maxInt = (attr &&/\d+/.test(attr['maxInclusive'])) ? parseInt(attr['maxInclusive']): undefined;
//     let minInt = (attr &&/\d+/.test(attr['minInclusive'])) ? parseInt(attr['minInclusive']): undefined;
//     let maxLength = (attr &&/\d+/.test(attr['maxLength'])) ? parseInt(attr['maxLength']): undefined;
//     const MAX_LENGTH_VARIANTS = 100;
//     const digits = '0123456789';
//     const a2z = 'abcdefghijklmnopqrstuvwxyz';
//     const A2Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
//     const leestekens =  '~§±!@#$%^&*()-_=+[]{}|;:.,';
//     const allW = digits + a2z + A2Z;
//     const allC = digits + a2z + A2Z + leestekens;
//     const seriesMap = {
//             escaped:   {'.': '.', d: digits, w: allW},
//             unescaped: {'.': allC }
//         };
//
//
//
//     if (!pattern) return base;
//
//
//     function enterCharModus() {
//         charModus = true;
//         optionVariants = (optionVariants) ? optionVariants : [option];
//         newOptionVariants = [];
//         option = '';
//         return false;
//     }
//
//     function leaveCharModus() {
//         optionVariants = newOptionVariants;
//         charModus = false;
//         return false;
//     }
//
//     pattern.split('').some((ch, idx) => {
//         let repeatCount = 0;
//
//         let key, series, c = ch;
//         //log('c:', c, ch);
//         //at least once
//         do  {
//             repeatCount++;
//             //log('repeatCount c:', c, repeatCount, charModus, repeat);
//
//             //never more then 100 options
//             //quit whenever solution will be to long
//             if  (options?.length + optionVariants?.length > MAX_LENGTH_VARIANTS) {
//                 return true;
//             };
//
//             if (c === '\\') {
//                 escaped = true;
//                 return false;
//             }
//
//             if (base !== 'string' && base !== 'number' && c === '.') {
//                 //no valid outcome possible for  other types
//                 //log('invalid pattern for base:', base);
//                 return true;
//             }
//
//
//
//             //enter repeat loop
//             if (pattern[idx + 1] === '+' || pattern[idx + 1] === '*' ) {
//                 repeat = true;
//                 enterCharModus();
//
//             }
//
//             if (pattern[idx + 1] === ']') {
//                 if (pattern[idx + 2] === '+' || pattern[idx + 2] === '*' ) {
//                     repeat = true;
//                     enterCharModus();
//                }
//             }
//
//
//             if (c === '|' && !escaped && !charModus) {
//                 if (option) {
//                     options.push(option);
//                 }
//                 if (optionVariants) {
//                     optionVariants.forEach(ov => {
//                         options.push(ov);
//                     });
//                 }
//                 optionVariants = null;
//                 option = '';
//                 return false;
//             }
//
//             if (c === '[' && !escaped) {
//                 return enterCharModus();
//             }
//
//             if (c === ']' && !escaped) {
//
//                 return leaveCharModus();
//             }
//
//             key    = (escaped) ? 'escaped' : 'unescaped';
//             series = seriesMap[key][c];
//             log('series', series, c, key);
//
//             if (series) {
//                 enterCharModus();
//             }
//
//             //console.log('c:', c, escaped, charModus);
//
//             if (charModus) {
//                 //for * also add empty option
//                 if (pattern[idx + 1] === '*' ){
//                     newOptionVariants = optionVariants;
//                 }
//
//                 optionVariants.forEach((ov, i, a) => {
//                     if (series) {
//                         series.split('').forEach(c => {
//                             newOptionVariants.push(ov + c);
//                         });
//
//                     } else if (c === '-' && !escaped) {
//                         inRange = true;
//
//                     } else if (inRange && rangeStart) {
//                         //newOptionVariants =[];
//                         let range = rangeStart + allW.split(rangeStart).reverse().shift().split(c).shift() + c;
//                         //console.log('range:', range);
//                         range.split('').forEach(r => {
//                             newOptionVariants.push(ov + r);
//                         });
//                         inRange = false;
//                         rangeStart = null;
//                     } else if (pattern[idx + 1] === '-' && !escaped) {
//                         rangeStart = c;
//                     } else {
//                         newOptionVariants.push(ov + c);
//
//                     }
//                 });
//
//             } else {
//                 log('option + c:', option,c);
//                 option += c;
//             }
//             if (series) {
//                 leaveCharModus();
//             }
//
//             //log(attr, optionVariants);
//             if (optionVariants && attr) {
//                 const lastItem = optionVariants[optionVariants?.length - 1];
//
//                 log('test', lastItem, attr['maxLength'], attr['maxInclusive'],maxInt,parseInt(lastItem), option, options,optionVariants, newOptionVariants);
//
//                 if ( lastItem?.length >= attr['maxLength']) {
//                     repeat = false;
//
//                 }
//                 if (maxInt > attr['maxInclusive']) {
//                     repeat = false;
//                     log('>>>');
//                 }
//             }
//
//
//             //never more then 3 times
//             if  (repeatCount > 5) {
//
//                 repeat = false;
//             };
//
//             log('repeatCount', repeatCount)
//             if  (options?.length + optionVariants?.length > MAX_LENGTH_VARIANTS) {
//                 return true;
//             };
//
//         } while(repeat);
//         //log('left repeat loop' ,c);
//         escaped = false;
//         series = 0;
//
//     });
//
//
//     log('state1:', option, options, optionVariants, newOptionVariants);
//
//     //after all chars processed
//     if (option) {
//         options.push(option);
//     }
//
//     if (optionVariants){
//         optionVariants.forEach( ov => {
//             options.push(ov);
//         });
//     }
//     log('state2:', option, options, optionVariants, newOptionVariants);
//
//
//     if (base === 'string'){
//         result = options.map(o => `"${o}"`).join('|');
//     } else if (base === 'number'){
//         result = options
//             .filter(o => /\d\.?\d*/.test(o))
//             .filter(n => (!maxInt || n <= maxInt))
//             .filter(n => (!minInt || n >= minInt))
//             .join('|').replace(/\|+/g, '|');
//         // if (result === '.'){
//         //     result = '0|1|2|3|4|5|6|7|8|9';
//         // }
//
//     } else {
//         result = base;
//     }
//
//     if (result.length > 500) {
//         result = null;
//     }
//     log('state3:', option, options, optionVariants, newOptionVariants);
//
//     console.log('\n' , pattern, '=>' , result, '\n');
//     return result || base;
// }
//
//
//
