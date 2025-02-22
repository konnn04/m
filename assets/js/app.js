const host = "https://gregarious-connection-production.up.railway.app"
// const host = "https://m-dxce.onrender.com"
// const host = "http://localhost:3000"
const player = new MusicPlayer();
let allSongCache = [];
let userInteracting = false;

const socket = io(host);
socket.on("connect", () => {
    console.log("Connected to Socket.IO server");
});

uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

function sendCurrentSongInfo( data) {
    data.clientId = localStorage.getItem("clientId");
    socket.emit('song-update', data);
}

const main = async () => {    
    // Init clientID
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
        localStorage.setItem("clientId", uuidv4());
    }
    $("#client-id").text(localStorage.getItem("clientId"));
    $("#copy-client-id").click(() => {
        navigator.clipboard.writeText(localStorage.getItem("clientId"));
        toasty("Success", "Client ID copied to clipboard", "success");
    })

    //Update current playlist
    player.on("playlistUpdate", async () => {
        $("#current-playlist").empty();
        await updatePlaylist(player.getPlaylist());
        
    });
    $("#home").addClass("active");
    await initHome()
    await checkParams() || await initDefaultPlaylist();
    await initEvent();
    await player.init();
   
};

function updateRecentlyPlayed(recentlyPlayed) {
    const recentlyContainer = document.getElementById('recently');
    recentlyContainer.innerHTML = '';

    recentlyPlayed.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item card pointer position-relative';
        div.innerHTML = `
            <img class="card-img-top" src="${song.cover}" alt="Card image cap">
            <div class="card-body">
            <h5 class="card-title">${song.title}</h5>
            <p class="card-text">${song.uploader}</p>
            </div>
            <div class="play-song">
            <i class="bi bi-play-fill"></i>
            </div>`;
        div.addEventListener('click', async function () {
            const id_list = allSongCache.map(song => song.id);
            if (!id_list.includes(song.id)) {
                // Remove it in localstorage and refresh the list
                recentlyPlayed = recentlyPlayed.filter(song_ => song_.id !== song.id);
                localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
                updateRecentlyPlayed(recentlyPlayed);
                toasty("Error", "This song is not in the list", "error");
                // Auto downloading
                try {
                    toasty("Info", "This song is downloading", "info");
                    const data = await downloadSong(song.id);
                    toasty("Success", "Song downloaded successfully", "success");
                } catch (error) {
                    toasty("Error", "An error occurred while downloading the song", "error");
                    console.error(error);
                } finally {
                }
                return;
            }

            const playlist = createPlaylist(recentlyPlayed);
            player.setSongs(playlist);
            player.playIndex(index);
            // updatePlaylist(player.getPlaylist());
            $("#main").addClass("active");
        });
        recentlyContainer.appendChild(div);
    });

    $("#recently").parent().find('.see-more').click(() => {
        showPlayDetail(recentlyPlayed, "Recently Played", "Songs you've recently listened to");
    });
}

async function initDefaultPlaylist() {
    const songs = await getSongs();
    const playlist = createPlaylist(songs.data);
    allSongCache = playlist;
    player.setSongs(playlist);
    // updatePlaylist(player.getPlaylist());
}

async function updatePlaylist(playlist) {
    for (const [index, song] of playlist.entries()) {
        const info = await song.getInfo();
        const div = document.createElement("div");
        div.className = "list-item d-flex align-items-center gap-3 p-3";
        if (index === player.getCurrrentSongIndex()) {
            div.classList.add("active");
        }
        div.innerHTML = `
              <img src="https://i.ytimg.com/vi/${info.id}/hqdefault.jpg" alt="thumbnail"
                  class="rounded" style="width: 64px; height: 64px; object-fit: cover;">
              <div class="flex-grow-1 overflow-hidden">
                  <h5 class="mb-1">${info.title}</h5>
                  <p class="text-secondary mb-0">${info.uploader}</p>
              </div>
              <div class="d-flex align-items-center gap-3">
                  <span class="text-secondary">${song.duration}</span>
                  <button class="btn btn-link text-light">
                      <i class="bi bi-play-fill"></i>
                  </button>
              </div>`;
        div.addEventListener("click", function () {
            player.playIndex(index);
        });
        
        $("#current-playlist").append(div);
    }

}

function refreshPlaylistIndex() {
    $(".list-item").removeClass("active");
    $(".list-item").eq(player.getCurrrentSongIndex()).addClass("active");
    setTimeout(() => {
        document.getElementById("current-playlist").scrollTo({
            top: document.querySelector(".list-item.active").offsetTop - document.getElementById("current-playlist").offsetTop,
            behavior: "smooth"
        })
    }, 100);
}

