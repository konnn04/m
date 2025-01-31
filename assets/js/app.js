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

    player.setSongs([demo, demo2])
    player.init();
}

window.onload = () => {
    setTimeout(() => {
        $("#loading").fadeOut("slow", () => {
            $("#loading").remove();
        });
    }, 1);

    main();
};

