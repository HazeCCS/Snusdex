// ==========================================
// 7. ADMIN PANEL (VOLLSTÄNDIG)
// ==========================================

async function adminAddSnus() {
    const name = document.getElementById('admin-name').value;
    const nicotine = document.getElementById('admin-nicotine').value;
    const rarity = document.getElementById('admin-rarity').value;
    const flavorsRaw = document.getElementById('admin-flavor').value;
    const barcode = document.getElementById('admin-barcode').value;
    const image = document.getElementById('admin-image').value;

    if (!name || !nicotine || !image) {
        return alert("Bitte Name, Nicotine und Image angeben!");
    }

    // Flavors formatieren (Komma-getrennt zu Array)
    const flavorArray = flavorsRaw ? flavorsRaw.split(',').map(s => s.trim()).filter(s => s) : [];

    const {
        error
    } = await supabaseClient.from('snus_products').insert([{
        name: name,
        nicotine: parseInt(nicotine),
        rarity: rarity,
        flavor: flavorArray,
        barcode: barcode || null,
        image: image
    }]);

    if (error) {
        alert("Fehler beim Hinzufügen: " + error.message);
    } else {
        alert("Snus erfolgreich hinzugefügt!");
        // Felder leeren
        document.getElementById('admin-name').value = '';
        document.getElementById('admin-nicotine').value = '';
        document.getElementById('admin-flavor').value = '';
        document.getElementById('admin-barcode').value = '';
        document.getElementById('admin-image').value = '';
        // Dex direkt neu laden, damit der neue Snus sichtbar ist
        loadDex();
    }
}