const initEvent = () => {
    $("#back-to-home").click(function () {
        $("#home").addClass("active");
        $("#main").removeClass("active");
        $("#playlist-detail").removeClass("active");
        $("#search").removeClass("active");
        $("#manager-music").removeClass("active");
        $("#playlist-manager").removeClass("active");
    });

    $(".nav-item").click(function (e) {
        e.preventDefault();
        $(".nav-item").removeClass("active");
        $(this).addClass("active");
        $("#playlist-manager").removeClass("active");
        $("#main").removeClass("active");
        $("#playlist-detail").removeClass("active");
        $("#search").removeClass("active");
        $("#home").removeClass("active");
        $("#manager-music").removeClass("active");
        

        $($(this).attr("href")).addClass("active");
    });

    //Toggle player screen
    $("#info").click(function (e) {
        e.preventDefault();
        $("#main").toggleClass("active");
    });
    // Search
    $(".search-container input").keypress(async function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            const query = $(this).val();
            await searchFunc(query);
        }
    });

    $(".input-group>span").click(async function (e) {
        e.preventDefault();
        const query = $(".search-container input").val();
        await searchFunc(query);
    });

    // Export URLs to clipboard
    $("#export-urls").click(async function () {
        try {
            const urls = (await getSongs()).data.map(song => song.url).join('\n');
            await navigator.clipboard.writeText(urls);
            toasty("Success", "URLs copied to clipboard", "success");
        } catch (error) {
            console.error("Error exporting URLs:", error);
            toasty("Error", "An error occurred while exporting URLs\n" + error.message, "error");
        }
    });

    // Import URLs from clipboard
    $("#import-urls-btn").click(async function () {
        try {
            $(this).attr("disabled", true);
            $("#loading-4").addClass("loader-4");
            const urls = document.getElementById('import-urls').value.split('\n').filter(url => url.trim() !== '');
            if (urls.length === 0) {
                toasty("Error", "No URLs to import", "error");
                return;
            }
            // if (urls.length > 30) {
            //     toasty("Error", "Too many URLs to import, minimun is 30 urls", "error");
            //     return;
            // }
            try {
                await downloadSong(urls[0]);
                toasty("Success", "Song 1 imported successfully", "success");
            } catch (error) {
                console.error("Error importing URL 1:", error);
                toasty("Error", "An error occurred while importing URL 1\n" + error.message, "error");
            }

            for (let i = 1; i < urls.length; i++) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await downloadSong(urls[i]);
                    toasty("Success", `Song ${i + 1} imported successfully`, "success");
                } catch (error) {
                    console.error(`Error importing URL ${i + 1}:`, error);
                    toasty("Error", `An error occurred while importing URL ${i + 1}\n${error.message}`, "error");
                }
            }

            toasty("Success", "Songs imported successfully", "success");
        } catch (error) {
            console.error("Error importing URLs:", error);
            toasty("Error", "An error occurred while importing URLs\n" + error.message, "error");
        } finally {
            document.getElementById('import-urls').value = '';
            $(this).attr("disabled", false);
            $("#loading-4").removeClass("loader-4");
        }
    });

    // Export songs to local storage
    $("#save-urls").click(async function () {
        const c = confirm("Are you sure you want to export songs to local storage?") 
        if (!c) return;
        try {
            const songs = (await getSongs()).data.map(song => song.url).join('\n');
            localStorage.setItem('songs', JSON.stringify(songs));
            toasty("Success", "Songs exported to local storage", "success");
        } catch (error) {
            console.error("Error exporting songs:", error);
            toasty("Error", "An error occurred while exporting songs\n" + error.message, "error");
        }
    });

    // Get songs from local storage
    $("#get-urls").click(async function () {
        try {
            const songs = JSON.parse(localStorage.getItem('songs'));
            if (!songs) {
                toasty("Error", "No songs found in local storage", "error");
                return;
            }
            document.getElementById('import-urls').value = songs;
            toasty("Success", "Songs imported from local storage", "success");
        } catch (error) {
            console.error("Error importing songs:", error);
            toasty("Error", "An error occurred while importing songs\n" + error.message, "error");
        }
    })

    //Postcookie
    $("#set-cookie-btn").click(async function () {
        if ($("#youtube-cookie").val().trim() === "") {
            toasty("Error", "No cookie found", "error");
            return;
        }
        try {
            const res = await axios.post(`${host}/api/cookie`, {
                cookie: $("#youtube-cookie").val(),
            });
            toasty("Success", res.data.message, "success");
        } catch (error) {
            console.error("Error setting cookie:", error);
            toasty("Error", "An error occurred while setting cookie\n" + error.message, "error");
        }
    });

    player.on("play", async () => {
        $("title").text(player.getCurrentSong().getInfo().title);
        const currentSong = player.getCurrentSong().getInfo();
        let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
        recentlyPlayed = recentlyPlayed.filter(song => song.id !== currentSong.id);
        recentlyPlayed.unshift(currentSong);
        if (recentlyPlayed.length > 20) {
            recentlyPlayed = recentlyPlayed.slice(0, 20);
        }
        localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
        updateRecentlyPlayed(recentlyPlayed);
        refreshPlaylistIndex()
    });

    // Toogle lyrics
    $("#toggle-lyrics").click(function () {
        $("#container-toggle").toggleClass("active");
        if ($("#container-toggle").hasClass("active")) {
            $("#toggle-lyrics b").text("Hide Lyrics");
        } else {
            $("#toggle-lyrics b").text("Show Lyrics");
        }
    });

    // Request lyrics
    $("#request-lyric").click(async function () {
        $(this).attr("disabled", true);
        $(".lyric-content").html(`
            <div class="d-flex flex-column align-items-center gap-3 w-100 p-3">
            <div class="loader-2"></div> 
            <span class="text-secondary">Fetching lyrics...</span>
            </div>
        `);
        const currentSongId = player.getCurrentSong().getInfo().id;
        try {
            // console.log("Fetching subtitles for video:", currentSongId);
            const response = await axios.get(`${host}/api/get-subtitles?videoId=${currentSongId}`);
            $(".lyric-content").empty();
            const subtitles = response.data;
            subtitles.forEach((subtitle) => {
                const p = document.createElement("p");
                p.className = "lyric-text"
                p.style.fontSize = "1.8rem";
                p.setAttribute("offset",subtitle.offset)
                p.setAttribute("duration",subtitle.duration)
                p.textContent = subtitle.text;
                $(".lyric-content").append(p);  
                p.addEventListener("click", function () {
                    setTimeout(() => {
                        userInteracting = false;
                    }, 100);
                    player.setCurrentTime(parseFloat(this.getAttribute("offset")));
                    
                });
            });
        } catch (error) {
            const p = document.createElement("p");
            p.className = "lyric-text"
            p.style.fontSize = "1.8rem";
            p.textContent = "No lyrics found";
            $(".lyric-content").append(p);  

            console.error("Error fetching subtitles:", error);
            // toasty("Error", "An error occurred while fetching subtitles\n" + error.message, "error");
        }finally{
            $("#request-lyric").hide();
            $(this).attr("disabled", false);
        }
    });

    

    player.on("timeupdate", () => {
        updateLyrics();
    });

    function updateLyrics() {
        const currentTime = player.getCurrentTime();
        const lyrics = document.querySelectorAll(".lyric-text");
        lyrics.forEach((lyric, index) => {
            const start = parseFloat(lyric.getAttribute("offset"));
            const end = parseFloat(lyric.getAttribute("duration")) + start;
            if (currentTime >= start && currentTime <= end) {
                lyric.classList.add("active");
                if ($("#main").hasClass("active") && $("#container-toggle").hasClass("active") && !userInteracting) {
                    document.querySelector(".lyric-box").scrollTo({
                        top: lyric.offsetTop - document.querySelector(".lyric-box").offsetTop - document.querySelector(".lyric-box").clientHeight / 2 + lyric.clientHeight / 2,
                        behavior: 'smooth'
                    });
                }
            } else {
                lyric.classList.remove("active");
            }
        })
    }

    document.querySelector(".lyric-box").addEventListener("click", setUserInteracting);
    document.querySelector(".lyric-box").addEventListener("scroll", (e) => {
        setUserInteracting(500);
    });
    document.querySelector(".lyric-box").addEventListener("touchstart", setUserInteracting);
    document.querySelector(".lyric-box").addEventListener("touchmove", setUserInteracting);

    function setUserInteracting(time=5000) {
        userInteracting = true;
        clearTimeout(userInteractingTimeout);
        userInteractingTimeout = setTimeout(() => {
            userInteracting = false;
        }, time);
    }

    let userInteractingTimeout;

    player.on("update", () => {
        // $("#request-lyric").show();
        $(".lyric-content").empty();
        $("#request-lyric").click();
        const currentSongId = player.getCurrentSong().getInfo().id;
        const newUrl = `${window.location.pathname}?id=${currentSongId}`;
        window.history.replaceState({}, document.title, newUrl);
        sendCurrentSongInfo( player.getCurrentSong().getInfo());
    });

    // See more detail
    $(".add-to-playlist").click(() => {
        const playlistBox = document.createElement('div');
        playlistBox.className = 'modal fade';
        playlistBox.id = 'playlistModal';

        // Get stored playlist names or use defaults
        const playlistNames = JSON.parse(localStorage.getItem('playlistNames')) || {
            playlist1: 'Playlist 1',
            playlist2: 'Playlist 2',
            playlist3: 'Playlist 3'
        };

        playlistBox.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Add to Playlist</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="playlist-item mb-2 d-flex align-items-center">
                            <div class="form-check flex-grow-1">
                                <input class="form-check-input" type="checkbox" id="playlist1Check">
                                <input type="text" class="playlist-name-input bg-dark text-light border-0" 
                                    data-playlist="playlist1" value="${playlistNames.playlist1}">
                            </div>
                            <button class="btn btn-sm btn-outline-light save-name-btn" data-playlist="playlist1">
                                <i class="bi bi-check"></i>
                            </button>
                        </div>
                        <div class="playlist-item mb-2 d-flex align-items-center">
                            <div class="form-check flex-grow-1">
                                <input class="form-check-input" type="checkbox" id="playlist2Check">
                                <input type="text" class="playlist-name-input bg-dark text-light border-0" 
                                    data-playlist="playlist2" value="${playlistNames.playlist2}">
                            </div>
                            <button class="btn btn-sm btn-outline-light save-name-btn" data-playlist="playlist2">
                                <i class="bi bi-check"></i>
                            </button>
                        </div>
                        <div class="playlist-item mb-2 d-flex align-items-center">
                            <div class="form-check flex-grow-1">
                                <input class="form-check-input" type="checkbox" id="playlist3Check">
                                <input type="text" class="playlist-name-input bg-dark text-light border-0" 
                                    data-playlist="playlist3" value="${playlistNames.playlist3}">
                            </div>
                            <button class="btn btn-sm btn-outline-light save-name-btn" data-playlist="playlist3">
                                <i class="bi bi-check"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="saveToPlaylists">Save</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(playlistBox);

        // Handle playlist name changes
        playlistBox.querySelectorAll('.save-name-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const playlistKey = this.dataset.playlist;
                const newName = playlistBox.querySelector(`.playlist-name-input[data-playlist="${playlistKey}"]`).value.trim();
                
                if (newName) {
                    playlistNames[playlistKey] = newName;
                    localStorage.setItem('playlistNames', JSON.stringify(playlistNames));
                    toasty("Success", "Playlist name updated", "success");
                }
            });
        });

        // Load existing playlists and check boxes if song exists
        const currentSong = player.getCurrentSong().getInfo();
        const savedPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || {
            playlist1: [],
            playlist2: [],
            playlist3: []
        };

        // Check boxes based on song presence in playlists
        document.getElementById('playlist1Check').checked = savedPlaylists.playlist1.some(song => song.id === currentSong.id);
        document.getElementById('playlist2Check').checked = savedPlaylists.playlist2.some(song => song.id === currentSong.id);
        document.getElementById('playlist3Check').checked = savedPlaylists.playlist3.some(song => song.id === currentSong.id);

        const modal = new bootstrap.Modal(playlistBox);
        modal.show();

        document.getElementById('saveToPlaylists').addEventListener('click', function() {
            const playlists = ['playlist1', 'playlist2', 'playlist3'];
            
            playlists.forEach(playlistName => {
                const checkbox = document.getElementById(`${playlistName}Check`);
                
                if(checkbox.checked) {
                    // Add song if not already in playlist
                    if(!savedPlaylists[playlistName].some(song => song.id === currentSong.id)) {
                        savedPlaylists[playlistName].push(currentSong);
                    }
                } else {
                    // Remove song if checkbox is unchecked
                    savedPlaylists[playlistName] = savedPlaylists[playlistName].filter(
                        song => song.id !== currentSong.id
                    );
                }
            });

            // Save updated playlists to localStorage
            localStorage.setItem('userPlaylists', JSON.stringify(savedPlaylists));
            
            toasty("Success", "Playlists updated successfully", "success");
            modal.hide();
            
            // Clean up modal
            playlistBox.remove();
        });

        // Clean up modal when closed
        playlistBox.addEventListener('hidden.bs.modal', function() {
            playlistBox.remove();
        });
    });

};

