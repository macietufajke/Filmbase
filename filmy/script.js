const API_KEY = "3f43b94218eccbd4392e1eba10510911";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w300";
const IMAGE_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

// State
let currentMovies = [];
let currentPage = 1;
let currentCategory = 'home';
let currentQuery = '';
let currentSort = 'popularity.desc';
let player = null;

document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    // Determine active tab or default to 'home'
    const activeTab = document.querySelector('.sidebar-link.active') || document.querySelector('.sidebar-link[data-category="home"]');
    if (activeTab) {
        switchTab(activeTab.dataset.category);
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Sidebar Navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            // Add to clicked
            link.classList.add('active');

            const category = link.dataset.category;
            switchTab(category);
        });
    });

    // Category Dropdown Toggle
    const categoryToggle = document.getElementById('category-toggle');
    if (categoryToggle) {
        categoryToggle.addEventListener('click', () => {
            categoryToggle.classList.toggle('active');
            const submenu = document.getElementById('category-submenu');
            if (submenu) submenu.classList.toggle('show');
        });
    }

    // Sort Dropdown Toggle
    const sortToggle = document.getElementById('sort-toggle');
    const sortMenu = document.getElementById('sort-menu');

    if (sortToggle && sortMenu) {
        sortToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sortMenu.classList.toggle('show');
            sortToggle.classList.toggle('active');
        });

        // Close sort menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!sortToggle.contains(e.target) && !sortMenu.contains(e.target)) {
                sortMenu.classList.remove('show');
                sortToggle.classList.remove('active');
            }
        });

        // Handle Sort Selection
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', () => {
                // Update UI
                document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                sortMenu.classList.remove('show');
                sortToggle.classList.remove('active');

                // Update Button Text
                const selectedText = option.textContent;
                sortToggle.querySelector('span').textContent = selectedText;

                // Update State
                currentSort = option.dataset.sort;
                currentPage = 1;

                reloadMoviesWithSort();
            });
        });
    }

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    currentQuery = query;
                    currentPage = 1;
                    loadMovies(`/search/movie`, { query: query, page: 1 }, true); // Reset grid
                    updateSectionTitle(`Wyniki dla: "${query}"`);
                }
            }
        });
    }

    // Load More
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            let endpoint = '';
            let params = { page: currentPage };

            if (currentQuery) {
                endpoint = `/search/movie`;
                params.query = currentQuery;
            } else {
                // Determine endpoint based on sort/category
                const config = getEndpointAndParams(currentCategory, currentSort);
                endpoint = config.endpoint;
                params = { ...params, ...config.params };
            }

            loadMovies(endpoint, params, false); // Append
        });
    }

    // Modal Close
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-backdrop')) closeModal();
    });

    // Watch Dropdown Logic
    const watchToggle = document.getElementById('watch-toggle');
    const watchMenu = document.getElementById('watch-menu');

    if (watchToggle && watchMenu) {
        watchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            watchMenu.classList.toggle('show');
            watchToggle.classList.toggle('active');
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!watchToggle.contains(e.target) && !watchMenu.contains(e.target)) {
                watchMenu.classList.remove('show');
                watchToggle.classList.remove('active');
            }
        });

        // Handle selection
        watchMenu.querySelectorAll('.watch-option').forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.preventDefault();
                watchMenu.classList.remove('show');
                watchToggle.classList.remove('active');

                const player = opt.dataset.player;

                if (player === 's1') {
                    const movieId = watchMenu.dataset.movieId;
                    const titleEl = document.getElementById('modal-title');
                    const rawTitle = titleEl ? titleEl.innerText : "Film";
                    const title = encodeURIComponent(rawTitle);

                    // Open Player with S1 source (VidSrc)
                    const width = 1000;
                    const height = 600;
                    const left = (screen.width - width) / 2;
                    const top = (screen.height - height) / 2;

                    window.open(`player.html?id=${movieId}&title=${title}&source=s1`, 'MoviePlayer',
                        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,status=no`
                    );
                } else if (player === 'lulu') {
                    const movieId = watchMenu.dataset.movieId;
                    const titleEl = document.getElementById('modal-title');
                    const rawTitle = titleEl ? titleEl.innerText : "Film";
                    const title = encodeURIComponent(rawTitle);

                    // Open Player with Lulu source
                    const width = 1000;
                    const height = 600;
                    const left = (screen.width - width) / 2;
                    const top = (screen.height - height) / 2;

                    window.open(`player.html?id=${movieId}&title=${title}&source=lulu`, 'MoviePlayer',
                        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,status=no`
                    );
                }
            });
        });

        // Close Player Handler
        const closePlayerBtn = document.getElementById('close-player');
        if (closePlayerBtn) {
            closePlayerBtn.addEventListener('click', () => {
                const playerContainer = document.getElementById('player-container');
                const video = document.getElementById('player');
                if (playerContainer && video) {
                    player.stop(); // Plyr API
                    playerContainer.classList.add('hidden');
                }
            });
        }

        // Manual Load Button
        const manualLoadBtn = document.getElementById('manual-load-btn');
        if (manualLoadBtn) {
            manualLoadBtn.addEventListener('click', () => {
                const url = document.getElementById('manual-url-input').value.trim();
                if (url) playM3U8(url);
            });
        }

        // Source Buttons
        document.querySelectorAll('.source-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                loadStream(btn.dataset.src, btn);
            });
        });
    }
}

