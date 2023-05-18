const formatMessage = require('format-message');

/**
 * @param {VM|null} vm
 * @returns {object}
 */
const createTranslate = vm => {
    const namespace = formatMessage.namespace();

    const translate = (message, args) => {
        if (message && typeof message === 'object') {
            // already in the expected format
        } else if (typeof message === 'string') {
            message = {
                default: message
            };
        } else {
            throw new Error('unsupported data type in translate()');
        }
        return namespace(message, args);
    };

    const generateId = defaultMessage => `_${defaultMessage}`;

    const getLocale = () => {
        if (vm) return vm.getLocale();
        if (typeof navigator !== 'undefined') return navigator.language;
        return 'en';
    };

    translate.setup = translations => {
        namespace.setup({
            locale: getLocale(),
            missingTranslation: 'ignore',
            generateId,
            translations
        });
    };

    translate.setup({});

    if (vm) {
        vm.on('LOCALE_CHANGED', () => {
            translate.setup({});
        });
    }

    return translate;
};

module.exports = createTranslate;