function showPlayDetail(songs, title = "All Songs", desciprion = "All Songs") {
    $("#playlist-detail").toggleClass("active");
    $("#home").removeClass("active");
    $("#main").removeClass("active");
    $("#manager-music").removeClass("active");

    $("#playlist-detail-img img:nth-child(1)").attr("src", songs[0]?.thumbnail);
    $("#playlist-detail-img img:nth-child(2)").attr("src", songs[1]?.thumbnail || songs[0]?.thumbnail);
    $("#playlist-detail-img img:nth-child(3)").attr("src", songs[2]?.thumbnail || songs[0]?.thumbnail);

    $(".playlist-title").text(title);
    $(".playlist-description").text(desciprion);
    $("#play-playlist-detail").off("click");
    $("#play-playlist-detail").click(function () {
        const pl = createPlaylist(songs);
        player.setSongs(pl);
        player.playIndex(0);
        // updatePlaylist(player.getPlaylist());
        $("#main").addClass("active");
    });

    $("#playlist-detail-list").empty();
    songs.forEach((song, index) => {
        const div = document.createElement("div");
        div.className = "playlist-item d-flex align-items-center gap-3 p-3";
        div.innerHTML = `
            <img src="${song.thumbnail}" alt="thumbnail" class="rounded" style="width: 64px; height: 64px; object-fit: cover;">
            <div class="flex-grow-1 overflow-hidden">
                <h5 class="mb-1">${song.title}</h5>
                <p class="text-secondary mb-0">${song.uploader}</p>
            </div>
            <div class="d-flex align-items-center gap-3">
                <span class="text-secondary">${song.duration}</span>
                <button class="btn btn-link text-light">
                    <i class="bi bi-play-fill"></i>
                </button>
            </div>
        `;
        div.addEventListener("click", function() {
            const pl = createPlaylist(songs);
            player.setSongs(pl); 
            player.playIndex(index);
            $("#main").addClass("active");
        });
        $("#playlist-detail-list").append(div);
    });
}


