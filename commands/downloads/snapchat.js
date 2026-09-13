const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'سناب',
    aliases: ['سناب-شات', 'snapchat'],
    platform: 'snapchat',
    example: 'https://www.snapchat.com/spotlight/xxxxxxx'
});
