import fs from 'fs';
import path from 'path';
import { getInfo } from './utils.js';
import { spawn, execSync } from 'child_process';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// const YTDLP_PATH = path.join(__dirname, 'lib', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const YTDLP_PATH = process.env.YTDLP_PATH || path.join(__dirname, 'lib', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// const COOKIE_PATH = path.join(__dirname, './lib/cookies.txt');
// const INFOS_PATH = path.join(__dirname, './public/infos');
// const AUDIOS_PATH = path.join(__dirname, './public/audios');

const STORAGE_DIR = '/tmp';
const PUBLIC_DIR = path.join(STORAGE_DIR, 'public');
const AUDIOS_PATH = path.join(PUBLIC_DIR, 'audios');
const INFOS_PATH = path.join(PUBLIC_DIR, 'infos');
const COOKIE_PATH = path.join(STORAGE_DIR, 'lib', 'cookies.txt');

// Create directories if they don't exist
try {
    [STORAGE_DIR, PUBLIC_DIR, AUDIOS_PATH, INFOS_PATH, path.dirname(COOKIE_PATH)].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
} catch (err) {
    console.error('Error creating directories:', err);
}

async function getIDYT(url) {
    if (url.includes("youtube.com")) {
        return url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be")) {
        return url.split("/")[3].split("?")[0];
    } else {
        return url;
    }
}

async function searchByKeyword(keyword) {
    return new Promise((resolve, reject) => {
        const ytProcess = spawn(YTDLP_PATH, [
            'ytsearch20:' + keyword,
            '--no-playlist',
            '--skip-download',
            '--get-id', '--get-title', '--get-thumbnail', '--get-duration',
            '--get-filename', '-o', '"%(uploader)s"',
            '--no-warnings', '--skip-download',
            '--force-ipv4',
            '--encoding', 'utf-8',
            '--cookies', path.join(__dirname, './lib/cookies.txt'),
            // '--cookies', COOKIE_PATH,
            '--flat-playlist',
            '--compat-options', 'no-youtube-unavailable-videos',
            '--match-filter', '!is_live & live_status!=is_upcoming'
        ]);

        let results = [];

        let info = [];

        ytProcess.stdout.on('data', (data) => {
            info.push(data.toString());
        });

        ytProcess.stderr.on('data', (data) => {
            console.error('yt-dlp stderr:', data.toString());
        });

        ytProcess.on('close', (code) => {
            if (code === 0) {
                const infoString = info.join('');
                const infoArray = infoString.split('\n').filter(line => line.trim() !== '');
                // console.log(infoArray);  
                for (let i = 0; i < infoArray.length; i += 4) {
                    if (!/^(\d+:?){1,3}$/.test(infoArray[i + 3])) {
                        continue;
                    }
                    results.push({
                        title: infoArray[i],
                        id: infoArray[i + 1],
                        thumbnail: 'https://i.ytimg.com/vi/' + infoArray[i + 1] + '/hqdefault.jpg',
                        duration: infoArray[i + 3],
                        uploader: infoArray[i + 2],
                        url: `https://www.youtube.com/watch?v=${infoArray[i + 1]}`
                    });
                }
                resolve(results);
            } else {
                reject(new Error('Lấy thông tin thất bại.'));
            }
        });

        ytProcess.on('error', (err) => {
            console.error('Lỗi yt-dlp:', err.message);
            reject(err);
        });
    });
}

async function getAudio(videoId) {
    videoId = await getIDYT(videoId)
    return new Promise(async (resolve, reject) => {
        try {
            const audioFilePath = path.join(AUDIOS_PATH, `${videoId}.webm`); // Sử dụng định dạng mặc định của yt-dlp
            const infoFilePath = path.join(INFOS_PATH, `${videoId}.json`);
            if (fs.existsSync(audioFilePath) && fs.existsSync(infoFilePath)) {
                console.log(`File đã tồn tại: ${audioFilePath}`);
                const info = JSON.parse(
                    await fs.readFileSync(infoFilePath, 'utf-8')
                );
                return resolve({
                    'path': audioFilePath,
                    'id': info.id,
                    'title': info.title,
                    'title_': info.title_,
                    'thumbnail': info.thumbnail,
                    'duration': info.duration,
                    'uploader': info.uploader,
                    'url': 'https://www.youtube.com/watch?v=' + info.id,
                    'view_count': info.view_count,
                    'category': info.category,
                    'publish_date': info.publish_date,
                    'description': info.description,
                    'timestamp': info.timestamp,
                    'dowmloaded': true,
                    'avatar': info.avatar,
                });
            }

            // const info = await getInformation(videoId)
            const info = await getInfo(videoId)
            if ('error' in info) {
                return reject(info);
            }
            console.log('File chưa tồn tại. Bắt đầu tải...');
            const ytProcess = spawn(YTDLP_PATH, [
                '-f', 'bestaudio[ext=webm]+bestaudio[ext=m4a]/bestaudio', // Tải luồng âm thanh tốt nhất, ưu tiên webm và m4a
                '-o', `${AUDIOS_PATH}/%(id)s.%(ext)s`, // Lưu theo ID video và giữ nguyên định dạng gốc
                '--cookies', path.join(__dirname, './lib/cookies.txt'),
                // '--cookies', COOKIE_PATH,
                '--force-ipv4',
                '--no-playlist', // Không tải playlist
                `https://www.youtube.com/watch?v=${videoId}`,
            ]);

            ytProcess.stderr.on('data', (data) => {
                console.error('yt-dlp stderr:', data.toString());
            });

            ytProcess.on('close', async (code) => {
                if (code === 0) {
                    resolve({
                        'path': audioFilePath,
                        'title': info.title,
                        'title_': info.title_,
                        'thumbnail': info.thumbnail,
                        'duration': info.duration,
                        'uploader': info.uploader,
                        'id': info.id,
                        'url': 'https://www.youtube.com/watch?v=' + info.id,
                        'view_count': info.view_count,
                        'category': info.category,
                        'publish_date': info.publish_date,
                        'description': info.description,
                        'timestamp': info.timestamp,
                        'dowmloaded': true,
                        'avatar': info.avatar,
                        'lang': info.lang,
                    });
                } else {
                    console.error(`Lỗi khi tải file: ${code}`);
                    reject(new Error('Tải file thất bại.'));
                }
            });

            ytProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            ytProcess.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            ytProcess.on('error', (err) => {
                console.error('Lỗi yt-dlp:', err.message);
                reject(err);
            });

        } catch (error) {
            console.error(error);
            reject(error);
        }
    });
}