function searchFunc(query) {
    $(".search-container input").attr("disabled", true);
    $("#home").removeClass("active");
    $("#main").removeClass("active");    
    $("manager-music").removeClass("active");
    $("#playlist-detail").removeClass("active");

    $("#search").addClass("active");
    $(".search-container input").val(query);
    $("#kw").text(query);
    $("#result-length").text(0 + " results");

    $(".search-results").empty();
    $(".search-results").html(`<div class="loader-2"></div> <p class="text-secondary">Searching...</p>`);

    axios.get(`${host}/api/search`, {
        params: { kw: query },
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })
    .then(response => {
        const data = response.data;
        $(".search-results").empty();
        $("#result-length").text(data.length + " results");
        data.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = "result-item d-flex align-items-center gap-3 p-3";
            div.setAttribute("video_id", item.id);
            div.innerHTML = `<img src="${item.thumbnail}" alt="thumbnail" class="rounded"
                    style="width: 64px; height: 64px; object-fit: cover;">
                    <div class="flex-grow-1">
                        <h5 class="mb-1">${item.title}</h5>
                        <p class="text-secondary mb-0">${item.uploader}</p>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <span class="text-secondary">${item.duration}</span>
                        <button class="btn btn-link text-light demo-btn result-item-demo" title="Demo">
                            <i class="bi bi-youtube"></i>
                        </button>
                        <button class="btn btn-link text-light download-btn result-iten-download" 
                                title="${item.downloaded ? 'Already downloaded' : 'Download'}"
                                ${item.downloaded ? 'disabled' : ''}>
                            <i class="bi ${item.downloaded ? 'bi-check-lg' : 'bi-download'}"></i>
                        </button>
                        <button class="btn btn-link text-light play-btn result-item-play ${item.downloaded ? 'downloaded' : ''}" title="Play" >
                            <i class="bi bi-play-fill"></i>
                        </button>
                    </div>`;


            $(".search-results").append(div);
        });

        $(".result-item-play").click(async function (ee) {
            try {
                if (!$(this).hasClass("downloaded")) {
                    toasty("Playing", "This song is downloading and will be played soon", "info");
                }
                $(this).attr("disabled", true);
                $(this).find("i").removeClass("bi-play-fill").addClass("bi-hourglass-split");
                const id = $(this).closest(".result-item").attr("video_id");
                const data = await downloadSong(id);
                // const song = new Song(data.id, data.title, data.uploader, host + data.path, data.thumbnail, data.duration);
                player.setSongs(recommendedSongs(data));
                player.playIndex(0);
                $("#main").addClass("active");
                // updatePlaylist(player.getPlaylist());
            } catch (error) {
                toasty("Error", "An error occurred while downloading the song", "error");
                console.error(error);
            } finally {
                $(this).attr("disabled", false);
                $(this).parent().find(".download-btn").attr("disabled", false);
                $(this).parent().find(".download-btn").find("i").removeClass("bi-hourglass-split").addClass("bi-download");
                $(this).find("i").removeClass("bi-hourglass-split").addClass("bi-play-fill");
            }
        });

        $(".result-iten-download").click(async function () {
            try {
                toasty("Downloading", "This song is downloading", "info");
                $(this).attr("disabled", true);
                $(this).find("i").removeClass("bi-download").addClass("bi-hourglass-split");
                const id = $(this).closest(".result-item").attr("video_id");
                await downloadSong(id);
                toasty("Success", "Song downloaded successfully", "success");
            } catch (error) {
                toasty("Error", "An error occurred while downloading the song", "error");
                console.error(error);
            } finally {
                $(this).removeClass("bi-download").addClass("bi-check-lg");
                $(this).find("i").removeClass("bi-hourglass-split").addClass("bi-download");
            }
        });

        $(".result-item-demo").click(function () {
            const videoId = $(this).closest(".result-item").attr("video_id");
            $(".preview-box").remove(); // Remove any existing preview box
            const previewBox = document.createElement("div");
            previewBox.className = "preview-box";
            previewBox.innerHTML = `
                <iframe width="100%" style="max-width: 560px; aspect-ratio: 16/9;" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            `;
            $(this).closest(".result-item").after(previewBox);
        });

    })
    .catch(err => {
        console.log(err);
        $(".search-results").html(`<p class="text-danger">${err.message}</p>`);
        toasty("Error", "An error occurred while searching for songs", "error");
    })
    .finally(() => {
        $(".search-container input").attr("disabled", false);
    });
}

