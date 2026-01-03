// Manager Blueprint Integration

document.addEventListener('DOMContentLoaded', () => {
    loadBlueprints();
});

async function loadBlueprints() {
    try {
        const response = await fetch('/api/blueprints');
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('blueprintSelect');
            if (!select) return;

            select.innerHTML = '<option value="">Select location...</option>' +
                data.blueprints.map(bp => `<option value="${bp._id}">${bp.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading blueprints:', error);
    }
}

async function loadBlueprintCameras() {
    const blueprintId = document.getElementById('blueprintSelect').value;
    const cameraSelect = document.getElementById('cameraSelect');
    const miniMap = document.getElementById('miniBlueprint');
    const ctx = miniMap.getContext('2d');

    // Reset
    cameraSelect.innerHTML = '<option value="">Select camera...</option>';
    document.getElementById('detectionArea').value = '';
    ctx.clearRect(0, 0, miniMap.width, miniMap.height);

    if (!blueprintId) return;

    try {
        // Load blueprint details for image
        const bpResponse = await fetch(`/api/blueprints/${blueprintId}`);
        const bpData = await bpResponse.json();

        if (bpData.success) {
            const img = new Image();
            img.onload = () => {
                // Draw background
                ctx.drawImage(img, 0, 0, miniMap.width, miniMap.height);

                // Store blueprint data for scaling
                miniMap.dataset.width = bpData.blueprint.dimensions.width;
                miniMap.dataset.height = bpData.blueprint.dimensions.height;

                // Load cameras
                loadCamerasForBlueprint(blueprintId, bpData.blueprint);
            };
            img.src = bpData.blueprint.imageUrl;
        }
    } catch (error) {
        console.error('Error loading blueprint details:', error);
    }
}

async function loadCamerasForBlueprint(blueprintId, blueprint) {
    try {
        const response = await fetch(`/api/cameras/blueprint/${blueprintId}`);
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('cameraSelect');
            select.innerHTML = '<option value="">Select camera...</option>' +
                data.cameras.map(cam =>
                    `<option value="${cam._id}" data-area="${cam.linkedArea}" data-x="${cam.position.x}" data-y="${cam.position.y}" data-id="${cam.cameraId}">
                        ${cam.cameraId} - ${cam.linkedArea || 'Unassigned'}
                    </option>`
                ).join('');

            // Draw all cameras on mini map
            drawCamerasOnMiniMap(data.cameras, blueprint);
        }
    } catch (error) {
        console.error('Error loading cameras:', error);
    }
}

function drawCamerasOnMiniMap(cameras, blueprint) {
    const canvas = document.getElementById('miniBlueprint');
    const ctx = canvas.getContext('2d');

    // Clear previous drawings (but keep background if possible, or redraw it)
    // Ideally we should redraw the image first, but for simplicity let's assume image is there
    // Actually, to be safe, we should redraw everything. 
    // Since we don't have the image object easily available here without reloading, 
    // let's just draw on top.

    const scaleX = canvas.width / blueprint.dimensions.width;
    const scaleY = canvas.height / blueprint.dimensions.height;

    cameras.forEach(cam => {
        const x = cam.position.x * scaleX;
        const y = cam.position.y * scaleY;

        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';
        ctx.fillText(cam.cameraId, x + 8, y);
    });
}

function updateAreaFromCamera() {
    const select = document.getElementById('cameraSelect');
    const selectedOption = select.options[select.selectedIndex];

    if (selectedOption.value) {
        const area = selectedOption.dataset.area;
        document.getElementById('detectionArea').value = area;

        // Highlight selected camera
        const x = parseFloat(selectedOption.dataset.x);
        const y = parseFloat(selectedOption.dataset.y);
        highlightCamera(x, y);
    } else {
        document.getElementById('detectionArea').value = '';
    }
}

function highlightCamera(x, y) {
    const canvas = document.getElementById('miniBlueprint');
    const ctx = canvas.getContext('2d');

    // We need the blueprint dimensions to scale correctly
    // This is a bit hacky without full state management, but sufficient for MVP
    // Assuming the dataset attributes are set from loadBlueprintCameras
    const bpWidth = parseFloat(canvas.dataset.width);
    const bpHeight = parseFloat(canvas.dataset.height);

    if (!bpWidth || !bpHeight) return;

    const scaleX = canvas.width / bpWidth;
    const scaleY = canvas.height / bpHeight;

    const cx = x * scaleX;
    const cy = y * scaleY;

    // Draw a red circle around selected camera
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.stroke();
}