async function getInformation(url) {
    return new Promise(async (resolve, reject) => {
        const ytProcess = await spawn(YTDLP_PATH, [
            '--no-playlist',
            '--get-id', '--get-title', '--get-duration',
            '--get-filename', '-o', '"%(uploader)s"',
            '--no-warnings', '--skip-download',
            '--force-ipv4',
            '--encoding', 'utf-8',
            '--cookies', path.join(__dirname, './lib/cookies.txt'),
            // '--cookies', COOKIE_PATH,
            url,
        ]);
        let id = '';
        let title = '';
        let duration = '';
        let thumbnail = '';
        let uploader = '';

        let info = [];

        ytProcess.stdout.on('data', (data) => {
            info.push(data.toString());
            console.log(data.toString());
        });

        ytProcess.stderr.on('data', (data) => {
            console.error('yt-dlp stderr:', data.toString());
        });

        ytProcess.on('close', async (code) => {
            if (code === 0) {
                const infoString = info.join('');
                const infoArray = infoString.split('\n').filter(line => line.trim() !== '');
                title = infoArray[0];
                id = infoArray[1];
                thumbnail = 'https://img.youtube.com/vi/' + infoArray[1] + '/hqdefault.jpg';
                duration = infoArray[3];
                uploader = infoArray[2];

                if (id && title && duration && thumbnail) {
                    const infoObject = {
                        id: id,
                        title: title,
                        duration: duration,
                        thumbnail: thumbnail,
                        uploader: uploader,
                    };

                    await fs.writeFileSync(path.join(INFOS_PATH, `${id}.json`), JSON.stringify(infoObject));
                    resolve(infoObject);
                } else {
                    reject({ error: 'Lấy thông tin thất bại.' });
                }
            } else {
                console.error('Lỗi khi lấy thông tin:', code);
                reject(new Error('Lấy thông tin thất bại.'));
            }
        });

        ytProcess.on('error', (err) => {
            console.error('Lỗi yt-dlp:', err.message);
            reject(err);
        });
    });
}


async function getMusicList(keyword) {
    try {

        // Create directories if they don't exist
        if (!fs.existsSync(AUDIOS_PATH)) {
            fs.mkdirSync(AUDIOS_PATH, { recursive: true });
        }
        if (!fs.existsSync(INFOS_PATH)) {
            fs.mkdirSync(INFOS_PATH, { recursive: true });
        }

        // Return empty array if directory is empty
        const audioFiles = fs.existsSync(AUDIOS_PATH) ? fs.readdirSync(AUDIOS_PATH) : [];
        if (audioFiles.length === 0) {
            return [];
        }

        // const audioFiles = fs.readdirSync(AUDIOS_PATH);
        const audioInfos = audioFiles.map(file => {
            const info = fs.readFileSync(path.join(INFOS_PATH, `${file.split('.')[0]}.json`));
            const audioInfo = JSON.parse(info);
            audioInfo['url'] = 'https://www.youtube.com/watch?v=' + audioInfo.id;
            audioInfo['path'] = path.join(AUDIOS_PATH, audioInfo.id + '.webm');
            return audioInfo;
        });

        if (keyword) {
            const filteredAudioInfos = audioInfos
                .map(audioInfo => {
                    audioInfo.title_normalize = audioInfo.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    return audioInfo;
                })
                .filter(audioInfo =>
                    audioInfo.title_normalize.includes(keyword.toLowerCase())
                );
            return filteredAudioInfos;
        }

        return audioInfos;
    } catch (error) {
        // throw new Error(error.message);
        console.error('Error in getMusicList:', error);
        return [];
    }
}

function deleteAudio(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const audioFilePath = path.join(AUDIOS_PATH, `${id}.webm`);
            const infoFilePath = path.join(INFOS_PATH, `${id}.json`);
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
            }
            if (fs.existsSync(infoFilePath)) {
                fs.unlinkSync(infoFilePath);
            }
            resolve({ message: 'Xóa file thành công.' });
        } catch (error) {
            reject(error);
        }
    });
}

function setCookies(cookies) {
    return new Promise((resolve, reject) => {
        try {
            fs.writeFileSync(COOKIE_PATH, cookies);
            fs.writeFileSync(path.join(__dirname, './lib/cookies.txt'), cookies);
            resolve({ message: 'Lưu cookies thành công.' });
        } catch (error) {
            reject({ message: 'Lưu cookies thất bại.' });
        }
    });
}

export default {
    getAudio,
    getMusicList,
    deleteAudio,
    setCookies,
    searchByKeyword,
    getInformation
};

export {
    getAudio,
    getMusicList,
    deleteAudio,
    setCookies,
    searchByKeyword,
    getInformation
}