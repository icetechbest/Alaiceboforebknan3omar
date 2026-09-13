const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'انستقرام',
    aliases: ['انستا', 'instagram'],
    platform: 'instagram',
    example: 'https://www.instagram.com/reel/xxxxxxx'
});
