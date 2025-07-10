document.addEventListener('DOMContentLoaded', function() {
    // hilfsfunktionen
    const $ = id => document.getElementById(id);
    const showNotification = (message, type = 'success') => {
        const notification = $('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => notification.classList.remove('show'), 3000);
    };
    const saveData = () => localStorage.setItem('thisDestinations', JSON.stringify(destinations));
    const getCurrentDestination = () => destinations.find(d => d.id == currentDestinationId);

    // globale variablen
    let destinations = JSON.parse(localStorage.getItem('thisDestinations')) || [];
    let currentDestinationId = null;
    let editingExpenseIndex = null;

    // modal management
    const modals = { destination: $('destinationModal'), expense: $('expenseModal'), edit: $('editModal'), delete: $('deleteModal') };
    const inputs = { destination: $('destinationInput'), expenseName: $('expenseNameInput'), expenseAmount: $('expenseAmountInput'), edit: $('editDestinationInput'), notes: $('notesTextarea'), packing: $('packingItemInput') };

    const openModal = modal => {
        modal.style.display = 'block';
        const focusMap = { [modals.destination]: inputs.destination, [modals.expense]: inputs.expenseName, [modals.edit]: inputs.edit };
        focusMap[modal]?.focus();
    };

    const closeModal = modal => {
        modal.style.display = 'none';
        Object.values(inputs).forEach(input => input.value = '');
        editingExpenseIndex = null;
    };

    // event listeners
    const events = [
        [$('addDestinationButton'), 'click', () => openModal(modals.destination)],
        [$('addDestination'), 'click', addDestination],
        [$('cancelDestination'), 'click', () => closeModal(modals.destination)],
        [$('addExpenseBtn'), 'click', () => openModal(modals.expense)],
        [$('addExpense'), 'click', addExpense],
        [$('cancelExpense'), 'click', () => closeModal(modals.expense)],
        [$('editDestinationBtn'), 'click', openEditModal],
        [$('saveEdit'), 'click', saveEdit],
        [$('cancelEdit'), 'click', () => closeModal(modals.edit)],
        [$('deleteDestinationBtn'), 'click', () => openModal(modals.delete)],
        [$('confirmDelete'), 'click', deleteDestination],
        [$('cancelDelete'), 'click', () => closeModal(modals.delete)],
        [$('saveNotesBtn'), 'click', saveNotes],
        [$('addPackingItemBtn'), 'click', addPackingItem],
        [$('closeDestinationModal'), 'click', () => closeModal(modals.destination)],
        [$('closeExpenseModal'), 'click', () => closeModal(modals.expense)],
        [$('closeEditModal'), 'click', () => closeModal(modals.edit)],
        [inputs.destination, 'keypress', e => e.key === 'Enter' && addDestination()],
        [inputs.packing, 'keypress', e => e.key === 'Enter' && addPackingItem()],
        [window, 'click', e => e.target.classList.contains('modal') && closeModal(e.target)]
    ];
    events.forEach(([element, event, handler]) => element?.addEventListener(event, handler));

    // hauptfunktionen
    function addDestination() {
        const name = inputs.destination.value.trim();
        if (!name) return showNotification('Bitte Reiseziel eingeben!', 'error');

        const newDestination = { id: Date.now(), name, notes: '', expenses: [], packingList: [] };
        destinations.push(newDestination);
        saveData();
        renderDestinationsList();
        closeModal(modals.destination);
        selectDestination(newDestination.id);
        showNotification(`Reiseziel "${name}" hinzugefügt!`);
    }

    function renderDestinationsList() {
        $('destinationsList').innerHTML = destinations.map(dest => 
            `<li data-id="${dest.id}" onclick="selectDestination(${dest.id})">${dest.name}</li>`
        ).join('');
    }

    function selectDestination(id) {
        currentDestinationId = id;
        const destination = getCurrentDestination();
        if (!destination) return;

        // ui updates
        document.querySelectorAll('#destinationsList li').forEach(li => 
            li.classList.toggle('active', li.dataset.id == id)
        );
        
        $('welcomeMessage').style.display = 'none';
        $('destinationDetails').style.display = 'block';
        $('destinationTitle').textContent = destination.name;
        inputs.notes.value = destination.notes || '';
        
        renderExpenses(destination.expenses);
        renderPackingList(destination.packingList);
    }

    function openEditModal() {
        const destination = getCurrentDestination();
        if (destination) {
            inputs.edit.value = destination.name;
            openModal(modals.edit);
        }
    }

    function saveEdit() {
        const newName = inputs.edit.value.trim();
        if (!newName) return showNotification('Bitte Namen eingeben!', 'error');

        const destination = getCurrentDestination();
        if (destination) {
            destination.name = newName;
            $('destinationTitle').textContent = newName;
            saveData();
            renderDestinationsList();
            selectDestination(currentDestinationId);
            closeModal(modals.edit);
            showNotification('Reiseziel bearbeitet!');
        }
    }

    function deleteDestination() {
        const destinationName = getCurrentDestination()?.name;
        destinations = destinations.filter(d => d.id != currentDestinationId);
        saveData();
        renderDestinationsList();
        
        $('welcomeMessage').style.display = 'block';
        $('destinationDetails').style.display = 'none';
        currentDestinationId = null;
        closeModal(modals.delete);
        showNotification(`Reiseziel "${destinationName}" gelöscht!`, 'warning');
    }

    function saveNotes() {
        const destination = getCurrentDestination();
        if (destination) {
            destination.notes = inputs.notes.value;
            saveData();
            showNotification('Notizen gespeichert!');
        }
    }

    function addExpense() {
        const name = inputs.expenseName.value.trim();
        const amount = parseFloat(inputs.expenseAmount.value);
        if (!name || isNaN(amount) || amount <= 0) {
            return showNotification('Bitte gültigen Namen und Betrag eingeben!', 'error');
        }

        const destination = getCurrentDestination();
        if (destination) {
            const isEdit = editingExpenseIndex !== null;
            if (isEdit) {
                destination.expenses[editingExpenseIndex] = { name, amount };
                showNotification('Ausgabe bearbeitet!');
            } else {
                destination.expenses.push({ name, amount });
                showNotification('Ausgabe hinzugefügt!');
            }
            
            renderExpenses(destination.expenses);
            saveData();
            closeModal(modals.expense);
        }
    }

    function renderExpenses(expenses) {
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        $('expensesTableBody').innerHTML = expenses.map((expense, index) => `
            <tr>
                <td>${expense.name}</td>
                <td>${expense.amount.toFixed(2)}€</td>
                <td class="expense-actions">
                    <button class="expense-edit" onclick="editExpense(${index})">Bearbeiten</button>
                    <button class="expense-delete" onclick="removeExpense(${index})">Entfernen</button>
                </td>
            </tr>
        `).join('');
        $('totalAmount').textContent = total.toFixed(2);
    }

    function addPackingItem() {
        const item = inputs.packing.value.trim();
        if (!item) return showNotification('Bitte geben Sie einen Gegenstand ein!', 'error');

        const destination = getCurrentDestination();
        if (destination) {
            destination.packingList.push(item);
            renderPackingList(destination.packingList);
            inputs.packing.value = '';
            saveData();
            showNotification('Gegenstand zur Packliste hinzugefügt!');
        }
    }

    function renderPackingList(items) {
        $('packingList').innerHTML = items.map((item, index) => `
            <li>
                <span>${item}</span>
                <button class="remove-item" onclick="removePackingItem(${index})">×</button>
            </li>
        `).join('');
    }

    // globale funktionen
    window.editExpense = index => {
        const destination = getCurrentDestination();
        if (destination?.expenses[index]) {
            const expense = destination.expenses[index];
            inputs.expenseName.value = expense.name;
            inputs.expenseAmount.value = expense.amount;
            editingExpenseIndex = index;
            openModal(modals.expense);
        }
    };

    window.removeExpense = index => {
        const destination = getCurrentDestination();
        if (destination) {
            destination.expenses.splice(index, 1);
            renderExpenses(destination.expenses);
            saveData();
        }
    };

    window.removePackingItem = index => {
        const destination = getCurrentDestination();
        if (destination) {
            destination.packingList.splice(index, 1);
            renderPackingList(destination.packingList);
            saveData();
        }
    };

    window.selectDestination = selectDestination; // für onclick in html

    // initialisierung
    renderDestinationsList();
});
