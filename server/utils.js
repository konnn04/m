import { YoutubeTranscript } from 'youtube-transcript';
import { Innertube } from 'youtubei.js';
import fs from 'fs';
import path from 'path';
import { franc } from 'franc';

const STORAGE_DIR = '/tmp';
const PUBLIC_DIR = path.join(STORAGE_DIR, 'public');
const AUDIOS_PATH = path.join(PUBLIC_DIR, 'audios');
const INFOS_PATH = path.join(PUBLIC_DIR, 'infos');

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

// Convert seconds to time format HH:MM:SS
const secToTime = (sec) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function getAvatarUploader(url) {
    const youtube = await Innertube.create({
        gl: 'VN',
        hl: 'vi',
        retrieve_player: false,
    });
    return youtube.getChannel(url).then((data) => {
        return data?.metadata?.avatar[0]?.url
    }).catch((error) => {
        console.error(error);
    });
}

// Export trendingSongs function
async function getInfo(url) {
    const youtube = await Innertube.create({
        gl: 'VN',
        hl: 'vi',
        retrieve_player: false,
    });
    const data = await youtube.getInfo(url)
    // return data
    const video = {
        id: data?.basic_info?.id,
        channel_id: data?.basic_info?.channel_id,
        title_: data?.basic_info?.title,
        title: data?.primary_info?.title?.text,
        duration: secToTime(parseInt(data?.basic_info?.duration ) || 0),
        view_count: data?.basic_info?.view_count,
        uploader: data?.basic_info?.author,
        category: data?.basic_info?.category,
        publish_date: data?.primary_info?.published?.text,
        description: data?.secondary_info?.description?.text,
        thumbnail : 'https://img.youtube.com/vi/' + data?.basic_info?.id + '/hqdefault.jpg',
        timestamp: new Date().getTime(),
        avatar: await getAvatarUploader(data?.basic_info?.channel_id),
        lang: await franc(data?.basic_info?.title + ' ' + data?.secondary_info?.description?.text),
    }

    await writeFile(JSON.stringify(video), path.join(INFOS_PATH, video.id + '.json'));
    return video;
}

async function searchVideo(query) {
    const youtube = await Innertube.create({
        gl: 'VN',
        hl: 'vi',
        retrieve_player: false,
    });
    const data = await youtube.search(query, {type: 'video'})
    return data.results
    .filter((item) => item.type === 'Video')
    .map((item) => {
        return {
            title: item?.title?.text,
            id: item?.id,
            thumbnail: 'https://i.ytimg.com/vi/' + item?.id + '/hqdefault.jpg',
            duration: item?.duration?.text,
            view_count: item?.short_view_count?.text,
            uploader: item?.author?.name,
            publish_date: item?.published,
            url: 'https://www.youtube.com/watch?v=' + item?.id,
            downloaded: fs.existsSync(path.join(AUDIOS_PATH, item?.id + '.webm')),
        }
    })
}

function writeFile(data, path) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}



module.exports = {
    getTranscript,
    fetchTranscript,
    getInfo,
    searchVideo,
    getAvatarUploader
};

// getInfo('ZRtdQ81jPUQ').then((data) => {
//     console.log(data);
// }).catch((error) => {
//     console.error(error);
// });

// // Example usage of getTranscript
// getTranscript('https://youtu.be/QQzt-veR3fY?list=RDabPmZCZZrFA').then((transcript) => {
//     console.log(transcript);
// }).catch((error) => {
//     console.error(error);
// });

// // Example usage of fetchTranscript
// const url = 'kPa7bsKwL-c';
// fetchTranscript(url).then((transcript) => {
//     console.log(transcript);
// }).catch((error) => {
//     console.error(error);
// });


