module.exports = {
  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Please log in to view this resource' });
  },
  
  ensureRole: function(...roles) {
    return (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Please log in' });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      next();
    };
  }
};