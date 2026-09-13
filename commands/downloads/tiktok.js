const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'تيكتوك',
    aliases: ['تيك-توك', 'tiktok'],
    platform: 'tiktok',
    example: 'https://vm.tiktok.com/xxxxxxx'
});
