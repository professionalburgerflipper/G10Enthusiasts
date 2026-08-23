// This file is literally to shorthand coloured console logging

const colours = {
    'RED': '\u001b[30m',
    'GREEN': '\u001b[32m',
    'YELLOW': '\u001b[33m',
    'BLUE': '\u001b[34m',
    'MAGENTA': '\u001b[35m',
    'CYAN': '\u001b[36m',
    'WHITE': '\u001b[37m',
    'RESET': '\u001b[0m',
    'BOLD': '\u001b[1m',
    'UNDERLINE': '\u001b[4m'
};

const translations = {
    '&4': colours.RED,
    '&a': colours.GREEN,
    '&e': colours.YELLOW,
    '&9': colours.BLUE,
    '&d': colours.MAGENTA,
    '&b': colours.CYAN,
    '&f': colours.WHITE,
    '&r': colours.RESET,
    '&l': colours.BOLD,
    '&n': colours.UNDERLINE
}

/**
 * A customised console logger that translates colours in the message
 * 
 * Translates colours based on Minecraft Colour codes, hence using the following format:
 * 
 * &4: Red
 * 
 * &a: Green
 * 
 * &e: Yellow
 * 
 * &9: Blue
 * 
 * &d: Magenta
 * 
 * &b: Cyan
 * 
 * &f: White
 * 
 * &r: Reset
 * 
 * &l: Bold
 * 
 * &n: Underline
 * 
 * All other codes are left as plaintext
 * 
 * @param {String} msg - The message to log
 */
function log(msg) {
    let message = `&e&l[${(new Date()).toISOString()}]&r ` + msg
    for (const [key, value] of Object.entries(translations)) message = message.replaceAll(key, value);
    console.log(message);
}

module.exports = log