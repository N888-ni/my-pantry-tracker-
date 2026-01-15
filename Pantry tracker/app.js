// Load saved items from localStorage
let pantryItems = JSON.parse(localStorage.getItem("pantryItems")) || [];

// DOM elements
const itemForm = document.getElementById("itemForm");
const itemsTableBody = document.getElementById("itemsTable");
const searchInput = document.getElementById("searchInput");
const sortButtons = document.querySelectorAll(".sort-btn");
const themeToggle = document.getElementById("themeToggle");

// Modal elements
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editName = document.getElementById("editName");
const editQuantity = document.getElementById("editQuantity");
const editUnit = document.getElementById("editUnit");
const editCategory = document.getElementById("editCategory");
const editStorage = document.getElementById("editStorage");
const editAllergens = document.getElementById("editAllergens");
const editExpiry = document.getElementById("editExpiry");
const editIsCCP = document.getElementById("editIsCCP");
const cancelEditBtn = document.getElementById("cancelEdit");

let currentSort = null;
let editingId = null;

/* THEME */
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Light mode";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeToggle.textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

/* STORAGE */
function saveItems() {
    localStorage.setItem("pantryItems", JSON.stringify(pantryItems));
}

/* Helpers */

function isHighRisk(item) {
    const name = item.name.toLowerCase();
    const cat = (item.category || "").toLowerCase();

    const riskyWords = ["cream", "custard", "cheese", "milk", "dairy", "egg", "mousse", "fresh fruit"];
    if (cat === "filling") return true;
    return riskyWords.some(word => name.includes(word));
}

function getSafetyText(item) {
    const parts = [];
    if (item.isCCP) parts.push("Marked as CCP");
    if (isHighRisk(item)) parts.push("High-risk ingredient");
    if (!parts.length) return "Normal risk";
    return parts.join(" • ");
}

function getSuggestion(item) {
    const name = item.name.toLowerCase();
    const cat = item.category || "other";
    const qty = Number(item.quantity || 0);

    if (cat === "flour") return "Great for pastry bases: tarts, pies, croissants.";
    if (cat === "sugar") return "Use in syrups, meringues, or caramel for toppings.";
    if (cat === "filling") return "Perfect for filling eclairs, tarts, or layered cakes.";
    if (cat === "topping") return "Use as decoration on cupcakes, donuts, or slices.";
    if (cat === "frozen") return "Plan ahead: defrost and use in tomorrow’s specials.";

    if (name.includes("cream")) return "Turn this into whipped cream, mousse, or a soft filling.";
    if (name.includes("egg")) return "Use for custard, sponge cake, or brioche dough.";
    if (name.includes("strawberry") || name.includes("fruit")) return "Use in fruit tarts, compotes, or fresh garnish.";

    if (qty <= 1) return "Use this soon in a small batch or daily special.";
    if (qty >= 5) return "Consider a promo or bulk bake using this ingredient.";

    return "Think of one pastry today that uses this ingredient.";
}

