const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'بينتيرست',
    aliases: ['pinterest'],
    platform: 'pinterest',
    example: 'https://pin.it/xxxxxxx'
});
