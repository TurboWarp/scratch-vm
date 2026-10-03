const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const log = require('../../util/log');
const {fetchWithTimeout} = require('../../util/fetch-with-timeout');
const languageNames = require('scratch-translate-extension-languages');
const formatMessage = require('format-message');

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAACXBIWXMAABYlAAAWJQFJUiTwAAABXFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAOvYwAAACOjo6EhIQOvYx4eHicnJwOvYytra0OvYykpKSfn5/BwcEOvYy0tLSvr6+pqakOvYy1tbXExMQOvYy+vr66urrCwsIOvYzLy8vFxcXAwMC9vb3GxsYOvYzKysrHx8cOvYy9vb20tLTLy8sOvYzR0dHPz88OvYzU1NTS0tIOvYza2trX19fV1dUOvYze3t7c3Nz////9/f36+vr4+Pj0+P/19fXx8fHp8v/u7u7s7Ozq6+7d6//n5+fl5eXS5f/i4uLf4eXg4ODb29vH3v/Z2dnV19y82P/R0dG10/+x0f/KzNSgx/+bxP+rv9uVwf+Rv/+1uMKPvv+huNmIt/h/tP+gpLFsqf9rqf9lpf+Wmqhho/9fov9coP9an/9Znv9Ynf9VnP9Smv9Rmf9Nl/+BhpdJkPMOvYx2fI5rcoZhZ31XXnVRayw6AAAAOXRSTlMAAgUHCgwOEBMbHSAgMTBBQENFTlBSU1ZgZHBwcnOBgI6QkpOgoK2usLS3vMDJydDX1+Dk5OXw8vIZ3wVeAAACCklEQVR42tXU7XPSMBzA8SAoDjYEFcUxrIN1PoHMbaJpC7UFbOfDUKdOUFHLfM6MmP//zoQuCWm90ze+8PsCcsnnfnc0APhvWlipKa0s0M06xljPKa6wbRtwLsPeLgCgNzGtBGSZLc4k3crQgyyjWQkrNj/vtfnKrgBaehNjXcKaGPjtrRhZY67MRmp5ASGtvT8ajdAX+rI/G8tgGYcpcIBEAw5zoasrEHpP0QfP+4gGHuQQlJhrpiUM+4o8D32GUEAmpZPwGTr4hJ5IyMprwkkIJwi9gwLy4rB3gNCkZzh9n3btfFhxMRGBvTeUTdD3F77Tmcvx144r8CFC6Dlsv35lw0j25eQRrJps4PuXd+nbPRfGcs/xL08fih6YcWhWj+CxdQfyHvFF9/CwG3sCydU77myS4z7mh0NChhKKTjYMutG/eOYqP/xByPQ38IILoelXEuKZ7pDplOzEYdUy3capBBBwTIZjMo7DxetrxdT8LU1JEJCff77OPTJrLwbT2lkFBmS8uxuQIArTTYxL85CQLvtAREDpqJQ/NDVDwDqelaPLZTsO7WUOcZhGl6kNK+qsjRSHeY2yzTJgZRpuJ8xiyui4jQyQ6Ri30uEyVbgUdpNJ89ZpOk+WbWHczAKlzA2HSn8JKJVamNIryl5y1e9AK3otWZ3SOlBKLK3fvl8Ef1XqROJf/Xv/Ao6e1+rnxxl1AAAAAElFTkSuQmCC';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/png;base64,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';

/**
 * The url of the translate server.
 * @type {string}
 */
const serverURL = 'https://trampoline.turbowarp.org/translate/';

/**
 * How long to wait in ms before timing out requests to translate server.
 * @type {int}
 */
const serverTimeoutMs = 10000; // 10 seconds (chosen arbitrarily).

/**
 * Class for the translate block in Scratch 3.0.
 * @constructor
 */
class Scratch3TranslateBlocks {
    constructor () {
        /**
         * Language code of the viewer, based on their locale.
         * @type {string}
         * @private
         */
        this._viewerLanguageCode = this.getViewerLanguageCode();

        /**
         * List of supported language name and language code pairs, for use in the block menu.
         * Filled in by getInfo so it is updated when the interface language changes.
         * @type {Array.<object.<string, string>>}
         * @private
         */
        this._supportedLanguages = [];

        /**
         * A randomly selected language code, for use as the default value in the language menu.
         * Properly filled in getInfo so it is updated when the interface languages changes.
         * @type {string}
         * @private
         */
        this._randomLanguageCode = 'en';


        /**
         * The result from the most recent translation.
         * @type {string}
         * @private
         */
        this._translateResult = '';

        /**
         * The language of the text most recently translated.
         * @type {string}
         * @private
         */
        this._lastLangTranslated = '';

        /**
         * The text most recently translated.
         * @type {string}
         * @private
         */
        this._lastTextTranslated = '';
    }

