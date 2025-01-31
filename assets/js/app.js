const host = "http://localhost:3000";

const main = () => {
    const player = new MusicPlayer();
    //Test songs
    const demo = new Song(
        "MphqBbeYatk",
        "Miside OST", 
        "None", 
        host + "/audios/MphqBbeYatk.mp3", 
        'https://i.ytimg.com/vi/MphqBbeYatk/0.jpg'
    )

    const demo2 = new Song(
        "g3jCAyPai2Y",
        "Yakuza OST - Baka Mitai (ばかみたい) ", 
        " Kiryu", 
        host + "/audios/g3jCAyPai2Y.mp3", 
        'https://i.ytimg.com/vi/g3jCAyPai2Y/0.jpg'
    )
    //Update current playlist
    player.on("playlistUpdate", ()=>{
        $("#current-playlist").empty();
        const playlist = player.getPlaylist();
        playlist.forEach((song, index) => {
            const info = song.getInfo();
            const div = document.createElement("div");
            div.className = "list-item d-flex align-items-center gap-3 p-3";
            div.innerHTML = `
                <img src="https://i.ytimg.com/vi/${info.id}/0.jpg" alt="thumbnail"
                    class="rounded" style="width: 64px; height: 64px; object-fit: cover;">
                <div class="flex-grow-1">
                    <h5 class="mb-1">${info.title}</h5>
                    <p class="text-secondary mb-0">${info.artist}</p>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <span class="text-secondary">${song.duration}</span>
                    <button class="btn btn-link text-light">
                        <i class="bi bi-play-fill"></i>
                    </button>
                </div>`
            div.addEventListener("click", function(){
                player.playIndex(index);
                $(".list-item").removeClass("active")
                $(this).addClass("active")
            })
            $("#current-playlist").append(div);

        });
    });

    player.setSongs([demo, demo2])
    player.init();

    $("#home").addClass("active");

    initEvent()
}

const initEvent = ()=>{
    $(".nav-item").click(function (e) { 
        e.preventDefault();
        $(".nav-item").removeClass('active');
        $(this).addClass("active")
        $("#player-screen-bg").removeClass("active");
        $("#search").removeClass("active");
        $("#home").removeClass("active");
        
        $($(this).attr('href')).addClass("active");
    });

    //Toggle player screen
    $("#info").click(function (e) { 
        e.preventDefault();
        $("#player-screen-bg").toggleClass("active");
    });
    // Search
    $(".search-container input").keypress(function (e) { 
        if (e.key === 'Enter') {
            searchFunc();
        }
    });

    $(".search-container button").click(function (e) { 
        searchFunc();
    });
}

function searchFunc(){
    $(".search-container input").attr("disabled", true);

    $("#home").removeClass("active");
    $("#player-screen-bg").removeClass("active");
    $("#search").addClass("active");

    const query = $(".search-container input").val();
    $(".search-container input").val(query);
    $("#kw").text(query);

    $(".search-results").empty();
    // fetch(`${host}/api/search?q=${query}`).then(res => res.json()).then(data => {}).catch(err => console.log(err));
}

window.onload = () => {
    setTimeout(() => {
        $("#loading").fadeOut("slow", () => {
            $("#loading").remove();
        });
    }, 1);

    main();
};

