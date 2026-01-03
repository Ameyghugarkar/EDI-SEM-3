
import os

file_path = r"d:/OMKAR/VITP/SEM 3/EDI/Integrate/LM ARENA/routes/manager.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """// Get all violations (for manager)
router.get('/violations', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const violations = await Violation.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ violations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});"""

replacement = """// Get all violations (for manager)
router.get('/violations', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    // Check if user wants to see all violations or just unresolved ones
    const showAll = req.query.showAll === 'true';
    
    // Build query filter
    const filter = showAll 
      ? {} // Show all violations
      : { status: { $in: ['pending', 'acknowledged'] } }; // Only unresolved violations
    
    const violations = await Violation.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ 
      violations,
      filter: showAll ? 'all' : 'unresolved',
      count: violations.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced content")
else:
    print("Target content not found")
    # Debug: print first 50 chars of target and what might match in content
    print("Target start:", target[:50])
