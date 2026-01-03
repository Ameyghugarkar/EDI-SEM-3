import matplotlib.pyplot as plt
import matplotlib.patches as patches

def create_blueprint():
    # 1. Setup the Plot (The Blueprint Canvas)
    fig, ax = plt.subplots(figsize=(12, 10))
    ax.set_facecolor('#f0f4f8') # Light schematic background
    
    # Set limits for the site (0-100 scale for easy percentages)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    
    # Add a subtle grid for coordinate reference
    ax.grid(which='major', color='#bdc3c7', linestyle='--', linewidth=0.5)
    
    # 2. Draw Site Boundaries (The Fence)
    site_boundary = patches.Rectangle((2, 2), 96, 96, linewidth=3, edgecolor='#2c3e50', facecolor='none', label='Site Fence')
    ax.add_patch(site_boundary)
    plt.text(50, 1, "MAIN GATE ENTRY", ha='center', fontsize=10, fontweight='bold', color='#2c3e50')

    # 3. Draw Structures
    # Main Building Structure (Under Construction)
    main_building = patches.Rectangle((25, 25), 50, 50, linewidth=2, edgecolor='#2980b9', facecolor='#ecf0f1', alpha=0.8, label='Main Building')
    ax.add_patch(main_building)
    plt.text(50, 50, "BUILDING ZONE\n(High Activity)", ha='center', va='center', fontsize=12, fontweight='bold', color='#2980b9')

    # Material Storage Area
    materials = patches.Rectangle((5, 65), 15, 25, linewidth=2, edgecolor='#e67e22', facecolor='#fdebd0', label='Material Storage')
    ax.add_patch(materials)
    plt.text(12.5, 77.5, "MAT.\nSTORAGE", ha='center', va='center', fontsize=9, color='#d35400')

    # Site Office / Trailer
    office = patches.Rectangle((5, 5), 15, 15, linewidth=2, edgecolor='#27ae60', facecolor='#e8f8f5', label='Site Office')
    ax.add_patch(office)
    plt.text(12.5, 12.5, "SITE\nOFFICE", ha='center', va='center', fontsize=9, color='#27ae60')

    # Heavy Machinery / Crane Zone
    crane_zone = patches.Circle((80, 70), 8, linewidth=2, edgecolor='#8e44ad', facecolor='none', linestyle='--')
    ax.add_patch(crane_zone)
    plt.text(80, 70, "CRANE\nRADIUS", ha='center', va='center', fontsize=8, color='#8e44ad')

    # 4. Define Camera Function
    def add_camera(x, y, cam_id, angle_start, angle_end):
        # Camera Icon (Circle)
        cam = patches.Circle((x, y), 1.5, color='black', zorder=10)
        ax.add_patch(cam)
        
        # Camera ID Label
        label_offset_y = 3 if y < 90 else -3
        plt.text(x, y + label_offset_y, cam_id, ha='center', va='center', fontsize=10, fontweight='bold', color='red', zorder=10,  bbox=dict(facecolor='white', edgecolor='red', boxstyle='round,pad=0.2'))
        
        # Field of View (Wedge) - Visualizing what the camera sees
        fov = patches.Wedge((x, y), 15, angle_start, angle_end, color='red', alpha=0.1)
        ax.add_patch(fov)

    # 5. Place Cameras (Corners and Key Areas)
    # CAM-01: Top Left Corner, watching the material storage and top fence
    add_camera(2, 98, "CAM-01", 270, 360)
    
    # CAM-02: Top Right Corner, watching crane and back of building
    add_camera(98, 98, "CAM-02", 180, 270)
    
    # CAM-03: Bottom Right Corner, watching side alley
    add_camera(98, 2, "CAM-03", 90, 180)
    
    # CAM-04: Bottom Left Corner, watching Office and Entry
    add_camera(2, 2, "CAM-04", 0, 90)

    # CAM-05: Center Building (Indoor/Top Down view)
    add_camera(50, 75, "CAM-05", 180, 360)

    # 6. Final Formatting
    plt.title("Construction Site Monitoring - Blueprint Layout", fontsize=16, pad=20)
    plt.xlabel("Site Width (meters)", fontsize=10)
    plt.ylabel("Site Length (meters)", fontsize=10)
    
    # Hide default ticks to make it look more like a schematic
    ax.set_xticks(range(0, 101, 10))
    ax.set_yticks(range(0, 101, 10))
    
    # Save or Show
    plt.tight_layout()
    plt.savefig('construction_site_blueprint.png', dpi=100)
    print("Blueprint generated as 'construction_site_blueprint.png'")
    plt.show()

if __name__ == "__main__":
    create_blueprint()