function recommendedSongs(song) {
    const pl = []
    pl.push(new Song(song.id, song.title, song.uploader, host + song.path, song.thumbnail, song.duration));

    allSongCache.sort(() => Math.random() - 0.5);

    allSongCache.forEach((e) => {
        if (e.lang == song.lang && e.id != song.id) {
            pl.push(e);
        }
    });
    
    return pl;
}

async function getSongs(params) {
    try {
        return await axios.get(`${host}/api/songs`, {
            params: params,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
    } catch (error) {
        console.error("Error fetching songs:", error);
        toasty("Error", error.message, "error");
        throw error;
    }
}

function createPlaylist(songs) {
    const playlist = [];
    songs.forEach((song) => {
        playlist.push(new Song(song.id, song.title, song.uploader,  song.src || (host + song.path), song.thumbnail || song.cover, song.duration, song.lang));
    });
    return playlist;
}

async function initHome() {
    // All tab
    $("#all-for-you").html(`<div class="loader-2"></div> <p class="text-secondary">Loading...</p>`);
    let allSongs = [];
    try {
        allSongs = await getSongs();
        // Sort by title
        allSongs.data.sort((a, b) => {
            // Sort by language first
            if (a.lang !== b.lang) {
            // Priority order: jpn, eng, vie
            const langOrder = { jpn: 1, eng: 2, vie: 3 };
            return (langOrder[a.lang] || 4) - (langOrder[b.lang] || 4); 
            }
            // Within same language, sort by title
            return a.title.localeCompare(b.title);
        });
    } catch (error) {
        console.error("Error loading songs:", error);
        toasty("Error", "An error occurred while loading songs\n" + error.message, "error");
        $("#all-for-you").html(`<p class="text-danger">Error loading songs: ${error.message}</p>`);
    } finally {
        $(".search-container input").attr("disabled", false);
    }

    $("#all-for-you").empty();
    allSongs.data.forEach((e, i) => {
        const div = document.createElement("div");
        div.className = "song-item card pointer position-relative";
        div.setAttribute("video_id", e.id);
        div.innerHTML = `
        <img class="card-img-top" src="${e.thumbnail}" alt="Thumbnail">
        <div class="card-body">
            <h5 class="card-title">${e.title}</h5>
            <p class="card-text">${e.uploader}</p>
        </div>

        <div class="play-song">
            <i class="bi bi-play-fill"></i>
        </div>`;
        div.addEventListener("click", function () {
            const pl = createPlaylist(allSongs.data);
            player.setSongs(pl);
            player.playIndex(i);
            // updatePlaylist(player.getPlaylist());
            $("#main").addClass("active");
        });
        $("#all-for-you").append(div);
    });
    $("#all-for-you").parent().find('.see-more').click(() => {
        showPlayDetail(allSongs.data, "All Songs", "All Songs available on the platform");
    });

    // Recently played
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
    updateRecentlyPlayed(recentlyPlayed);
    // Singles
    // Singles section
    const uploaderGroups = {};

    const paransWords = [" Official"]
    allSongs.data.forEach(song => {
        
        let uploaderName = (song.uploader.includes(" - Topic")) ? song.uploader.split(" - Topic")[0] : song.uploader;
        paransWords.forEach(word => {
            uploaderName = uploaderName.replace(word, "");
        });

        if (!uploaderGroups[uploaderName]) {
            uploaderGroups[uploaderName] = {
                name: uploaderName,
                avatar: song.avatar,
                songs: []
            };
        }
        uploaderGroups[uploaderName].songs.push(song);
    });

    // Sort uploaders by number of songs
    const sortedUploaders = Object.values(uploaderGroups)
        .sort((a, b) => b.songs.length - a.songs.length);

    // Clear and create container for artist groups
    $("#singles").empty();
    const $artistSection = $('<div>', {
        class: 'artist-groups d-flex gap-3 flex-wrap'
    }).appendTo("#singles");

    // Show all uploaders as group items
    sortedUploaders.forEach((uploader) => {
        if (uploader.songs.length < 2) return;
        const $groupDiv = $('<div>', {
            class: 'artist-group card pointer position-relative',
            css: { width: '170px' }
        });

        $groupDiv.html(`
            <img class="card-img-top" src="${uploader.avatar}" alt="Artist" 
                style="object-fit: cover;">
            <div class="card-body p-3">
                <h5 class="card-title" style="font-size: 0.9rem" >${uploader.name}</h5>
                <p class="card-text">${uploader.songs.length} songs</p>
            </div>
            <div class="play-song">
                <i class="bi bi-play-fill"></i>
            </div>
        `);
        
        // Play all songs from this artist when clicked
        $groupDiv.on('click', () => {
            const playlist = createPlaylist(uploader.songs);
            player.setSongs(playlist);
            player.playIndex(0);
            $("#main").addClass("active");
        });

        $artistSection.append($groupDiv);
    });

    // Create language groups
    const vpopSongs = allSongs.data.filter(song => song.lang === 'vie');
    const jpopSongs = allSongs.data.filter(song => song.lang === 'jpn'); 
    const usukSongs = allSongs.data.filter(song => song.lang === 'eng');

    // Helper function to create song cards
    const createSongCard = (song, playlist, index) => {
        return $('<div>', {
            class: 'song-item card pointer position-relative'
        }).append(`
            <img class="card-img-top" src="${song.thumbnail}" alt="Thumbnail">
            <div class="card-body">
                <h5 class="card-title">${song.title}</h5>
                <p class="card-text">${song.uploader}</p>
            </div>
            <div class="play-song">
                <i class="bi bi-play-fill"></i>
            </div>
        `).on('click', () => {
            const pl = createPlaylist(playlist);
            player.setSongs(pl);
            player.playIndex(index);
            $("#main").addClass("active");
        });
    };

    // Populate V-Pop section
    $('#v-pop').empty();
    vpopSongs.forEach((song, index) => {
        $('#v-pop').append(createSongCard(song, vpopSongs, index));
    });

    // Populate J-Pop section
    $('#j-pop').empty();  
    jpopSongs.forEach((song, index) => {
        $('#j-pop').append(createSongCard(song, jpopSongs, index));
    });

    // Populate US-UK section
    $('#usuk').empty();
    usukSongs.forEach((song, index) => {
        $('#usuk').append(createSongCard(song, usukSongs, index));
    });

    // See-more
    $("#v-pop").parent().find('.see-more').click(() => {
        showPlayDetail(vpopSongs, "V-Pop Songs", "Nhạc V-Pop mang âm hưởng giai điệu du dương, trẻ trung và đầy cá tính. Từ những ca khúc ballad sâu lắng đến những bản hit sôi động, V-Pop thể hiện được nét đẹp văn hóa và tinh thần của âm nhạc Việt Nam hiện đại.");
    });
    $("#j-pop").parent().find('.see-more').click(() => {
        showPlayDetail(jpopSongs, "J-Pop Songs", "J-Pop brings captivating anime soundtracks and infectious pop melodies. From energetic anime openings to emotional ballads, Japanese music creates a unique atmosphere that resonates with listeners worldwide.");
        });
    $("#usuk").parent().find('.see-more').click(() => {
        showPlayDetail(usukSongs, "US-UK Songs", "US-UK Songs are known for their catchy tunes and relatable lyrics. From pop to rock, these songs have a global appeal and are loved by music enthusiasts of all ages.");
    });
    //
    
}

async function downloadSong(url) {
    try {
        const res = await axios.get(`${host}/api/download`, {
            params: { url: url },
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        initHome();
        return res.data;
    } catch (error) {
        console.error("Error downloading song:", error);
        toasty("Error", "An error occurred while downloading the song\n" + error.message, "error");
        throw error;
    }
}

document.getElementById('refresh').addEventListener('click', function() {
    // Fetch the song list and update the table
    fetchSongs();
});

function deleteSong(id) {
    // Example delete call to remove a song
    confirm("Are you sure you want to delete this song?") && 
    axios.delete(host + `/api/song/${id}`)
        .then(response => {
            fetchSongs(); // Refresh the song list after deletion
            toasty("Success", "Song deleted successfully", "success");
            initHome();
        })
        .catch(error => {
            console.error('Error deleting song:', error);
            toasty("Error", "An error occurred while deleting the song\n"+ error.message, "error");
        });
    
        
}

function fetchSongs() {
    // Example fetch call to get songs
    axios.get(host + '/api/songs')
        .then(response => {
            const songs = response.data;
            const songList = document.getElementById('song-list');
            songList.innerHTML = ''; // Clear existing content

            songs.forEach((song, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <th scope="row">${index + 1}</th>
                    <td><img src="${song.thumbnail}" alt="Thumbnail" style="width: 50px; height: 50px;"></td>
                    <td>
                        <div>${song.title}</div>
                        <div class="text-secondary">${song.uploader}</div>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm"><i class="bi bi-play-fill"></i></button>
                        <a class="btn btn-info btn-sm" href="https://www.youtube.com/watch?v=${song.id}" target="_blank"><i class="bi bi-youtube"></i></a>
                        <button class="btn btn-danger btn-sm" onclick="deleteSong('${song.id}')"><i class="bi bi-trash"></i></button>
                    </td>
                `;
                songList.appendChild(row);
            });


        })
        .catch(error => {
            console.error('Error fetching songs:', error);
            toasty("Error", "An error occurred while fetching the songs\n"+ error.message, "error");
        });
}


function toasty(header, text, type) {
    $.toast({
        heading: header,
        text: text,
        position: 'top-right',
        icon: type,
        showHideTransition: 'plain',
        hideAfter: 3000,
    })
}

function loadPlaylists() {
    const savedPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || {
        playlist1: [],
        playlist2: [],
        playlist3: []
    };

    const playlistNames = JSON.parse(localStorage.getItem('playlistNames')) || {
        playlist1: 'Playlist 1',
        playlist2: 'Playlist 2',
        playlist3: 'Playlist 3'
    };
    document.getElementById('playlist-manager').innerHTML = `
        <h4>Playlists</h4>
        <div id="saved-playlists" class="d-flex flex-column gap-2">
            <!-- Playlists will be dynamically inserted here -->
        </div>
    `;
    const savedPlaylistsContainer = document.getElementById('saved-playlists');
    savedPlaylistsContainer.innerHTML = '';

    Object.keys(savedPlaylists).forEach(playlistKey => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item d-flex justify-content-between align-items-center p-2 bg-dark text-light rounded';
        playlistItem.innerHTML = `
            <span>${playlistNames[playlistKey]}</span>
            <button class="btn btn-link text-light" data-playlist="${playlistKey}">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;

        playlistItem.querySelector('button').addEventListener('click', () => {
            showPlaylistSongs(playlistKey, savedPlaylists[playlistKey], playlistNames[playlistKey]);
        });

        savedPlaylistsContainer.appendChild(playlistItem);
    });
}

// Function to show songs in a playlist
function showPlaylistSongs(playlistKey, songs, playlistName) {
    const playlistDetailContainer = document.getElementById('playlist-manager');
    playlistDetailContainer.innerHTML = `
        <h4>${playlistName}</h4>
        <div id="playlist-songs" class="d-flex flex-column gap-2">
            <!-- Songs will be dynamically inserted here -->
        </div>
    `;

    const playlistSongsContainer = document.getElementById('playlist-songs');
    playlistSongsContainer.innerHTML = 
                    `<div id="back-to-playlists" class="p-4">
                        <button class="btn btn-link text-light">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                    </div>`;

    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item d-flex justify-content-between align-items-center p-2 text-light rounded';
        songItem.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <img src="${song.cover}" alt="thumbnail" style="width: 50px; height: 50px; object-fit: cover;" class="rounded">
                <div>
                    <h5 class="mb-1">${song.title}</h5>
                    <p class="mb-0">${song.uploader}</p>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-link text-light play-song" data-index="${index}">
                    <i class="bi bi-play-fill"></i>
                </button>
                <button class="btn btn-link text-light remove-song" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        songItem.querySelector('.play-song').addEventListener('click', () => {
            playSongFromPlaylist(songs, index);
        });

        songItem.querySelector('.remove-song').addEventListener('click', () => {
            removeSongFromPlaylist(playlistKey, index);
        });

        playlistSongsContainer.appendChild(songItem);
    });
    document.getElementById('back-to-playlists').addEventListener('click', loadPlaylists);
}

// Function to play a song from a playlist
function playSongFromPlaylist(songs, index) {
    const playlist = createPlaylist(songs);
    player.setSongs(playlist);
    player.playIndex(index);
    $("#main").addClass("active");
}

// Function to remove a song from a playlist
function removeSongFromPlaylist(playlistKey, songIndex) {
    const savedPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || {
        playlist1: [],
        playlist2: [],
        playlist3: []
    };

    savedPlaylists[playlistKey].splice(songIndex, 1);
    localStorage.setItem('userPlaylists', JSON.stringify(savedPlaylists));
    loadPlaylists();
    showPlaylistSongs(playlistKey, savedPlaylists[playlistKey], JSON.parse(localStorage.getItem('playlistNames'))[playlistKey]);
}

window.onload = () => {
    setTimeout(() => {
        $("#loading").fadeOut("slow", () => {
            $("#loading").remove();
        });
    }, 1000);
    loadPlaylists();
    main();

    // Request fullscreen on page load
    // document.documentElement.requestFullscreen();
    if (window.innerWidth < 940) {
        setTimeout(() => {
            player.volume = 1;
        }, 1000);
    }

    console.log("%cHey there! Please don't open the Dev Tools. Let's keep the magic alive! 🎩✨", "font-size: 32px;");


};

async function checkParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const autoplay = urlParams.get('autoplay') || false;
    if (id) {
        try {
            const res = await axios.get(`${host}/api/download`, {
                params: { url: id },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            });
            const song = res.data;
            const pl = createPlaylist([song, ...recommendedSongs(song)]);
            player.setSongs(pl);
            if (autoplay) {
                setTimeout(() => {
                    $("#main").addClass("active");
                    player.playIndex(0);
                }, 1000);
            }
        } catch (error) {
            console.error("Error playing song:", error);
            toasty("Error", "An error occurred while playing the song\n" + error.message, "error");
        }
        return true;
    }else{
        return false;
    }
}

const socketUrl = `ID: ${localStorage.getItem("clientId")}`;