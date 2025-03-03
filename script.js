const animeList = [
    { title: "Solo Leveling S2", image: "https://files.catbox.moe/iptzn9.jpg", link: "episodes.html?anime=solo-leveling" },
    { title: "Attack on Titan", image: "https://files.catbox.moe/fbj8l1.jpg", link: "episodes.html?anime=aot" },
    { title: "Jujutsu Kaisen", image: "https://files.catbox.moe/x9wnkf.jpg", link: "episodes.html?anime=jujutsu" }
];

function loadAnime() {
    const container = document.getElementById("anime-list");
    container.innerHTML = "";
    animeList.forEach(anime => {
        container.innerHTML += `
            <div class="anime-card">
                <img src="${anime.image}" alt="${anime.title}">
                <a href="${anime.link}">${anime.title}</a>
            </div>
        `;
    });
}

function searchAnime() {
    const query = document.getElementById("search").value.toLowerCase();
    const filteredAnime = animeList.filter(anime => anime.title.toLowerCase().includes(query));
    const container = document.getElementById("anime-list");
    container.innerHTML = "";
    filteredAnime.forEach(anime => {
        container.innerHTML += `
            <div class="anime-card">
                <img src="${anime.image}" alt="${anime.title}">
                <a href="${anime.link}">${anime.title}</a>
            </div>
        `;
    });
}

window.onload = loadAnime;