/* RENDER TABLE */
function renderTable() {
    itemsTableBody.innerHTML = "";

    const today = new Date();

    let filtered = pantryItems.map(item => ({
        ...item,
        category: item.category || "other",
        storage: item.storage || "",
        allergens: item.allergens || "",
        isCCP: !!item.isCCP
    }));

    // SEARCH
    const term = searchInput.value.toLowerCase();
    if (term) {
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term) ||
            item.allergens.toLowerCase().includes(term) ||
            (item.isCCP && "ccp safety".includes(term))
        );
    }

    // SORT
    if (currentSort === "name-asc") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentSort === "name-desc") {
        filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (currentSort === "qty") {
        filtered.sort((a, b) => Number(a.quantity) - Number(b.quantity));
    } else if (currentSort === "expiry") {
        filtered.sort((a, b) => new Date(a.expiry || "2100-01-01") - new Date(b.expiry || "2100-01-01"));
    }

    filtered.forEach(item => {
        const row = document.createElement("tr");

        let rowClass = "";
        const qty = Number(item.quantity);

        // expiry
        if (item.expiry) {
            const expiryDate = new Date(item.expiry);
            const diffDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) rowClass = "expired";
            else if (diffDays <= 3) rowClass = "expiring-soon";
        }

        // stock
        if (qty <= 1) rowClass = "critical-stock";
        else if (qty <= 3 && !rowClass) rowClass = "low-stock";

        // CCP/high risk
        if (item.isCCP || isHighRisk(item)) {
            rowClass += (rowClass ? " " : "") + "ccp-row";
        }

        row.className = rowClass.trim();

        const categoryLabel = {
            flour: "Flour & bases",
            sugar: "Sugars & sweeteners",
            filling: "Fillings & creams",
            topping: "Toppings & decorations",
            frozen: "Frozen / prepared",
            other: "Other"
        }[item.category] || "Other";

        const storageLabel = {
            room: "Room temperature",
            fridge: "Fridge",
            frozen: "Freezer"
        }[item.storage] || "";

        const safetyText = getSafetyText(item);
        const suggestion = getSuggestion(item);

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.unit || ""}</td>
            <td>${categoryLabel}</td>
            <td>${storageLabel}</td>
            <td>${item.allergens}</td>
            <td>${item.expiry || ""}</td>
            <td>
                ${item.isCCP ? '<span class="ccp-badge">CCP</span><br>' : ""}
                ${isHighRisk(item) ? '<span class="high-risk-badge">High risk</span>' : ""}
                <div>${safetyText}</div>
            </td>
            <td><div class="suggestion-text">${suggestion}</div></td>
            <td>
                <button class="action-btn edit-btn" data-id="${item.id}">Edit</button>
                <button class="action-btn delete-btn" data-id="${item.id}">Delete</button>
            </td>
        `;

        itemsTableBody.appendChild(row);
    });
}

/* INITIAL RENDER */
renderTable();

/* ADD ITEM */
itemForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const quantity = document.getElementById("quantity").value;
    const unit = document.getElementById("unit").value.trim();
    const category = document.getElementById("category").value || "other";
    const storage = document.getElementById("storage").value || "";
    const allergens = document.getElementById("allergens").value.trim();
    const expiry = document.getElementById("expiry").value;
    const isCCP = document.getElementById("isCCP").checked;

    const newItem = {
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        name,
        quantity,
        unit,
        category,
        storage,
        allergens,
        expiry,
        isCCP
    };

    pantryItems.push(newItem);

    saveItems();
    renderTable();
    itemForm.reset();
});

/* MODAL CONTROL */
function openEditModal(itemId) {
    editingId = itemId;
    const item = pantryItems.find(p => p.id === itemId);
    if (!item) return;

    editName.value = item.name;
    editQuantity.value = item.quantity;
    editUnit.value = item.unit || "";
    editCategory.value = item.category || "other";
    editStorage.value = item.storage || "room";
    editAllergens.value = item.allergens || "";
    editExpiry.value = item.expiry || "";
    editIsCCP.checked = !!item.isCCP;

    editModal.classList.add("open");
}

function closeEditModal() {
    editingId = null;
    editModal.classList.remove("open");
}

/* EDIT + DELETE */
itemsTableBody.addEventListener("click", (e) => {
    const btn = e.target;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("delete-btn")) {
        pantryItems = pantryItems.filter(item => item.id !== id);
        saveItems();
        renderTable();
        return;
    }

    if (btn.classList.contains("edit-btn")) {
        openEditModal(id);
    }
});

/* MODAL EVENTS */
cancelEditBtn.addEventListener("click", () => {
    closeEditModal();
});

editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
});

editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingId) return;

    const index = pantryItems.findIndex(item => item.id === editingId);
    if (index === -1) return;

    pantryItems[index] = {
        ...pantryItems[index],
        name: editName.value.trim(),
        quantity: editQuantity.value,
        unit: editUnit.value.trim(),
        category: editCategory.value || "other",
        storage: editStorage.value || "",
        allergens: editAllergens.value.trim(),
        expiry: editExpiry.value,
        isCCP: editIsCCP.checked
    };

    saveItems();
    renderTable();
    closeEditModal();
});

/* SEARCH + SORT */
searchInput.addEventListener("input", renderTable);

sortButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentSort = btn.dataset.sort;
        renderTable();
    });
});
