const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'تويتر',
    aliases: ['اكس', 'twitter', 'x'],
    platform: 'twitter',
    example: 'https://x.com/username/status/xxxxxxx'
});