// --- USER REQUESTED FUNCTIONS (ADAPTED) ---

// --- POPUP PLAYER LOGIC HANDLED IN watch-option CLICK EVENT ---

function getEndpointAndParams(category, sort) {
    let endpoint = '/discover/movie';
    let params = {
        sort_by: sort,
        include_adult: false,
        include_video: false,
        'vote_count.gte': 200, // Only well-known, verified movies
        'with_runtime.gte': 40, // Increased to 40m to ensure "feature length"
        'without_genres': '16,99,10770'
    };

    if (!isNaN(category)) {
        // Genre
        params.with_genres = category;
    } else {
        switch (category) {
            case 'home':
                // All movies, just discover with sort
                break;
            case 'popular':
                // If default sort, can use specific endpoint, but discover is safer for custom sorts
                // endpoint override removed to support filters
                if (sort !== 'popularity.desc') {
                    params['vote_count.gte'] = 100;
                }
                break;
            case 'top_rated':
                // endpoint override removed
                if (sort === 'vote_average.desc') {
                    params['vote_count.gte'] = 300;
                }
                break;
            case 'upcoming':
                // Always use date filtering to support runtime filter
                const today = new Date().toISOString().split('T')[0];
                const nextMonth = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                params['primary_release_date.gte'] = today;
                params['primary_release_date.lte'] = nextMonth;
                params['release_date.gte'] = today;
                break;

            case 'trending':
                endpoint = '/trending/movie/week';
                if (sort !== 'popularity.desc') {
                    endpoint = '/discover/movie';
                }
                break;
        }
    }

    return { endpoint, params };
}

function reloadMoviesWithSort() {
    const config = getEndpointAndParams(currentCategory, currentSort);
    loadMovies(config.endpoint, { ...config.params, page: 1 }, true);
}

function getEndpointForCategory(category) {
    switch (category) {
        case 'home': return '/discover/movie';
        case 'popular': return '/movie/popular';
        case 'top_rated': return '/movie/top_rated';
        case 'top_rated': return '/movie/top_rated';
        case 'upcoming': return '/movie/upcoming';
        case 'trending': return '/trending/movie/week';
        case 'polish': return '/discover/movie';
        default:
            // If it's a number, it's a genre ID
            if (!isNaN(category)) {
                return '/discover/movie';
            }
            return '/discover/movie';
    }
}

function switchTab(category) {
    currentCategory = category;
    currentPage = 1;
    currentQuery = '';

    let endpoint = getEndpointForCategory(category);
    let title = '';

    switch (category) {
        case 'home': title = 'Wszystkie Filmy'; break;
        case 'popular': title = 'Popularne Filmy'; break;
        case 'top_rated': title = 'Najwyżej Oceniane'; break;
        case 'upcoming': title = 'Nadchodzące Premiery'; break;
        case 'trending': title = 'Na Topie (Ten Tydzień)'; break;
        case 'polish': title = 'Polskie Premiery'; break;

    }

    if (!isNaN(category)) {
        const genreNames = {
            '28': 'Filmy Akcji',
            '12': 'Przygodowe',
            '35': 'Komedie',
            '18': 'Dramaty',
            '27': 'Horrory',
            '878': 'Sci-Fi'
        };
        title = genreNames[category] || 'Kategoria';
    }

    updateSectionTitle(title);

    reloadMoviesWithSort();
}

function updateSectionTitle(title) {
    const titleEl = document.getElementById('main-title');
    if (titleEl) titleEl.textContent = title;
}

async function loadMovies(endpoint, params = {}, reset = false) {
    showLoader();
    try {
        let url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=pl-PL`;

        // Add params
        Object.keys(params).forEach(key => url += `&${key}=${encodeURIComponent(params[key])}`);

        const res = await fetch(url);
        const data = await res.json();
        let newMovies = data.results || [];

        // Filter spam titles, CJK characters, and bad data
        newMovies = newMovies.filter(movie => {
            const title = movie.title || '';

            // 1. Remove titles starting with "!" or containing only punctuation
            if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(title)) return false;

            // 2. Remove titles with CJK (Chinese/Japanese/Korean) characters
            // Ranges: Hiragana, Katakana, CJK Unified Ideographs
            if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(title)) return false;

            // 3. Basic validity
            if (!title.trim()) return false;

            return true;
        });

        if (reset) {
            currentMovies = newMovies;
            renderGrid(newMovies, true);
            // Setup Featured Spotlight from the first movie if not searching/appending
            if (!currentQuery && newMovies.length > 0) {
                updateSpotlight(newMovies[0]);
            }
        } else {
            currentMovies = [...currentMovies, ...newMovies];
            renderGrid(newMovies, false);
        }

    } catch (error) {
        console.error("Error fetching movies:", error);
    } finally {
        hideLoader();
    }
}

function renderGrid(movies, reset) {
    const grid = document.getElementById('movies-grid');
    if (reset) grid.innerHTML = '';

    movies.forEach(movie => {
        const card = createMovieCard(movie);
        grid.appendChild(card);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const imagePath = movie.poster_path;
    const imageUrl = imagePath ? IMAGE_BASE + imagePath : 'https://via.placeholder.com/300x450?text=No+Image';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '-';

    card.innerHTML = `
        <div class="card-image">
            <img src="${imageUrl}" alt="${movie.title}" loading="lazy">
            <div class="card-overlay">
                <button class="card-btn">Szczegóły</button>
            </div>
        </div>
        <div class="card-info">
            <h3 class="card-title">${movie.title}</h3>
            <div class="card-meta">
                <span class="rating">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> 
                    ${rating}
                </span>
                <span class="year">${movie.release_date ? movie.release_date.split('-')[0] : ''}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openModal(movie));
    return card;
}

