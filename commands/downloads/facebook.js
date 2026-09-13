const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'فيسبوك',
    aliases: ['فيس', 'facebook'],
    platform: 'facebook',
    example: 'https://www.facebook.com/watch/?v=xxxxxxx'
});
