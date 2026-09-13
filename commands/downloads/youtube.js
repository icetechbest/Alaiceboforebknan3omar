const { makeDownloadCommand } = require('../../core/downloadApi');

module.exports = makeDownloadCommand({
    name: 'يوتيوب',
    aliases: ['يوتيوب-فيديو', 'youtube'],
    platform: 'youtube',
    example: 'https://youtu.be/xxxxxxx'
});
