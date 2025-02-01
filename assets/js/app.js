// const host = "http://127.0.0.1:3000"
const host = "https://kmusictest-4f44bf517a97.herokuapp.com"
const player = new MusicPlayer();

const main = async () => {    
    //Update current playlist
    player.on("playlistUpdate", () => {
        $("#current-playlist").empty();
    });
    $("#home").addClass("active");
    await initHome()
    await initDefaultPlaylist();
    await initEvent();
    await player.init();
};

player.on("play", async () => {
    const currentSong = player.getCurrentSong().getInfo();
    let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];

    // Remove the song if it already exists in the list
    recentlyPlayed = recentlyPlayed.filter(song => song.id !== currentSong.id);

    // Add the current song to the beginning of the list
    recentlyPlayed.unshift(currentSong);

    // Limit the list to the last 20 songs
    if (recentlyPlayed.length > 20) {
        recentlyPlayed = recentlyPlayed.slice(0, 20);
    }

    // Save the updated list back to local storage
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));

    // Update the #recently element
    updateRecentlyPlayed(recentlyPlayed);
});

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
        div.addEventListener('click', function () {
            const playlist = createPlaylist(recentlyPlayed);
            player.setSongs(playlist);
            player.playIndex(index);
            updatePlaylist(player.getPlaylist());
            $("#player-screen-bg").addClass("active");
        });
        recentlyContainer.appendChild(div);
    });
}

async function initDefaultPlaylist() {
    const songs = await getSongs();
    const playlist = createPlaylist(songs.data);
    player.setSongs(playlist);
    updatePlaylist(player.getPlaylist());
}

function updatePlaylist(playlist) {
    playlist.forEach((song, index) => {
        const info = song.getInfo();
        const div = document.createElement("div");
        div.className = "list-item d-flex align-items-center gap-3 p-3"
        if (index === player.getCurrrentSongIndex()) {
            div.classList.add("active");
        }
        div.innerHTML = `
              <img src="https://i.ytimg.com/vi/${info.id}/0.jpg" alt="thumbnail"
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
            $(".list-item").removeClass("active");
            $(this).addClass("active");
        });
        $("#current-playlist").append(div);
    });
}

const initEvent = () => {
    $(".nav-item").click(function (e) {
        e.preventDefault();
        $(".nav-item").removeClass("active");
        $(this).addClass("active");
        $("#player-screen-bg").removeClass("active");
        $("#search").removeClass("active");
        $("#home").removeClass("active");
        $("manager-music").removeClass("active");
        

        $($(this).attr("href")).addClass("active");
    });

    //Toggle player screen
    $("#info").click(function (e) {
        e.preventDefault();
        $("#player-screen-bg").toggleClass("active");
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
            const urls = document.getElementById('import-urls').value.split('\n').filter(url => url.trim() !== '');
            if (urls.length === 0) {
                toasty("Error", "No URLs to import", "error");
                return;
            }

            if (urls.length > 10) {
                toasty("Error", "Too many URLs to import, minimun is 10 urls", "error");
                return;
            }

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
        }
    });

    // Export songs to local storage
    $("#save-urls").click(async function () {
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
};

function searchFunc(query) {
    $(".search-container input").attr("disabled", true);

    $("#home").removeClass("active");
    $("#player-screen-bg").removeClass("active");
    $("#search").addClass("active");
    $("manager-music").removeClass("active");
    
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
        data.forEach((e, i) => {
            const div = document.createElement("div");
            div.className = "result-item d-flex align-items-center gap-3 p-3";
            div.setAttribute("video_id", e.id);
            div.innerHTML = `<img src="${e.thumbnail}" alt="thumbnail" class="rounded"
                    style="width: 64px; height: 64px; object-fit: cover;">
                    <div class="flex-grow-1">
                        <h5 class="mb-1">${e.title}</h5>
                        <p class="text-secondary mb-0">${e.uploader}</p>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <span class="text-secondary">${e.duration}</span>
                        <button class="btn btn-link text-light download-btn result-iten-download" title="Download">
                            <i class="bi bi-download"></i>
                        </button>
                        <button class="btn btn-link text-light play-btn result-item-play" title="Play">
                            <i class="bi bi-play-fill"></i>
                        </button>
                    </div>`;
            $(".search-results").append(div);
        });

        $(".result-item-play").click(async function () {
            try {
                toasty("Playing", "This song is downloading and will be played soon", "info");
                $(this).attr("disabled", true);
                $(this).find("i").removeClass("bi-play-fill").addClass("bi-hourglass-split");
                const id = $(this).closest(".result-item").attr("video_id");
                const data = await downloadSong(id);
                const song = new Song(data.id, data.title, data.uploader, host + data.path, data.thumbnail, data.duration);
                player.setSongs([song]);
                player.playIndex(0);
                $("#player-screen-bg").addClass("active");
                updatePlaylist(player.getPlaylist());
            } catch (error) {
                toasty("Error", "An error occurred while downloading the song", "error");
                console.error(error);
            } finally {
                $(this).attr("disabled", false);
                $(this).find("i").removeClass("bi-hourglass-split").addClass("bi-play-fill");
            }
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
        playlist.push(new Song(song.id, song.title, song.uploader,  song.src || (host + song.path), song.thumbnail || song.cover, song.duration));
    });
    return playlist;
}

async function initHome() {
    // All tab
    $("#all-for-you").html(`<div class="loader-2"></div> <p class="text-secondary">Loading...</p>`);
    try {
        const allSongs = await getSongs();
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
                updatePlaylist(player.getPlaylist());
                $("#player-screen-bg").addClass("active");
            });
            $("#all-for-you").append(div);
        });
    } catch (error) {
        console.error("Error loading songs:", error);
        toasty("Error", "An error occurred while loading songs\n" + error.message, "error");
        $("#all-for-you").html(`<p class="text-danger">Error loading songs: ${error.message}</p>`);
    } finally {
        $(".search-container input").attr("disabled", false);
    }
    // Recently played
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
    updateRecentlyPlayed(recentlyPlayed);

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
                        <button class="btn btn-danger btn-sm" onclick="deleteSong('${song.id}')">Delete</button>
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



window.onload = () => {
    setTimeout(() => {
        $("#loading").fadeOut("slow", () => {
            $("#loading").remove();
        });
    }, 1000);
    main();
};