function updateSpotlight(movie) {
    const spotlightImg = document.getElementById('spotlight-img');
    const spotlightTitle = document.getElementById('spotlight-title');
    const spotlightDesc = document.getElementById('spotlight-desc');
    const spotlightBackdrop = document.querySelector('.spotlight-backdrop');

    if (movie.backdrop_path) {
        const backdropUrl = IMAGE_BASE_ORIGINAL + movie.backdrop_path;
        if (spotlightImg) spotlightImg.src = backdropUrl;
        // Optional: dynamic background blur for the container
        if (spotlightBackdrop) spotlightBackdrop.style.backgroundImage = `url(${backdropUrl})`;
    }

    if (spotlightTitle) spotlightTitle.textContent = movie.title;
    if (spotlightDesc) spotlightDesc.textContent = movie.overview || "Brak opisu.";

    const infoBtn = document.getElementById('spotlight-info-btn');
    if (infoBtn) {
        infoBtn.onclick = () => openModal(movie);
    }
}

// Modal Functions
async function openModal(movie) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modal = document.querySelector('.modal');

    // Fill Basic Data
    document.getElementById('modal-title').textContent = movie.title;
    document.getElementById('modal-overview').textContent = movie.overview;
    document.getElementById('modal-rating').textContent = `TMDB: ${movie.vote_average.toFixed(1)}`;
    document.getElementById('modal-meta').textContent = movie.release_date || '';

    if (movie.backdrop_path) {
        document.getElementById('modal-hero-img').src = IMAGE_BASE_ORIGINAL + movie.backdrop_path;
    }

    modalBackdrop.classList.add('show');
    modal.classList.add('show');

    // Fetch Details & Providers
    const [details, cast, providers] = await Promise.all([
        fetch(`${BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&language=pl-PL`).then(r => r.json()),
        fetch(`${BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}&language=pl-PL`).then(r => r.json()),
        fetch(`${BASE_URL}/movie/${movie.id}/watch/providers?api_key=${API_KEY}`).then(r => r.json())
    ]);

    // Update with details
    document.getElementById('modal-runtime').textContent = details.runtime ? `${details.runtime} min` : '';
    document.getElementById('modal-genres').innerHTML = details.genres.map(g => `<span>${g.name}</span>`).join('');

    // Cast
    const castNames = cast.cast ? cast.cast.slice(0, 5).map(c => c.name).join(', ') : 'Brak danych';
    document.getElementById('modal-cast').textContent = `Obsada: ${castNames}`;

    // Providers
    const plProviders = providers.results && providers.results.PL ? providers.results.PL.flatrate : null;
    const providersContainer = document.getElementById('modal-providers');
    if (plProviders) {
        providersContainer.innerHTML = plProviders.map(p => `
            <div class="provider-badge">
                <img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="${p.provider_name}">
            </div>
        `).join('');
    } else {
        providersContainer.innerHTML = '<span class="no-providers">Brak w abonamencie (PL)</span>';
    }
    // Store movie title and ID for watch button
    const watchMenu = document.getElementById('watch-menu');
    if (watchMenu) {
        watchMenu.dataset.movieTitle = movie.title;
        watchMenu.dataset.movieId = movie.id;
    }
}

function closeModal() {
    // Stop video if playing when closing modal
    if (player) {
        player.stop();
    }
    const playerContainer = document.getElementById('player-container');
    if (playerContainer) playerContainer.classList.add('hidden');

    const modalBackdrop = document.getElementById('modal-backdrop');
    const modal = document.querySelector('.modal');
    modalBackdrop.classList.remove('show');
    modal.classList.remove('show');
}

function showLoader() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.textContent = 'Ładowanie...';
}

function hideLoader() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.textContent = 'Załaduj więcej';
}



function playM3U8(url) {
    console.log("Playing M3U8:", url);
}

function loadStream(url, btn) {
    console.log("Loading stream:", url);
    // Remove active class from other buttons
    document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
