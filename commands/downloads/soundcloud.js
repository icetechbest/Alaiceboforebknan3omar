const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'ساوندكلاود',
    aliases: ['soundcloud'],
    platform: 'soundcloud',
    example: 'https://soundcloud.com/artist/track-name'
});
