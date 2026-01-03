
import os

file_path = r"d:/OMKAR/VITP/SEM 3/EDI/Integrate/LM ARENA/public/js/manager.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """async function loadViolations() {
  try {
    const response = await fetch('/api/manager/violations');"""

replacement = """async function loadViolations() {
  try {
    const showResolved = document.getElementById('showResolvedToggle')?.checked || false;
    const response = await fetch(`/api/manager/violations?showAll=${showResolved}`);"""

if target in content:
    new_content = content.replace(target, replacement)
    
    # Also add highlighting logic
    highlight_logic = """    const tbody = document.getElementById('violationsTableBody');
    if (data.violations.length === 0) {"""
    
    highlight_replacement = """    const tbody = document.getElementById('violationsTableBody');
    
    // Check for highlight param
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');
    
    if (data.violations.length === 0) {"""
    
    if highlight_logic in new_content:
        new_content = new_content.replace(highlight_logic, highlight_replacement)
        
        # Add highlighting style to row
        row_logic = """return `
      <tr>
        <td>${formatDate(violation.createdAt)}</td>"""
        
        row_replacement = """const isHighlighted = highlightId && violation._id === highlightId;
      const rowStyle = isHighlighted ? 'style="background-color: #fff3cd; border: 2px solid #ffc107;"' : '';
      
      if (isHighlighted) {
        // Scroll to highlighted row after render
        setTimeout(() => {
          const row = document.getElementById(`violation-${violation._id}`);
          if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }

      return `
      <tr id="violation-${violation._id}" ${rowStyle}>
        <td>${formatDate(violation.createdAt)}</td>"""
        
        if row_logic in new_content:
            new_content = new_content.replace(row_logic, row_replacement)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully updated manager.js")
        else:
            print("Row logic not found")
    else:
        print("Highlight logic not found")
else:
    print("Target content not found")
