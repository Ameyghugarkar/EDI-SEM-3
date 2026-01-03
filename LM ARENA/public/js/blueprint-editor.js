// Blueprint Editor - Main JavaScript
class BlueprintEditor {
    constructor() {
        this.canvas = null;
        this.currentBlueprint = null;
        this.cameras = [];
        this.areas = [];
        this.currentTool = 'select';
        this.drawingArea = null;
        this.init();
    }

    async init() {
        // Initialize Fabric canvas
        this.canvas = new fabric.Canvas('blueprintCanvas', {
            width: 1000,
            height: 700,
            backgroundColor: '#ffffff'
        });

        this.setupEventListeners();
        await this.loadBlueprints();
    }

    setupEventListeners() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.currentTarget.dataset.tool);
            });
        });

        // Upload zone
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('blueprintFile');

        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.uploadBlueprint(file);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.uploadBlueprint(e.target.files[0]);
        });

        // Canvas events
        this.canvas.on('mouse:down', (e) => this.handleCanvasClick(e));
        this.canvas.on('mouse:move', (e) => this.handleCanvasMove(e));
        this.canvas.on('mouse:up', (e) => this.handleCanvasUp(e));
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');

        // Update cursor
        if (tool === 'camera') {
            this.canvas.defaultCursor = 'crosshair';
        } else if (tool === 'area') {
            this.canvas.defaultCursor = 'crosshair';
        } else {
            this.canvas.defaultCursor = 'default';
        }
    }

    async uploadBlueprint(file) {
        const formData = new FormData();
        formData.append('blueprint', file);

        try {
            const response = await fetch('/api/blueprints/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                this.loadBlueprintImage(data.imageUrl);
                this.showToast('Blueprint uploaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Failed to upload blueprint', 'error');
        }
    }

    loadBlueprintImage(imageUrl) {
        fabric.Image.fromURL(imageUrl, (img) => {
            // Scale image to fit canvas
            const scale = Math.min(
                this.canvas.width / img.width,
                this.canvas.height / img.height
            );

            img.scale(scale);
            img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false
            });

            this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
        });
    }

    handleCanvasClick(e) {
        if (!e.pointer) return;

        const pointer = this.canvas.getPointer(e.e);

        if (this.currentTool === 'camera') {
            this.addCamera(pointer.x, pointer.y);
        } else if (this.currentTool === 'area') {
            this.startDrawingArea(pointer.x, pointer.y);
        }
    }

    handleCanvasMove(e) {
        if (this.currentTool === 'area' && this.drawingArea) {
            const pointer = this.canvas.getPointer(e.e);
            this.updateDrawingArea(pointer.x, pointer.y);
        }
    }

    handleCanvasUp(e) {
        if (this.currentTool === 'area' && this.drawingArea) {
            this.finishDrawingArea();
        }
    }

    async addCamera(x, y) {
        // Create camera icon
        const circle = new fabric.Circle({
            left: x - 20,
            top: y - 20,
            radius: 20,
            fill: '#667eea',
            stroke: '#ffffff',
            strokeWidth: 3,
            shadow: '0 4px 12px rgba(0,0,0,0.3)'
        });

        const icon = new fabric.Text('\uf03d', {
            left: x - 10,
            top: y - 12,
            fontSize: 20,
            fill: '#ffffff',
            fontFamily: 'FontAwesome'
        });

        const group = new fabric.Group([circle, icon], {
            left: x - 20,
            top: y - 20,
            selectable: true,
            hasControls: false,
            hasBorders: true,
            cameraData: {
                position: { x, y },
                id: null
            }
        });

        this.canvas.add(group);
        this.canvas.renderAll();

        // Save to backend
        try {
            const response = await fetch('/api/cameras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blueprintId: this.currentBlueprint?._id,
                    position: { x, y },
                    viewAngle: 90,
                    viewDirection: 0
                })
            });

            const data = await response.json();
            if (data.success) {
                group.cameraData.id = data.camera._id;

                // Add label
                const label = new fabric.Text(data.camera.cameraId, {
                    left: x - 15,
                    top: y + 25,
                    fontSize: 12,
                    fill: '#1f2937',
                    backgroundColor: '#ffffff',
                    padding: 4,
                    fontWeight: 'bold'
                });
                this.canvas.add(label);
                this.canvas.renderAll();

                this.cameras.push(data.camera);
                this.updateCameraList();
                this.showToast(`Camera ${data.camera.cameraId} added!`, 'success');
            }
        } catch (error) {
            console.error('Add camera error:', error);
            this.showToast('Failed to add camera', 'error');
        }
    }

    startDrawingArea(x, y) {
        this.drawingArea = new fabric.Rect({
            left: x,
            top: y,
            width: 0,
            height: 0,
            fill: 'rgba(102, 126, 234, 0.3)',
            stroke: '#667eea',
            strokeWidth: 2,
            selectable: false
        });
        this.canvas.add(this.drawingArea);
    }

    updateDrawingArea(x, y) {
        if (!this.drawingArea) return;

        const startX = this.drawingArea.left;
        const startY = this.drawingArea.top;

        this.drawingArea.set({
            width: Math.abs(x - startX),
            height: Math.abs(y - startY),
            left: Math.min(startX, x),
            top: Math.min(startY, y)
        });

        this.canvas.renderAll();
    }

    finishDrawingArea() {
        if (!this.drawingArea) return;

        // Show area naming modal
        this.showAreaModal(this.drawingArea);
        this.drawingArea = null;
    }

    showAreaModal(rect) {
        const modal = document.getElementById('areaModal');
        const form = document.getElementById('areaForm');

        modal.classList.add('active');

        form.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('areaName').value;
            const type = document.getElementById('areaType').value;

            // Save area
            const coordinates = [
                { x: rect.left, y: rect.top },
                { x: rect.left + rect.width, y: rect.top },
                { x: rect.left + rect.width, y: rect.top + rect.height },
                { x: rect.left, y: rect.top + rect.height }
            ];

            this.areas.push({ name, type, coordinates, rect });
            this.updateAreaList();

            // Add label
            const label = new fabric.Text(name, {
                left: rect.left + 10,
                top: rect.top + 10,
                fontSize: 14,
                fill: '#1f2937',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255,255,255,0.8)',
                padding: 4
            });
            this.canvas.add(label);
            this.canvas.renderAll();

            modal.classList.remove('active');
            form.reset();
            this.showToast(`Area "${name}" created!`, 'success');
        };
    }

    updateCameraList() {
        const list = document.getElementById('cameraList');
        list.innerHTML = this.cameras.map(camera => `
      <li class="camera-item">
        <div>
          <strong>${camera.cameraId}</strong>
          <small>Zone: ${camera.zone} | Status: ${camera.status}</small>
        </div>
        <div class="item-actions">
          <button class="item-action-btn edit" onclick="blueprintEditor.editCamera('${camera._id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="item-action-btn delete" onclick="blueprintEditor.deleteCamera('${camera._id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
    `).join('');
    }

    updateAreaList() {
        const list = document.getElementById('areaList');
        list.innerHTML = this.areas.map((area, index) => `
      <li class="area-item">
        <div>
          <strong>${area.name}</strong>
          <small>${area.type}</small>
        </div>
        <div class="item-actions">
          <button class="item-action-btn delete" onclick="blueprintEditor.deleteArea(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </li>
    `).join('');
    }

    async deleteCamera(cameraId) {
        if (!confirm('Delete this camera?')) return;

        try {
            await fetch(`/api/cameras/${cameraId}`, { method: 'DELETE' });
            this.cameras = this.cameras.filter(c => c._id !== cameraId);
            this.updateCameraList();
            this.showToast('Camera deleted', 'success');

            // Remove from canvas
            this.canvas.getObjects().forEach(obj => {
                if (obj.cameraData?.id === cameraId) {
                    this.canvas.remove(obj);
                }
            });
            this.canvas.renderAll();
        } catch (error) {
            this.showToast('Failed to delete camera', 'error');
        }
    }

    deleteArea(index) {
        if (!confirm('Delete this area?')) return;

        const area = this.areas[index];
        this.canvas.remove(area.rect);
        this.areas.splice(index, 1);
        this.updateAreaList();
        this.canvas.renderAll();
        this.showToast('Area deleted', 'success');
    }

    async saveBlueprint() {
        const name = prompt('Enter blueprint name:');
        if (!name) return;

        try {
            const response = await fetch('/api/blueprints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    dimensions: { width: this.canvas.width, height: this.canvas.height },
                    areas: this.areas.map(a => ({
                        name: a.name,
                        type: a.type,
                        coordinates: a.coordinates
                    }))
                })
            });

            const data = await response.json();
            if (data.success) {
                this.currentBlueprint = data.blueprint;
                this.showToast('Blueprint saved successfully!', 'success');
            }
        } catch (error) {
            this.showToast('Failed to save blueprint', 'error');
        }
    }

    async loadBlueprints() {
        try {
            const response = await fetch('/api/blueprints');
            const data = await response.json();

            if (data.success && data.blueprints.length > 0) {
                // Populate blueprint selector
                const selector = document.getElementById('blueprintSelector');
                if (selector) {
                    selector.innerHTML = '<option value="">Select a blueprint...</option>' +
                        data.blueprints.map(bp => `<option value="${bp._id}">${bp.name}</option>`).join('');
                }
            }
        } catch (error) {
            console.error('Load blueprints error:', error);
        }
    }

    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
let blueprintEditor;
document.addEventListener('DOMContentLoaded', () => {
    blueprintEditor = new BlueprintEditor();
});
