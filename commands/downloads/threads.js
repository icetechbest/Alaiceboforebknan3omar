const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'ثريدز',
    aliases: ['threads'],
    platform: 'threads',
    example: 'https://www.threads.net/@username/post/xxxxxxx'
});
