import { DataService } from '../services/data.js';

let initiatives = [];

export async function renderInitiatives(container, headerActions) {
    // Clear Header Actions
    headerActions.innerHTML = `
        <button id="add-btn" class="btn btn-primary">
            <span>+ Add Initiative</span>
        </button>
    `;

    // Load Data
    try {
        initiatives = await DataService.getInitiatives();
    } catch (error) {
        container.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
        return;
    }

    // Render Table
    renderTable(container);

    // Event Listeners
    document.getElementById('add-btn').addEventListener('click', addInitiative);
}

function renderTable(container) {
    container.innerHTML = `
        <div class="card">
            <div class="table-container">
                <table id="initiatives-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">Prio</th>
                            <th style="width: 200px;">Initiative Name</th>
                            <th style="width: 120px;">Budget (CHF)</th>
                            <th>Assigned Epics (comma separated)</th>
                            <th style="width: 60px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${initiatives.sort((a, b) => a.prio - b.prio).map(init => `
                            <tr data-id="${init.id}">
                                <td>
                                    <input type="number" class="edit-prio" value="${init.prio}" style="width: 50px;">
                                </td>
                                <td>
                                    <input type="text" class="edit-topic" value="${init.topic}">
                                </td>
                                <td>
                                    <input type="number" class="edit-invest" value="${init.invest}">
                                </td>
                                <td>
                                    <input type="text" class="edit-epics" value="${init.assignedEpics || ''}" placeholder="REL-123, REL-456">
                                </td>
                                <td>
                                    <button class="btn-icon delete-btn" title="Delete">
                                        <span style="color: var(--danger); font-weight: bold;">✕</span>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Add Row Event Listeners
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            await deleteInitiative(id);
        });
    });

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            await updateInitiative(id, e.target.className, e.target.value);
        });
    });
}

async function addInitiative() {
    const newInit = {
        prio: initiatives.length > 0 ? Math.max(...initiatives.map(i => parseInt(i.prio))) + 1 : 1,
        topic: 'New Initiative',
        invest: 0,
        assignedEpics: ''
    };

    try {
        const addedInit = await DataService.addInitiative(newInit);
        initiatives.push(addedInit);
        renderTable(document.getElementById('page-container'));
    } catch (error) {
        alert('Error adding initiative: ' + error.message);
    }
}

async function deleteInitiative(id) {
    if (confirm('Are you sure you want to delete this initiative?')) {
        try {
            await DataService.deleteInitiative(id);
            initiatives = initiatives.filter(i => i.id !== id);
            renderTable(document.getElementById('page-container'));
        } catch (error) {
            alert('Error deleting initiative: ' + error.message);
        }
    }
}

async function updateInitiative(id, fieldClass, value) {
    const init = initiatives.find(i => i.id === id);
    if (!init) return;

    const updates = {};
    if (fieldClass.includes('edit-prio')) updates.prio = parseInt(value);
    if (fieldClass.includes('edit-topic')) updates.topic = value;
    if (fieldClass.includes('edit-invest')) updates.invest = parseInt(value);
    if (fieldClass.includes('edit-epics')) updates.assignedEpics = value;

    // Optimistic update
    Object.assign(init, updates);

    try {
        await DataService.updateInitiative(id, updates);
    } catch (error) {
        alert('Error updating initiative: ' + error.message);
        // Revert on error (simplified)
        // In a real app we might reload data
    }
}


