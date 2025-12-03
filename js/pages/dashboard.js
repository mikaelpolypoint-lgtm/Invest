import { DataService } from '../services/data.js';

const TEAM_CONFIG = {
    'Tungsten': { costPerPoint: 900, color: '#8b5cf6' },
    'Neon': { costPerPoint: 1460, color: '#ec4899' },
    'H1': { costPerPoint: 1270, color: '#10b981' },
    'Zn2C': { costPerPoint: 1280, color: '#f59e0b' },
};

let rawStories = [];
let rawTopics = [];
let selectedTeam = 'All';
let selectedInitiative = 'All';

export async function renderDashboard(container, headerActions) {
    // 1. Render Filters in Header
    renderFilters(headerActions);

    // 2. Fetch Data if not loaded
    if (rawStories.length === 0 || rawTopics.length === 0) {
        try {
            await loadData();
        } catch (error) {
            container.innerHTML = `<div class="error">Failed to load data: ${error.message}</div>`;
            return;
        }
    }

    // 3. Process and Render Content
    updateDashboard(container);
}

function renderFilters(headerActions) {
    headerActions.innerHTML = `
        <div class="filters">
            <select id="team-filter" class="filter-select">
                <option value="All">All Teams</option>
                ${Object.keys(TEAM_CONFIG).map(t => `<option value="${t}" ${selectedTeam === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <select id="initiative-filter" class="filter-select">
                <option value="All">All Initiatives</option>
                <!-- Options populated later -->
            </select>
        </div>
    `;

    // Add Event Listeners
    document.getElementById('team-filter').addEventListener('change', (e) => {
        selectedTeam = e.target.value;
        updateDashboard(document.getElementById('page-container'));
    });

    document.getElementById('initiative-filter').addEventListener('change', (e) => {
        selectedInitiative = e.target.value;
        updateDashboard(document.getElementById('page-container'));
    });
}

async function loadData() {
    // Load Topics from DataService
    const initiatives = await DataService.getInitiatives();
    // Map to expected format for dashboard processing
    rawTopics = initiatives.map(i => ({
        Topic: i.topic,
        Prio: i.prio,
        Invest: i.invest,
        AssignedEpics: i.assignedEpics
    }));

    // Load Stories
    const storiesResponse = await fetch('PI261_Stories.csv');
    const storiesText = await storiesResponse.text();
    rawStories = Papa.parse(storiesText, { header: true, skipEmptyLines: true }).data;

    // Populate Initiative Filter
    const initFilter = document.getElementById('initiative-filter');
    if (initFilter) {
        const options = rawTopics.map(t => `<option value="${t.Topic}" ${selectedInitiative === t.Topic ? 'selected' : ''}>${t.Topic}</option>`).join('');
        initFilter.innerHTML += options + `<option value="Unassigned" ${selectedInitiative === 'Unassigned' ? 'selected' : ''}>Unassigned</option>`;
    }
}

function updateDashboard(container) {
    // Process Data
    const { initiativeStats, teamStats, parentStats, totalInvestment } = processData();

    // Render HTML
    container.innerHTML = `
        <div class="mb-large">
            <div class="dashboard-grid" style="grid-template-columns: 2fr 1fr;">
                <!-- Roadmap Alignment Chart -->
                <div class="card">
                    <h3>Roadmap Alignment</h3>
                    <div style="height: 300px;">
                        <canvas id="roadmapChart"></canvas>
                    </div>
                    <div style="margin-top: 2rem; overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Priority</th>
                                    <th>Initiative</th>
                                    <th style="text-align: right;">Roadmap</th>
                                    <th style="text-align: right;">Planned Invest</th>
                                    <th style="text-align: right;">% of Planned</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${initiativeStats.map(i => {
        const percent = i.budget > 0 ? (i.planned / i.budget) * 100 : 0;
        const color = percent > 110 ? 'var(--danger)' : percent < 90 ? 'var(--polypoint-orange)' : 'var(--success)';
        return `
                                    <tr>
                                        <td>${i.prio}</td>
                                        <td>${i.name}</td>
                                        <td style="text-align: right; font-family: monospace;">${formatCurrency(i.budget)}</td>
                                        <td style="text-align: right; font-family: monospace;">${formatCurrency(i.planned)}</td>
                                        <td style="text-align: right; font-weight: bold; color: ${color};">${percent.toFixed(1)}%</td>
                                    </tr>
                                    `;
    }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Investment Share Chart -->
                <div class="card">
                    <h3>Investment Share</h3>
                    <div style="height: 300px;">
                        <canvas id="shareChart"></canvas>
                    </div>
                    <div style="text-align: center; margin-top: 1rem;">
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">Total Investment</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(totalInvestment)}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Team Cards -->
        <div class="dashboard-grid mb-large">
            ${teamStats.map(team => `
                <div class="card" style="border-top: 4px solid ${TEAM_CONFIG[team.name].color}">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <h3 style="margin:0;">${team.name}</h3>
                        <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                            ${TEAM_CONFIG[team.name].costPerPoint} CHF/SP
                        </span>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Total Investment</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(team.totalValue)}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">Story Points</div>
                        <div style="font-size: 1.2rem;">${team.totalPoints.toFixed(1)} SP</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Detailed Breakdown -->
        <div class="card">
            <h3>Detailed Breakdown</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Summary</th>
                            <th>Initiative</th>
                            ${Object.keys(TEAM_CONFIG).map(t => selectedTeam === 'All' || selectedTeam === t ? `<th style="color: ${TEAM_CONFIG[t].color}; text-align: right;">${t}</th>` : '').join('')}
                            <th style="text-align: right;">Total SP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parentStats.map(parent => `
                            <tr>
                                <td style="font-family: monospace; color: var(--accent); font-weight: bold;">${parent.key}</td>
                                <td>${parent.summary}</td>
                                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${parent.initiative}</span></td>
                                ${Object.keys(TEAM_CONFIG).map(t => {
        if (selectedTeam !== 'All' && selectedTeam !== t) return '';
        const val = parent.teams[t] || 0;
        return `<td style="text-align: right; font-family: monospace;">${val > 0 ? val : '-'}</td>`;
    }).join('')}
                                <td style="text-align: right; font-weight: bold;">${parent.totalPoints.toFixed(1)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Render Charts
    renderCharts(initiativeStats, teamStats);
}

function processData() {
    // 0. Map Epics to Initiatives
    const epicToInitiative = {};
    rawTopics.forEach(t => {
        if (t.AssignedEpics) {
            t.AssignedEpics.split(',').map(e => e.trim()).forEach(epic => {
                epicToInitiative[epic] = t.Topic;
            });
        }
    });

    // 1. Filter Stories
    const filteredStories = rawStories.filter(story => {
        const teamMatch = selectedTeam === 'All' || story.Team === selectedTeam;

        let parentKey = story['Parent key'];
        if (!parentKey) parentKey = "No Epic";
        const initiative = epicToInitiative[parentKey] || "Unassigned";
        const initiativeMatch = selectedInitiative === 'All' || initiative === selectedInitiative;

        return teamMatch && initiativeMatch;
    });

    // 2. Process Stats
    const pStats = {};
    const tStats = {};
    const epicValues = {};

    // Initialize Team Stats
    Object.keys(TEAM_CONFIG).forEach(team => {
        if (selectedTeam === 'All' || selectedTeam === team) {
            tStats[team] = { name: team, totalPoints: 0, totalValue: 0 };
        }
    });

    filteredStories.forEach(story => {
        const team = story.Team;
        const points = parseFloat(story['Story Points'] || '0');
        let parentKey = story['Parent key'];
        let parentSummary = story['Parent summary'];

        if (!team || isNaN(points)) return;
        if (!TEAM_CONFIG[team]) return;

        if (!parentKey) {
            parentKey = "No Epic";
            parentSummary = "Stories without a parent feature";
        }

        // Parent Stats
        if (!pStats[parentKey]) {
            pStats[parentKey] = {
                key: parentKey,
                summary: parentSummary,
                teams: {},
                totalPoints: 0,
                initiative: epicToInitiative[parentKey] || "Unassigned"
            };
        }
        if (!pStats[parentKey].teams[team]) pStats[parentKey].teams[team] = 0;
        pStats[parentKey].teams[team] += points;
        pStats[parentKey].totalPoints += points;

        // Team Stats
        if (tStats[team]) {
            tStats[team].totalPoints += points;
            const value = points * TEAM_CONFIG[team].costPerPoint;
            tStats[team].totalValue += value;
        }

        // Epic Values (for Initiative calc)
        const value = points * (TEAM_CONFIG[team]?.costPerPoint || 0);
        epicValues[parentKey] = (epicValues[parentKey] || 0) + value;
    });

    // Initiative Stats
    const iStats = rawTopics.map(t => {
        const assignedEpics = t.AssignedEpics ? t.AssignedEpics.split(',').map(e => e.trim()) : [];
        const planned = assignedEpics.reduce((sum, epic) => sum + (epicValues[epic] || 0), 0);
        return {
            name: t.Topic,
            prio: t.Prio,
            budget: parseInt(t.Invest) || 0,
            planned: planned
        };
    }).filter(i => i.budget > 0 || i.planned > 0);

    // Add Unassigned
    const unassignedValue = Object.entries(epicValues).reduce((sum, [epic, val]) => {
        if (!epicToInitiative[epic]) return sum + val;
        return sum;
    }, 0);

    if (unassignedValue > 0 && (selectedInitiative === 'All' || selectedInitiative === 'Unassigned')) {
        iStats.push({ name: "Unassigned", budget: 0, planned: unassignedValue });
    }

    const finalIStats = selectedInitiative === 'All' ? iStats : iStats.filter(i => i.name === selectedInitiative);

    return {
        initiativeStats: finalIStats,
        teamStats: Object.values(tStats),
        parentStats: Object.values(pStats).sort((a, b) => b.totalPoints - a.totalPoints),
        totalInvestment: Object.values(tStats).reduce((sum, t) => sum + t.totalValue, 0)
    };
}

function renderCharts(initiativeStats, teamStats) {
    // Roadmap Chart
    const ctxRoadmap = document.getElementById('roadmapChart').getContext('2d');
    new Chart(ctxRoadmap, {
        type: 'bar',
        data: {
            labels: initiativeStats.map(i => i.name),
            datasets: [
                {
                    label: 'Roadmap Budget',
                    data: initiativeStats.map(i => i.budget),
                    backgroundColor: '#94a3b8',
                    borderRadius: 4
                },
                {
                    label: 'Planned Investment',
                    data: initiativeStats.map(i => i.planned),
                    backgroundColor: '#38bdf8',
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        callback: function (value) {
                            return value / 1000 + 'k';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });

    // Share Chart
    const ctxShare = document.getElementById('shareChart').getContext('2d');
    new Chart(ctxShare, {
        type: 'doughnut',
        data: {
            labels: teamStats.map(t => t.name),
            datasets: [{
                data: teamStats.map(t => t.totalValue),
                backgroundColor: teamStats.map(t => TEAM_CONFIG[t.name].color),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });
}

function formatCurrency(val) {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(val);
}
