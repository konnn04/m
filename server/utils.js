

const { text } = require('express');
const { YoutubeTranscript } = require('youtube-transcript')
const {Innertube}  = require('youtubei.js')

function getTranscript(videoId, lang) {
    return new Promise((resolve, reject) => {
        YoutubeTranscript.fetchTranscript(videoId, lang?{
            lang: lang,
        }:{}).then((data) => {
            resolve(data);
        }).catch(async (err) => {
            const msg = err.message;
            console.log(err)
            const key = 'Available languages:';
            if (!msg.includes(key)) {
                reject([{
                    text: 'No transcript found',
                    duration: 0,
                    offset: 0,
                    lang: 'none',
                }]);
                return;
            }
            const lang = msg.substring(msg.indexOf(key) + key.length + 1);
            try {
                const data = await YoutubeTranscript.fetchTranscript(videoId, {
                    lang: lang,
                });
                resolve(data);
            } catch (err) {
                reject([{
                    text: 'No transcript found',
                    duration: 0,
                    offset: 0,
                    lang: 'none',
                }]);
            }
        });
    });
}

async function fetchTranscript(url) {
    const youtube = await Innertube.create({
        gl: 'VN',
        hl: 'vi',
        retrieve_player: false,
    });

    try {
        const info = await youtube.getInfo(url);
        const transcriptData = await info.getTranscript();
        return transcriptData.transcript.content.body.initial_segments.map((segment) => {
            return {
                text: segment.snippet.text,
                duration: (segment.end_ms - segment.start_ms) / 1000,
                offset: segment.start_ms / 1000,
                lang: 'none'
            };
        });
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return [{
            text: 'No transcript found',
            duration: 0,
            offset: 0,
            lang: 'none',
        }]
    }
}

// getTranscript('https://youtu.be/QQzt-veR3fY?list=RDabPmZCZZrFA').then((transcript) => {
//     console.log(transcript);
// }).catch((error) => {
//     console.error(error);
// });

module.exports = {
    getTranscript,
    fetchTranscript,
};







// Example usage of fetchTranscript
const url = 'kPa7bsKwL-c';
fetchTranscript(url).then((transcript) => {
    console.log(transcript);
}).catch((error) => {
    console.error(error);
});