    /**
     * The key to load & store a target's translate state.
     * @return {string} The key.
     */
    static get STATE_KEY () {
        return 'Scratch.translate';
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        this._supportedLanguages = this._getSupportedLanguages(this.getViewerLanguageCode());
        this._randomLanguageCode = this._supportedLanguages[
            Math.floor(Math.random() * this._supportedLanguages.length)].value;

        return {
            id: 'translate',
            name: formatMessage({
                id: 'translate.categoryName',
                default: 'Translate',
                description: 'Name of extension that adds translate blocks'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'getTranslate',
                    text: formatMessage({
                        id: 'translate.translateBlock',
                        default: 'translate [WORDS] to [LANGUAGE]',
                        description: 'translate some text to a different language'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        WORDS: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'translate.defaultTextToTranslate',
                                default: 'hello',
                                description: 'hello: the default text to translate'
                            })
                        },
                        LANGUAGE: {
                            type: ArgumentType.STRING,
                            menu: 'languages',
                            defaultValue: this._randomLanguageCode
                        }
                    }
                },
                {
                    opcode: 'getViewerLanguage',
                    text: formatMessage({
                        id: 'translate.viewerLanguage',
                        default: 'language',
                        description: 'the language of the project viewer'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {}
                }
            ],
            menus: {
                languages: {
                    acceptReporters: true,
                    items: this._supportedLanguages
                }
            }
        };
    }

    /**
     * Computes a list of language code and name pairs for the given language.
     * @param {string} code The language code to get the list of language pairs
     * @return {Array.<object.<string, string>>} An array of language name and
     *   language code pairs.
     * @private
     */
    _getSupportedLanguages (code) {
        return languageNames.menuMap[code].map(entry => {
            const obj = {text: entry.name, value: entry.code};
            return obj;
        });
    }
    /**
     * Get the human readable language value for the reporter block.
     * @return {string} the language name of the project viewer.
     */
    getViewerLanguage () {
        this._viewerLanguageCode = this.getViewerLanguageCode();
        const names = languageNames.menuMap[this._viewerLanguageCode];
        let langNameObj = names.find(obj => obj.code === this._viewerLanguageCode);

        // If we don't have a name entry yet, try looking it up via the Google language
        // code instead of Scratch's (e.g. for es-419 we look up es to get espanol)
        if (!langNameObj && languageNames.scratchToGoogleMap[this._viewerLanguageCode]) {
            const lookupCode = languageNames.scratchToGoogleMap[this._viewerLanguageCode];
            langNameObj = names.find(obj => obj.code === lookupCode);
        }

        let langName = this._viewerLanguageCode;
        if (langNameObj) {
            langName = langNameObj.name;
        }
        return langName;
    }

    /**
     * Get the viewer's language code.
     * @return {string} the language code.
     */
    getViewerLanguageCode () {
        const locale = formatMessage.setup().locale;
        const viewerLanguages = [locale].concat(navigator.languages);
        const languageKeys = Object.keys(languageNames.menuMap);
        // Return the first entry in viewerLanguages that matches
        // one of the available language keys.
        const languageCode = viewerLanguages.reduce((acc, lang) => {
            if (acc) {
                return acc;
            }
            if (languageKeys.indexOf(lang.toLowerCase()) > -1) {
                return lang;
            }
            return acc;
        }, '') || 'en';

        return languageCode.toLowerCase();
    }

    /**
     * Get a language code from a block argument. The arg can be a language code
     * or a language name, written in any language.
     * @param  {object} arg A block argument.
     * @return {string} A language code.
     */
    getLanguageCodeFromArg (arg) {
        const languageArg = Cast.toString(arg).toLowerCase();
        // Check if the arg matches a language code in the menu.
        if (Object.prototype.hasOwnProperty.call(languageNames.menuMap, languageArg)) {
            return languageArg;
        }
        // Check for a dropped-in language name, and convert to a language code.
        if (Object.prototype.hasOwnProperty.call(languageNames.nameMap, languageArg)) {
            return languageNames.nameMap[languageArg];
        }

        // There are some languages we launched in the language menu that Scratch did not
        // end up launching in. In order to keep projects that may have had that menu item
        // working, check for those language codes and let them through.
        // Examples: 'ab', 'hi'.
        if (languageNames.previouslySupported.indexOf(languageArg) !== -1) {
            return languageArg;
        }
        // Default to English.
        return 'en';
    }

    /**
     * Translates the text in the translate block to the language specified in the menu.
     * @param {object} args - the block arguments.
     * @return {Promise} - a promise that resolves after the response from the translate server.
     */
    getTranslate (args) {
        // If the text contains only digits 0-9 and nothing else, return it without
        // making a request.
        if (/^\d+$/.test(args.WORDS)) return Promise.resolve(args.WORDS);

        // Don't remake the request if we already have the value.
        if (this._lastTextTranslated === args.WORDS &&
            this._lastLangTranslated === args.LANGUAGE) {
            return this._translateResult;
        }

        const lang = this.getLanguageCodeFromArg(args.LANGUAGE);

        let urlBase = `${serverURL}translate?language=`;
        urlBase += lang;
        urlBase += '&text=';
        urlBase += encodeURIComponent(args.WORDS);

        const tempThis = this;
        const translatePromise = fetchWithTimeout(urlBase, {}, serverTimeoutMs)
            .then(response => response.text())
            .then(responseText => {
                const translated = JSON.parse(responseText).result;
                tempThis._translateResult = translated;
                // Cache what we just translated so we don't keep making the
                // same call over and over.
                tempThis._lastTextTranslated = args.WORDS;
                tempThis._lastLangTranslated = args.LANGUAGE;
                return translated;
            })
            .catch(err => {
                log.warn(`error fetching translate result! ${err}`);
                return args.WORDS;
            });
        return translatePromise;
    }
}
module.exports = Scratch3TranslateBlocks;
