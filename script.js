document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const playerListDiv = document.getElementById('player-list');
    const searchBar = document.getElementById('search-bar');
    const teamListDiv = document.getElementById('team-list');
    const totalPriceValue = document.getElementById('total-price-value');
    const historyDaysSelect = document.getElementById('history-days');
    let historyLength = parseInt(historyDaysSelect.value);

    historyDaysSelect.addEventListener('change', () => {
        historyLength = parseInt(historyDaysSelect.value);
        updateTeamHistoryChart();
    });

    let allPlayers = [];
    let myTeam = [];
    if (localStorage.getItem('myTeam')) {
        try {
            myTeam = JSON.parse(localStorage.getItem('myTeam'));
        } catch (e) {
            myTeam = [];
        }
    }

    // Cada vez que cambie el equipo, guárdalo en localStorage
    const saveTeam = () => {
        localStorage.setItem('myTeam', JSON.stringify(myTeam));
    };
    const teamNameInput = document.getElementById('team-name-input');
    const saveTeamBtn = document.getElementById('save-team-btn');
    const savedTeamsSelect = document.getElementById('saved-teams-select');
    const loadTeamBtn = document.getElementById('load-team-btn');
    const deleteTeamBtn = document.getElementById('delete-team-btn');

    // Guarda el equipo actual con el nombre dado
    saveTeamBtn.addEventListener('click', () => {
        const name = teamNameInput.value.trim();
        if (!name) {
            alert('Ponle un nombre a tu equipo');
            return;
        }
        let savedTeams = JSON.parse(localStorage.getItem('savedTeams') || '{}');
        savedTeams[name] = myTeam;
        localStorage.setItem('savedTeams', JSON.stringify(savedTeams));
        updateSavedTeamsSelect();
        alert('¡Equipo guardado!');
    });

    // --- Pestañas ---
    window.showTab = function (tab) {
    document.getElementById('tab-content-team').style.display = tab === 'team' ? '' : 'none';
    document.getElementById('tab-content-rankings').style.display = tab === 'rankings' ? '' : 'none';
    document.getElementById('tab-content-market').style.display = tab === 'market' ? '' : 'none'; // NUEVO
    document.getElementById('tab-team').classList.toggle('active', tab === 'team');
    document.getElementById('tab-rankings').classList.toggle('active', tab === 'rankings');
    document.getElementById('tab-market').classList.toggle('active', tab === 'market'); // NUEVO
};

    // --- Rankings ---
    const rankingDaysSelect = document.getElementById('ranking-days');
    rankingDaysSelect.addEventListener('change', updateRankings);

    function updateRankings() {
        const days = parseInt(rankingDaysSelect.value);
        // Derivada y segunda derivada para cada jugador
        const derivadas = allPlayers.map(player => {
            const h = player.price_history;
            if (!h || h.length < 2) return { ...player, derivada: null, segunda: null };
            const last = h.slice(-days);
            const derivada = last.length > 1 ? last[last.length - 1] - last[last.length - 2] : null;
            const segunda = last.length > 2 ? (last[last.length - 1] - last[last.length - 2]) - (last[last.length - 2] - last[last.length - 3]) : null;
            return { ...player, derivada, segunda };
        });

        // Ranking por derivada
        const byDerivada = derivadas
            .filter(p => p.derivada !== null)
            .sort((a, b) => b.derivada - a.derivada)
            .slice(0, 20);
        const tbody1 = document.querySelector('#ranking-derivada tbody');
        tbody1.innerHTML = byDerivada.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.team}</td>
            <td>${p.position}</td>
            <td>${(p.derivada / 1000000).toFixed(2)} M€</td>
        </tr>
    `).join('');

        // Ranking por segunda derivada
        const bySegunda = derivadas
            .filter(p => p.segunda !== null)
            .sort((a, b) => b.segunda - a.segunda)
            .slice(0, 20);
        const tbody2 = document.querySelector('#ranking-segunda-derivada tbody');
        tbody2.innerHTML = bySegunda.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.team}</td>
            <td>${p.position}</td>
            <td>${(p.segunda / 1000000).toFixed(2)} M€</td>
        </tr>
    `).join('');
    }

    // Llama a updateRankings() cuando se carguen los jugadores
    // (dentro del fetch de players.json, después de asignar allPlayers)
    // Actualiza el desplegable de equipos guardados
    function updateSavedTeamsSelect() {
        let savedTeams = JSON.parse(localStorage.getItem('savedTeams') || '{}');
        savedTeamsSelect.innerHTML = '<option value="">-- Cargar equipo guardado --</option>';
        Object.keys(savedTeams).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            savedTeamsSelect.appendChild(option);
        });
    }

    // Carga el equipo seleccionado
    loadTeamBtn.addEventListener('click', () => {
        const name = savedTeamsSelect.value;
        if (!name) return;
        let savedTeams = JSON.parse(localStorage.getItem('savedTeams') || '{}');
        if (savedTeams[name]) {
            // Reconstruir el equipo con los datos actuales
            const savedTeam = savedTeams[name];
            myTeam = savedTeam.map(savedPlayer => {
                // Busca el jugador actual por nombre (o por ID si tienes)
                return allPlayers.find(p => p.name === savedPlayer.name) || savedPlayer;
            });
            saveTeam();
            updateTeamDisplay();
        }
    });

    // Borra el equipo seleccionado
    deleteTeamBtn.addEventListener('click', () => {
        const name = savedTeamsSelect.value;
        if (!name) return;
        let savedTeams = JSON.parse(localStorage.getItem('savedTeams') || '{}');
        if (savedTeams[name]) {
            delete savedTeams[name];
            localStorage.setItem('savedTeams', JSON.stringify(savedTeams));
            updateSavedTeamsSelect();
            alert('Equipo borrado');
        }
    });

    // Inicializa el desplegable al cargar la página
    updateSavedTeamsSelect();

    // Helper function to format the price
    const formatPrice = (price) => {
        return `€${(price / 1000000).toFixed(1)}M`;
    };

    // 1. Fetch player data from the JSON file
    fetch('players.json')
        .then(response => response.json())
        .then(data => {
            allPlayers = data;
            updateRankings();
            displayPlayers(allPlayers);
            updateTeamDisplay();
            updateMarketHistoryChart();
        })
        .catch(error => console.error('Error loading player data:', error));

    // 2. Function to display players in the list
    const displayPlayers = (players) => {
        playerListDiv.innerHTML = '';
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.classList.add('player-card');

            playerCard.innerHTML = `
                <h3>${player.name}</h3>
                <p>${player.team}</p>
                <p>${player.position}</p>
                <p class="player-price">${formatPrice(player.price)}</p>
            `;

            playerCard.addEventListener('click', () => addPlayerToTeam(player));
            playerListDiv.appendChild(playerCard);
        });
    };

    // 3. Function to handle search input
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredPlayers = allPlayers.filter(player =>
            player.name.toLowerCase().includes(searchTerm) ||
            player.team.toLowerCase().includes(searchTerm)
        );
        displayPlayers(filteredPlayers);
    });

    // 4. Function to add a player to your team
    const addPlayerToTeam = (player) => {
        if (myTeam.some(p => p.name === player.name)) return;
        myTeam.push(player);
        saveTeam();
        updateTeamDisplay();
    };

    // 5. Function to remove a player from your team using their name
    const removePlayerFromTeam = (playerName) => {
        myTeam = myTeam.filter(p => p.name !== playerName);
        saveTeam();
        updateTeamDisplay();
    };

    // 6. Function to update the team display and total price
    const updateTeamDisplay = () => {
        teamListDiv.innerHTML = '';
        let totalPrice = 0;

        myTeam.forEach(player => {
            totalPrice += player.price; // Add the full price

            const teamMemberDiv = document.createElement('div');
            teamMemberDiv.classList.add('team-member');
            teamMemberDiv.innerHTML = `
                <span>${player.name} (${formatPrice(player.price)})</span>
                <button title="Remove Player">&times;</button>
            `;

            // Pass the player's name to the remove function
            teamMemberDiv.querySelector('button').addEventListener('click', () => removePlayerFromTeam(player.name));
            teamListDiv.appendChild(teamMemberDiv);
        });

        // Update total price display using the formatter
        totalPriceValue.textContent = formatPrice(totalPrice);

        updateTeamHistoryChart();
    };



    function updateTeamHistoryChart() {
        const ctx = document.getElementById('team-history-chart').getContext('2d');
        const derivativesDiv = document.getElementById('team-history-derivatives');
        if (window.teamChart) window.teamChart.destroy();

        if (myTeam.length === 0) {
            derivativesDiv.innerHTML = '';
            return;
        }

        // Calcula el mínimo de días disponibles entre todos los jugadores
        const minHistory = Math.min(...myTeam.map(p => p.price_history.length));
        const daysToShow = Math.min(historyLength, minHistory);

        const teamHistory = Array(daysToShow).fill(0);
        for (let i = 0; i < daysToShow; i++) {
            myTeam.forEach(player => {
                // Toma los últimos N días
                const history = player.price_history.slice(-daysToShow);
                teamHistory[i] += history[i];
            });
        }

        // Derivada: diferencia entre días consecutivos
        const firstDerivative = [];
        for (let i = 1; i < teamHistory.length; i++) {
            firstDerivative.push(teamHistory[i] - teamHistory[i - 1]);
        }

        // Segunda derivada: diferencia de la derivada
        const secondDerivative = [];
        for (let i = 1; i < firstDerivative.length; i++) {
            secondDerivative.push(firstDerivative[i] - firstDerivative[i - 1]);
        }

        // Mostrar los valores actuales (último valor de cada derivada)
        derivativesDiv.innerHTML = `
        <div>
            <strong>Derivada actual (variación diaria):</strong> ${firstDerivative.length > 0 ? (firstDerivative[firstDerivative.length - 1] / 1000000).toFixed(2) + ' M€/día' : 'N/A'}
        </div>
        <div>
            <strong>2ª Derivada actual (aceleración):</strong> ${secondDerivative.length > 0 ? (secondDerivative[secondDerivative.length - 1] / 1000000).toFixed(2) + ' M€/día²' : 'N/A'}
        </div>
    `;

        const labels = Array.from({ length: daysToShow }, (_, i) => `Día -${daysToShow - i - 1}`);

        window.teamChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Valor total del equipo',
                    data: teamHistory.map(p => (p / 1000000).toFixed(2)),
                    borderColor: '#007bff',
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Millones €' }
                    }
                }
            }
        });
    }

    // --- Mercado total ---
    const marketHistoryDaysSelect = document.getElementById('market-history-days');
    marketHistoryDaysSelect.addEventListener('change', updateMarketHistoryChart);

    function updateMarketHistoryChart() {
    if (!allPlayers.length) return;
    const days = parseInt(marketHistoryDaysSelect.value);

    const derivativesDiv = document.getElementById('market-history-derivatives');
    const ctx = document.getElementById('market-history-chart').getContext('2d');
    if (window.marketChart) window.marketChart.destroy();

    // 1. Calcula el máximo historial disponible entre todos los jugadores
    const maxHistory = Math.max(...allPlayers.map(p => p.price_history.length));
    if (maxHistory < 2) {
        derivativesDiv.innerHTML = `<div>No hay suficientes datos para mostrar la gráfica.</div>`;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    // 2. Para cada día (de los últimos N), suma el valor de todos los jugadores, usando 0 si no hay dato
    const marketHistory = [];
    for (let i = days; i > 0; i--) {
        let daySum = 0;
        allPlayers.forEach(player => {
            const history = player.price_history;
            const idx = history.length - i;
            daySum += idx >= 0 ? history[idx] : 0;
        });
        marketHistory.push(daySum);
    }

    // 3. Derivada y segunda derivada sobre los datos mostrados
    const firstDerivative = [];
    for (let i = 1; i < marketHistory.length; i++) {
        firstDerivative.push(marketHistory[i] - marketHistory[i - 1]);
    }
    const secondDerivative = [];
    for (let i = 1; i < firstDerivative.length; i++) {
        secondDerivative.push(firstDerivative[i] - firstDerivative[i - 1]);
    }

    derivativesDiv.innerHTML = `
        <div>
            <strong>Derivada actual (variación diaria):</strong> ${firstDerivative.length > 0 ? (firstDerivative[firstDerivative.length - 1] / 1000000).toFixed(2) + ' M€/día' : 'N/A'}
        </div>
        <div>
            <strong>2ª Derivada actual (aceleración):</strong> ${secondDerivative.length > 0 ? (secondDerivative[secondDerivative.length - 1] / 1000000).toFixed(2) + ' M€/día²' : 'N/A'}
        </div>
    `;

    const labels = Array.from({ length: days }, (_, i) => `Día -${days - i - 1}`);

    window.marketChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Valor total del mercado',
                data: marketHistory.map(p => (p / 1000000).toFixed(2)),
                borderColor: '#28a745',
                fill: false,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Millones €' }
                }
            }
        }
    });
}
    
});