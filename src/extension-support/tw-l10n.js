const formatMessage = require('format-message');

const createTranslate = () => {
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

    translate.setup = translations => {
        namespace.setup({
            locale: navigator.language,
            missingTranslation: 'ignore',
            generateId,
            translations
        });
    };

    translate.setup({});

    return translate;
};

module.exports = createTranslate;
