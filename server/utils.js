

const { YoutubeTranscript } = require('youtube-transcript')

function getTranscript(videoId, lang='vi') {
    return new Promise((resolve, reject) => {
        YoutubeTranscript.fetchTranscript(videoId, {
            lang: lang,
        }).then((data) => {
            resolve(data);
        }).catch(async (err) => {
            const msg = err.message;
            const key = 'Available languages:';
            if (!msg.includes(key)) {
                reject({ 
                    text: 'No transcript found',
                    duration: 0,
                    offset: 0,
                    lang: 'vi',
                });
                return;
            }
            const lang = msg.substring(msg.indexOf(key) + key.length + 1);
            try {
                const data = await YoutubeTranscript.fetchTranscript(videoId, {
                    lang: lang,
                });
                resolve(data);
            } catch (err) {
                reject({ 
                    text: 'No transcript found',
                    duration: 0,
                    offset: 0,
                    lang: lang,
                });
            }
        });
    });
}

// getTranscript('https://youtu.be/QQzt-veR3fY?list=RDabPmZCZZrFA').then((transcript) => {
//     console.log(transcript);
// }).catch((error) => {
//     console.error(error);
// });

module.exports = {
    getTranscript,
};